import { Play } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroCard } from '@/components/ui/HeroCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EYE_GAMES, type EyeActivity } from '@/constants';
import { colors } from '@/constants/colors';
import { formatActivityDuration } from '@/constants/eyeRelax';
import {
  FONTS,
  PILLAR_COLORS,
  PRO_GOLD,
  RADIUS,
  SURFACE_TINT,
} from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/context/AuthContext';
import { useEyeGameProgress } from '@/hooks/useEyeGameProgress';
import { useGameRecord } from '@/hooks/useGameRecord';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const EYE_COLOR = PILLAR_COLORS.eye;

/** Per-game accent + a short, card-only blurb (shorter than the shared library subtitle). */
const CARD_ACCENT: Record<string, { primary: string; secondary: string; blurb: string; isNew?: boolean }> = {
  'focus-sprint': { primary: EYE_COLOR, secondary: '#48A8FF', blurb: 'Near ↔ far focus challenge' },
  'schulte-nexus': { primary: EYE_COLOR, secondary: PILLAR_COLORS.mind, blurb: 'Changing number-search missions', isNew: true },
};

const MINI_GRID = [[4, 2, 7], [1, 9, 5], [6, 3, 8]];

/** Focus Switch's tile — near/far dots with a focus line between them, not just an icon. */
function FocusVisual() {
  return (
    <View style={styles.focusVisual}>
      <View style={styles.focusFar} />
      <View style={styles.focusLine} />
      <View style={styles.focusNear} />
    </View>
  );
}

