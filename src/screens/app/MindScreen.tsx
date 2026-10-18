import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { HeroCard } from "@/components/ui/HeroCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MindGameCard } from "@/components/mind/MindGameCard";
import {
  MillsCardArtwork,
  MindGameArtwork,
  PatternShiftCardArtwork,
  SchulteCardArtwork,
  TimeFlowCardArtwork,
  MathGapCardArtwork,
} from "@/components/mind/MindGameArtwork";
import { useAuth } from "@/context/AuthContext";
import { EYE_GAMES, ROUTES } from "@/constants";
import { formatActivityDuration } from "@/constants/eyeRelax";
import {
  FONTS,
  PALETTE,
  SURFACE_TINT,
  TYPOGRAPHY,
} from "@/constants/designSystem";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { loadSchulteState } from "@/services/schultePersistence";
import { loadPatternShiftProgress } from "@/services/patternShiftPersistence";
import { loadTimeFlowProgress } from "@/services/timeFlowPersistence";
import { loadMathGapProgress } from "@/services/mathGapPersistence";
import { useRouter } from "expo-router";

/** Games eligible for Today's Mind Pick — Focus Switch stays under Eye. */
const PATTERN_SHIFT_GAME = {
  id: "pattern-shift",
  title: "Pattern Shift",
  durationSeconds: 180,
  durationLabel: "2–4 min",
  route: ROUTES.appPatternShift,
};
const TIME_FLOW_GAME = {
  id: "time-flow",
  title: "TimeFlow",
  durationSeconds: 150,
  durationLabel: "2–3 min",
  route: ROUTES.appTimeFlow,
};
const MATH_GAP_GAME = {id:"math-gap",title:"Math Gap",durationSeconds:75,durationLabel:"1–2 min",route:ROUTES.appMathGap};
const MIND_GAMES = [
  ...EYE_GAMES.filter((item) => item.id !== "focus-sprint"),
  PATTERN_SHIFT_GAME,
  TIME_FLOW_GAME,
  MATH_GAP_GAME,
];
/** Stable for the calendar day, with both cognitive games eligible. */
const FEATURED_GAME =
  MIND_GAMES[Math.floor(Date.now() / 86_400_000) % MIND_GAMES.length];

const SCHULTE_ACCENT = PALETTE.indigoLight;
const MILLS_ACCENT = "#37D5D0";
const PATTERN_ACCENT = "#9D7CFF";
const TIME_FLOW_ACCENT = "#4DE1C1";
const SCHULTE_ARTWORK = <SchulteCardArtwork />;
const MILLS_ARTWORK = <MillsCardArtwork />;
const PATTERN_ARTWORK = <PatternShiftCardArtwork />;
const TIME_FLOW_ARTWORK = <TimeFlowCardArtwork />;
const MATH_GAP_ARTWORK = <MathGapCardArtwork />;

const WEEK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Real Schulte progress + weekly activity — no fabricated data ── */

interface MindProgressState {
  loading: boolean;
  /** Any real level/mission advancement recorded yet. */
  hasProgress: boolean;
  currentLevel: number;
  missionInLevel: number;
  /** 0..100 */
  levelProgress: number;
  /** Monday-first, true where a completed session landed that day. */
  weekDots: boolean[];
  hasActivity: boolean;
  sessionsThisWeek: number;
  activeDaysThisWeek: number;
  schulteTier: string;
  patternLevel: number;
  timeFlowLevel: number;
  mathGapLevel: number;
}

const EMPTY_PROGRESS: MindProgressState = {
  loading: true,
  hasProgress: false,
  currentLevel: 1,
  missionInLevel: 0,
  levelProgress: 0,
  weekDots: Array(7).fill(false),
  hasActivity: false,
  sessionsThisWeek: 0,
  activeDaysThisWeek: 0,
  schulteTier: "Starter",
  patternLevel: 1,
  timeFlowLevel: 1,
  mathGapLevel: 1,
};