/** Schulte Nexus's tile — a miniature version of the actual number grid. */
function SchulteVisual() {
  return (
    <View style={styles.schulteVisual}>
      {MINI_GRID.map((row, i) => (
        <View key={i} style={styles.schulteRow}>
          {row.map(n => (
            <View key={n} style={styles.schulteCell}>
              <Text style={styles.schulteCellText}>{n}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const GAME_VISUALS = {
  'focus-sprint': FocusVisual,
  'schulte-nexus': SchulteVisual,
} as const;

/** Personal-best label — matches the units the game itself uses. */
function formatPb(value: number | undefined): string | null {
  if (value == null) return null;
  return `${value.toLocaleString()} pts`;
}

function formatDate(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Compact player progress strip */
function PlayerProgress({
  loading,
  level,
  title,
  badge,
  xpIntoLevel,
  progress,
  nextMilestone,
}: {
  loading: boolean;
  level: number;
  title: string;
  badge: string;
  xpIntoLevel: number;
  progress: number;
  nextMilestone: { level: number; badge: string; cosmetic: string } | null;
}) {
  return (
    <HeroCard style={styles.progressStrip}>
      <View style={styles.progressInner}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressLevel} numberOfLines={1}>
            {loading ? 'Loading…' : `Level ${level} · ${title}`}
          </Text>
          <Text style={styles.progressXp}>
            {loading ? '–' : `${xpIntoLevel}/100 XP`}
          </Text>
        </View>
        <ProgressBar
          progress={loading ? 0 : progress}
          fill={EYE_COLOR}
          style={styles.progressBar}
        />
        {!loading && nextMilestone && (
          <Text style={styles.progressNext}>
            Next: <Text style={styles.progressNextAccent}>{nextMilestone.badge} {nextMilestone.cosmetic}</Text> at Level {nextMilestone.level}
          </Text>
        )}
      </View>
    </HeroCard>
  );
}

/** Improved game card with proper 3-row layout */
function GameCard({
  item,
  pb,
  onPress,
}: {
  item: EyeActivity;
  pb: string | null;
  onPress: () => void;
}) {
  const accent = CARD_ACCENT[item.id] ?? { primary: EYE_COLOR, secondary: EYE_COLOR, blurb: item.subtitle };
  const Visual = GAME_VISUALS[item.id as keyof typeof GAME_VISUALS];
  const duration = item.durationLabel ?? formatActivityDuration(item.durationSeconds);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.gameCardWrap}>
      <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.gameCard}>
        <LinearGradient
          colors={[accent.primary + '16', accent.secondary + '10', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.gameRow}>
          <View style={[styles.gameVisualWrap, { borderColor: accent.primary + '2E' }]}>
            <LinearGradient
              colors={[accent.primary + '20', accent.secondary + '20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {Visual && <Visual />}
          </View>
          <View style={styles.gameInfo}>
            {accent.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW CHALLENGE</Text>
              </View>
            )}
            {/* Row 1: Title + Play button */}
            <View style={styles.gameTitleRow}>
              <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
              <TouchableOpacity style={styles.playBtn} onPress={onPress} activeOpacity={0.8}>
                <Play size={12} color="#03212C" fill="#03212C" />
                <Text style={styles.playBtnText}>Play</Text>
              </TouchableOpacity>
            </View>
            {/* Row 2: Short description */}
            <Text style={styles.gameSub} numberOfLines={1}>{accent.blurb}</Text>
            {/* Row 3: Metadata + personal best */}
            <View style={styles.gameBottomRow}>
              <Text style={styles.gameMeta}>
                {duration} · {item.isPremium ? 'Pro' : 'Free'}
              </Text>
              {pb && <Text style={styles.gamePb}>Best: {pb}</Text>}
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

/** Compact recent activity card */
function RecentActivity({
  item,
  pb,
  pbDate,
  isPb,
}: {
  item: EyeActivity;
  pb: string | null;
  pbDate: string | null;
  isPb: boolean;
}) {
  return (
    <View style={styles.historyRow}>
      <Text style={styles.historyEmoji}>{item.emoji}</Text>
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDate}>
          Last played {pbDate ?? 'recently'}
        </Text>
      </View>
      <View style={styles.historyScore}>
        <Text style={styles.historyPb}>{pb ?? '—'}</Text>
        {isPb && pb && <Text style={styles.historyPbLabel}>PB</Text>}
      </View>
    </View>
  );
}

export default function EyeGamesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const gameProgress = useEyeGameProgress(user?.uid);
  const focus = useGameRecord(user?.uid, 'focus-sprint');
  const recordsByGameId: Record<string, typeof focus> = {
    'focus-sprint': focus,
  };
  const anyRecordExists = Boolean(focus.record);

  const open = (route: string) => router.push(route as never);

  return (
    <ScreenShell pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader
          title="Eye Games"
          subtitle="Short focus and memory challenges"
          showBack
        />

        {/* ── Compact Player Progress ── */}
        <PlayerProgress
          loading={gameProgress.loading}
          level={gameProgress.level}
          title={gameProgress.title}
          badge={gameProgress.badge}
          xpIntoLevel={gameProgress.xpIntoLevel}
          progress={gameProgress.progress}
          nextMilestone={gameProgress.nextMilestone}
        />

        {/* ── Your Games ── */}
        <SectionLabel>YOUR GAMES</SectionLabel>
        {EYE_GAMES.map(item => (
          <GameCard
            key={item.id}
            item={item}
            pb={formatPb(recordsByGameId[item.id]?.record?.value)}
            onPress={() => open(item.route)}
          />
        ))}

        {/* ── Recent Activity ── */}
        <SectionLabel>RECENT ACTIVITY</SectionLabel>
        <GlassCard simple noPadding tint={SURFACE_TINT.card}>
          {anyRecordExists ? (
            EYE_GAMES.filter(item => recordsByGameId[item.id]?.record).map((item, index) => {
              const record = recordsByGameId[item.id]?.record;
              const isPb = record?.value === focus.record?.value;
              return (
                <View
                  key={item.id}
                  style={[styles.historyContainer, index > 0 && styles.historyRowDivider]}
                >
                  <RecentActivity
                    item={item}
                    pb={formatPb(record?.value)}
                    pbDate={formatDate(record?.updatedAt)}
                    isPb={isPb}
                  />
                </View>
              );
            })
          ) : (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyTitle}>No games played yet.</Text>
              <Text style={styles.historyEmptyText}>
                Complete a game to set your first personal best.
              </Text>
            </View>
          )}
        </GlassCard>
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* Compact progress strip — deliberately understated so the games win first glance */
  progressStrip: {
    marginBottom: spacing.md,
    opacity: 0.88,
  },
  progressInner: {
    padding: 14,
    gap: 8,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLevel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f6f8fc',
  },
  progressXp: {
    fontFamily: FONTS.headingSemi,
    fontSize: 11.5,
    fontWeight: '700',
    color: EYE_COLOR,
  },
  progressBar: {
    marginTop: 0,
  },
  progressNext: {
    fontSize: 10.5,
    color: 'rgba(245,247,251,0.6)',
  },
  progressNextAccent: {
    color: PRO_GOLD,
    fontWeight: '700',
  },

  /* Game card */
  gameCardWrap: {
    marginBottom: 8,
  },
  gameCard: {
    borderWidth: 1,
    borderRadius: RADIUS.card,
    borderColor: EYE_COLOR + '22',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    minHeight: 72,
  },
  gameVisualWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  gameInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameTitle: {
    flex: 1,
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#f6f8fc',
  },
  newBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 2,
    backgroundColor: PILLAR_COLORS.mind + '22',
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: PILLAR_COLORS.mind,
  },
  gameBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gameMeta: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  gameSub: {
    fontSize: 12,
    color: 'rgba(245,247,251,0.55)',
  },
  gamePb: {
    fontSize: 11,
    fontWeight: '700',
    color: PRO_GOLD,
  },

  /* Mini game-tile visuals */
  focusVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  focusFar: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: EYE_COLOR + '55',
  },
  focusLine: {
    width: 14,
    height: 1.5,
    backgroundColor: EYE_COLOR + '55',
  },
  focusNear: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: EYE_COLOR,
    shadowColor: EYE_COLOR,
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  schulteVisual: {
    gap: 2,
  },
  schulteRow: {
    flexDirection: 'row',
    gap: 2,
  },
  schulteCell: {
    width: 16,
    height: 16,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  schulteCellText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.85)',
  },

  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_COLOR,
  },
  playBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03212C',
  },

  /* History */
  historyContainer: {
    // Container for divider logic
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  historyEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  historyInfo: { flex: 1, gap: 2 },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  historyDate: {
    fontSize: 10.5,
    color: colors.text.tertiary,
  },
  historyScore: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyPb: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: PRO_GOLD,
  },
  historyPbLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: PRO_GOLD,
    opacity: 0.7,
  },
  historyEmpty: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  historyEmptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  historyEmptyText: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    color: colors.text.tertiary,
  },


});