/** Monday-first date-key strings (`toLocaleDateString('sv')`) for the current week. */
function getWeekDateKeys(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString("sv");
  });
}

/** Monday-first column index (0=Mon..6=Sun) for today. */
function todayColumnIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/** Derives hero progress + weekly Schulte activity from real persisted state only. */
function useMindProgress(uid: string | undefined): MindProgressState {
  const [state, setState] = useState<MindProgressState>(EMPTY_PROGRESS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [persisted, pattern, timeFlow, mathGap] = await Promise.all([
        loadSchulteState(uid),
        loadPatternShiftProgress(uid),
        loadTimeFlowProgress(uid),
        loadMathGapProgress(uid),
      ]);
      if (cancelled) return;

      const { levelState, profile } = persisted;
      const hasSchulteProgress =
        levelState.currentLevel > 1 ||
        levelState.missionsCompletedAtCurrentLevel > 0 ||
        levelState.levelProgress > 0;
      const featuringPattern = FEATURED_GAME.id === "pattern-shift";
      const featuringTimeFlow = FEATURED_GAME.id === "time-flow";
      const featuringMathGap = FEATURED_GAME.id === "math-gap";
      const hasProgress = featuringTimeFlow
        ? timeFlow.completedSessions > 0
        : featuringMathGap ? mathGap.totalSessions > 0
        : featuringPattern
          ? pattern.completedSessions > 0
          : hasSchulteProgress;

      const weekKeys = getWeekDateKeys();
      const completedDayKeys = profile.recentAttempts
        .filter((a) => a.result === "completed")
        .map((a) => new Date(a.completedAt).toLocaleDateString("sv"))
        .concat(
          pattern.sessionHistory.map((session) =>
            new Date(session.completedAt).toLocaleDateString("sv"),
          ),
        )
        .concat(
          timeFlow.sessionHistory.map((session) =>
            new Date(session.completedAt).toLocaleDateString("sv"),
          ),
        ).concat(
          mathGap.sessionHistory.map(session=>new Date(session.completedAt).toLocaleDateString("sv")),
        );
      const completedSet = new Set(completedDayKeys);
      const weekDots = weekKeys.map((k) => completedSet.has(k));

      setState({
        loading: false,
        hasProgress,
        currentLevel: featuringTimeFlow
          ? timeFlow.level
          : featuringMathGap ? mathGap.level
          : featuringPattern
            ? pattern.playerLevel
            : levelState.currentLevel,
        missionInLevel: featuringTimeFlow
          ? timeFlow.completedSessions
          : featuringMathGap ? mathGap.totalSessions
          : featuringPattern
            ? pattern.completedSessions
            : levelState.missionInLevel,
        levelProgress: featuringTimeFlow
          ? (timeFlow.xp / (300 + Math.max(0, timeFlow.level - 1) * 125)) * 100
          : featuringMathGap ? (mathGap.xp/(280+Math.max(0,mathGap.level-1)*120))*100
          : featuringPattern
            ? (pattern.xp /
                (300 + Math.max(0, pattern.playerLevel - 1) * 125)) *
              100
            : levelState.levelProgress,
        weekDots,
        hasActivity: completedDayKeys.length > 0,
        sessionsThisWeek: completedDayKeys.filter((k) => weekKeys.includes(k))
          .length,
        activeDaysThisWeek: weekDots.filter(Boolean).length,
        schulteTier:
          profile.rating >= 800
            ? "Nexus"
            : profile.rating >= 650
              ? "Expert"
              : profile.rating >= 450
                ? "Advanced"
                : profile.rating >= 300
                  ? "Sharp"
                  : profile.rating >= 150
                    ? "Steady"
                    : "Starter",
        patternLevel: pattern.playerLevel,
        timeFlowLevel: timeFlow.level,
        mathGapLevel: mathGap.level,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return state;
}

/** The matching grid-card data for whichever game `FEATURED_GAME` resolves
 * to — same shape as a `games` array entry. The hero reads its category,
 * description, and accent straight from here instead of a second,
 * hand-maintained copy of the same text, so the hero and the grid card for
 * the same game can never show two different descriptions again. */
type FeaturedGameCard = {
  id: string;
  category: string;
  description: string;
  accent: string;
};

/**
 * The Mind hero — "Continue" surface when real Schulte progress exists,
 * otherwise falls back to today's featured-pick presentation. Same shape,
 * sizing and spacing as Eye's "Today's Eye Care" / Relax's hero card.
 */
function MindHero({
  onPress,
  progress,
  game,
}: {
  onPress: () => void;
  progress: MindProgressState;
  game: FeaturedGameCard;
}) {
  const duration =
    FEATURED_GAME.durationLabel ??
    formatActivityDuration(FEATURED_GAME.durationSeconds);
  const { hasProgress, currentLevel, missionInLevel, levelProgress } = progress;
  // Schulte alone tracks "Mission N" within a level; every other game just
  // shows its level — a genuine per-game difference, not duplicated copy.
  const levelLabel =
    game.id === "schulte-nexus" ? `Mission ${missionInLevel + 1}` : game.category;

  return (
    <HeroCard style={styles.heroCard}>
      <View style={styles.heroInner}>
        <Text style={styles.heroLabel}>TODAY&apos;S MIND PICK</Text>
        <View pointerEvents="none" style={styles.heroFeaturedArt}>
          <View style={[styles.heroFeaturedGlow, { backgroundColor: `${game.accent}12` }]} />
          <MindGameArtwork gameId={FEATURED_GAME.id} variant="featured" />
        </View>

        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={styles.heroTitleRow}
        >
          <Text style={styles.heroTitleText} numberOfLines={1}>
            {FEATURED_GAME.title}
          </Text>
        </TouchableOpacity>

        <Text style={styles.heroMeta}>
          {hasProgress ? `Level ${currentLevel} · ${levelLabel}` : `${duration} · ${game.category}`}
        </Text>

        <Text style={styles.heroMessage} numberOfLines={2}>
          {hasProgress ? "Pick up where you left off." : game.description}
        </Text>

        {hasProgress && (
          <ProgressBar
            progress={levelProgress / 100}
            fill={game.accent}
            style={styles.heroBar}
          />
        )}

        <View style={[styles.heroCtaWrap, !hasProgress && styles.heroCtaWrapNoProgress]}>
          <GradientCTA
            label={hasProgress ? "Continue Mission" : "Play Challenge"}
            icon={<ArrowRight size={17} color="#03212C" strokeWidth={2.5} />}
            textColor="#03212C"
            onPress={onPress}
          />
        </View>
      </View>
    </HeroCard>
  );
}

/**
 * Compact 7-day activity chart — real data only. An empty week renders every
 * bar at the same muted, minimal height (no fabricated values).
 */
function WeekChart({
  weekDots,
  empty,
}: {
  weekDots: boolean[];
  empty: boolean;
}) {
  const today = todayColumnIndex();
  return (
    <View style={styles.weekChartRow}>
      {WEEK_DAY_LABELS.map((label, i) => {
        const done = !empty && weekDots[i];
        const isToday = i === today;
        return (
          <View key={label} style={styles.weekChartCol}>
            <View style={styles.weekChartTrack}>
              <View
                style={[
                  styles.weekChartBar,
                  {
                    height: done ? "100%" : "20%",
                    backgroundColor: !done
                      ? "rgba(255,255,255,0.08)"
                      : isToday
                        ? SCHULTE_ACCENT
                        : "rgba(123,92,255,0.55)",
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.weekChartLabel,
                isToday && styles.weekChartLabelToday,
              ]}
            >
              {label[0]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Mind Progress — real weekly activity, or a compact empty state. Never a score. */
function MindProgressCard({ progress }: { progress: MindProgressState }) {
  const { hasActivity, weekDots, sessionsThisWeek, activeDaysThisWeek } =
    progress;

  return (
    <GlassCard simple noPadding tint={SURFACE_TINT.card}>
      <View style={styles.progressInner}>
        {hasActivity ? (
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressHeaderLabel}>THIS WEEK</Text>
            <Text style={styles.progressHeaderValue}>
              {sessionsThisWeek}{" "}
              {sessionsThisWeek === 1 ? "session" : "sessions"}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.progressEmptyTitle}>No games played yet</Text>
            <Text style={styles.progressEmptyText}>
              Your activity will appear after your first game.
            </Text>
          </>
        )}

        <View style={styles.weekChartWrap}>
          <WeekChart weekDots={weekDots} empty={!hasActivity} />
        </View>

        {hasActivity && (
          <View style={styles.progressMetricsRow}>
            <View style={styles.progressMetric}>
              <Text style={styles.progressMetricValue}>{sessionsThisWeek}</Text>
              <Text style={styles.progressMetricLabel}>MIND SESSIONS</Text>
            </View>
            <View style={styles.progressMetric}>
              <Text style={styles.progressMetricValue}>
                {activeDaysThisWeek}
              </Text>
              <Text style={styles.progressMetricLabel}>ACTIVE DAYS</Text>
            </View>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

export default function MindScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const progress = useMindProgress(user?.uid);
  const open = (route: string) => router.push(route as never);
  const games = [
    {
      // Matches EYE_GAMES's canonical id ('schulte-nexus') — FEATURED_GAME
      // is drawn from EYE_GAMES, so this must agree with it or the
      // `games.find(g => g.id === FEATURED_GAME.id)` lookup in the hero
      // silently returns undefined on the 1-in-4 days Schulte is featured.
      id: "schulte-nexus",
      title: "Schulte Nexus",
      category: "Number Search",
      description: "Scan numbers with speed and precision",
      metadata: `2–3 min  •  ${progress.schulteTier}`,
      accent: SCHULTE_ACCENT,
      artwork: SCHULTE_ARTWORK,
      route: ROUTES.appSchulteNexus,
      accessibilityLabel: `Schulte Nexus, Number Search, ${progress.schulteTier}, 2 to 3 minutes`,
    },
    {
      id: "mills",
      title: "Mills",
      category: "Strategy",
      description: "Plan ahead. Align. Capture.",
      metadata: "10–20 min  •  Two Player",
      accent: MILLS_ACCENT,
      artwork: MILLS_ARTWORK,
      route: ROUTES.appMills,
      accessibilityLabel: "Mills, Strategy, Two Player, 10 to 20 minutes",
    },
    {
      id: "pattern-shift",
      title: "Pattern Shift",
      category: "Visual Discrimination",
      description: "Detect subtle structural changes",
      metadata: `2–4 min  •  Level ${progress.patternLevel}`,
      accent: PATTERN_ACCENT,
      artwork: PATTERN_ARTWORK,
      route: ROUTES.appPatternShift,
      accessibilityLabel: `Pattern Shift, Visual Discrimination, Level ${progress.patternLevel}, 2 to 4 minutes`,
    },
    {
      id: "math-gap",
      title: "Math Gap",
      category: "Numerical Reasoning",
      description: "Calculate. Compare. Choose fast.",
      metadata: `1–2 min  •  Level ${progress.mathGapLevel}`,
      accent: TIME_FLOW_ACCENT,
      artwork: MATH_GAP_ARTWORK,
      route: ROUTES.appMathGap,
      accessibilityLabel: `Math Gap, Numerical Reasoning, Level ${progress.mathGapLevel}, 1 to 2 minutes`,
    },
    {
      id: "time-flow",
      title: "TimeFlow",
      category: "Working Memory",
      description: "Remember and replay the flow",
      metadata: `2–3 min  •  Level ${progress.timeFlowLevel}`,
      accent: TIME_FLOW_ACCENT,
      artwork: TIME_FLOW_ARTWORK,
      route: ROUTES.appTimeFlow,
      accessibilityLabel: `TimeFlow, Working Memory, Level ${progress.timeFlowLevel}, 2 to 3 minutes`,
    },
  ] as const;

  // The one `games` entry matching today's featured pick. Falls back to the
  // first grid entry rather than crashing if a future id ever drifts out of
  // sync between this array and MIND_GAMES/EYE_GAMES (see the 2026-10-06
  // Schulte id-mismatch bug this guarded against) — a slightly wrong hero
  // card is recoverable, a hard crash on the whole tab isn't.
  const featuredGameCard = games.find((g) => g.id === FEATURED_GAME.id) ?? games[0];

  return (
    <ScreenShell pillar="mind" ambient={<AmbientBackground subtle />} bannerAd>
      <ScreenTransition>
        <ScreenHeader
          title="Mind"
          subtitle="Train attention, strategy, memory, and quick decisions"
          subtitleLines={2}
        />

        {/* ── Today's Mind Pick / Continue — the hero, matching Home/Eye ── */}
        <MindHero
          onPress={() => open(FEATURED_GAME.route)}
          progress={progress}
          game={featuredGameCard}
        />

        {/* ── Your Games — distinct premium game cards ── */}
        <SectionLabel>YOUR GAMES</SectionLabel>
        <View style={styles.gameCards}>
          {games.map(game => (
            <MindGameCard
              key={game.id}
              title={game.title}
              category={game.category}
              description={game.description}
              metadata={game.metadata}
              accent={game.accent}
              artwork={game.artwork}
              accessibilityLabel={game.accessibilityLabel}
              onPress={() => open(game.route)}
            />
          ))}
        </View>

        {/* ── Mind Progress — real activity only, never a score ── */}
        <SectionLabel>MIND PROGRESS</SectionLabel>
        <MindProgressCard progress={progress} />
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* ── Hero — same shape/sizing as Eye's "Today's Eye Care" / Relax's hero ── */
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroInner: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: "rgba(255,255,255,0.5)",
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
    width: "68%",
  },
  heroFeaturedArt: { position: "absolute", top: 30, right: 13, width: 92, height: 92, alignItems: "center", justifyContent: "center" },
  heroFeaturedGlow: { position: "absolute", width: 86, height: 86, borderRadius: 43 },
  heroTitleText: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 19,
    color: colors.text.primary,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.tertiary,
    marginTop: 4,
    width: "68%",
  },
  heroMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
    fontWeight: "500",
    marginTop: spacing.xs,
    width: "68%",
  },
  heroBar: {
    marginTop: 8,
  },
  heroCtaWrap: {
    marginTop: spacing.sm,
  },
  /* Eye's hero always renders a progress bar before its CTA, which already
   * gives it breathing room above the button. Mind's bar only renders when
   * `hasProgress`, so the no-progress state needs its own extra margin here
   * to match — otherwise the button sits right under the description text. */
  heroCtaWrapNoProgress: {
    marginTop: spacing.md,
  },

  /* ── Game rows (shared game-library surface) ── */
  gameCards: { gap: 11, marginBottom: 4 },

  /* ── Mind Progress ── */
  progressInner: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 2,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressHeaderLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  progressHeaderValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: SCHULTE_ACCENT,
  },
  progressEmptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  progressEmptyText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  weekChartWrap: {
    marginTop: 12,
  },
  weekChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  weekChartCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekChartTrack: {
    width: "100%",
    height: 52,
    borderRadius: 5,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  weekChartBar: {
    width: "100%",
    borderRadius: 5,
  },
  weekChartLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  weekChartLabelToday: {
    color: SCHULTE_ACCENT,
    fontWeight: "800",
  },
  progressMetricsRow: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    gap: 20,
  },
  progressMetric: {
    gap: 2,
  },
  progressMetricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text.primary,
  },
  progressMetricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.text.tertiary,
    textTransform: "uppercase",
  },
});
