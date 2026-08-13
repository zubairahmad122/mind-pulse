import type { ReactNode } from 'react';
import { Grid3X3, Hash, Play } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { HeroCard } from '@/components/ui/HeroCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EYE_GAMES, ROUTES } from '@/constants';
import { formatActivityDuration } from '@/constants/eyeRelax';
import {
  FONTS,
  RADIUS,
  SPACING,
  SURFACE_TINT,
  TYPOGRAPHY,
} from '@/constants/designSystem';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

/** Games shown in the Mind hub — Focus Switch stays under Eye, not here. */
const MIND_GAMES = EYE_GAMES.filter(item => item.id !== 'focus-sprint');
/** Today's featured pick — deterministic, not an adaptive recommendation engine. */
const FEATURED_GAME = MIND_GAMES.find(item => item.id === 'schulte-nexus') ?? MIND_GAMES[0];

const SCHULTE_ACCENT = '#48A8FF';
const MILLS_ACCENT = '#37D5D0';

const MINI_GRID = [[4, 2, 7], [1, 9, 5], [6, 3, 8]];

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

/** Mills' tile — two pieces on a board corner, its own teal + coral identity. */
function MillsVisual() {
  return (
    <View style={styles.millsVisual}>
      <Grid3X3 size={26} color={MILLS_ACCENT} strokeWidth={1.6} />
      <View style={[styles.millsPiece, styles.millsPieceOne]} />
      <View style={[styles.millsPiece, styles.millsPieceTwo]} />
    </View>
  );
}

/** Small circular play control — deliberately not a wide pill. */
function PlayButton({ accent, onPress }: { accent: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Play"
      style={[styles.playButton, { backgroundColor: accent }]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={8}
    >
      <Play size={14} color="#03212C" fill="#03212C" />
    </TouchableOpacity>
  );
}

/** One canonical row for both games — icon, eyebrow category, title, description, meta, trailing play control. */
function GameRow({
  visual,
  accent,
  category,
  title,
  description,
  meta,
  onPress,
  accessibilityLabel,
}: {
  visual: ReactNode;
  accent: string;
  category: string;
  title: string;
  description: string;
  meta: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.gameCardWrap}
    >
      <GlassCard simple noPadding tint={SURFACE_TINT.card} style={[styles.gameCard, { borderColor: accent + '2A' }]}>
        <View style={styles.gameRow}>
          <View style={[styles.gameVisualWrap, { backgroundColor: accent + '14', borderColor: accent + '30' }]}>
            {visual}
          </View>
          <View style={styles.gameInfo}>
            <Text style={[styles.gameCategory, { color: accent }]}>{category}</Text>
            <Text style={styles.gameTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.gameDescription} numberOfLines={1}>{description}</Text>
            <Text style={styles.gameMeta} numberOfLines={1}>{meta}</Text>
          </View>
          <PlayButton accent={accent} onPress={onPress} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

/** The Mind hero — today's featured pick, matching Home's "Today's Journey" / Eye's "Today's Eye Care" hero style. */
function MindHero({ onPress }: { onPress: () => void }) {
  const duration = FEATURED_GAME.durationLabel ?? formatActivityDuration(FEATURED_GAME.durationSeconds);

  return (
    <HeroCard style={styles.heroCard}>
      <View style={styles.heroInner}>
        <Text style={styles.heroLabel}>TODAY&apos;S MIND PICK</Text>

        <View style={styles.heroTitleRow}>
          <View style={styles.heroIcon}>
            <Hash size={17} color={SCHULTE_ACCENT} strokeWidth={2} />
          </View>
          <Text style={styles.heroTitleText} numberOfLines={1}>{FEATURED_GAME.title}</Text>
        </View>

        <Text style={styles.heroMessage} numberOfLines={2}>Changing number-search missions</Text>
        <Text style={styles.heroMeta}>{duration} · Number Search</Text>

        <View style={styles.heroCtaWrap}>
          <GradientCTA
            label="Play Challenge"
            icon={<Play size={16} color="#03212C" fill="#03212C" />}
            textColor="#03212C"
            onPress={onPress}
          />
        </View>
      </View>
    </HeroCard>
  );
}

export default function MindScreen() {
  const router = useRouter();
  const open = (route: string) => router.push(route as never);

  return (
    <ScreenShell pillar="mind" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader
          title="Mind"
          subtitle="Train attention, strategy, memory, and quick decisions"
          subtitleLines={2}
        />

        {/* ── Today's Mind Pick — the hero, matching Home/Eye ── */}
        <MindHero onPress={() => open(FEATURED_GAME.route)} />

        {/* ── Your Games ── */}
        <SectionLabel>YOUR GAMES</SectionLabel>
        <GameRow
          visual={<SchulteVisual />}
          accent={SCHULTE_ACCENT}
          category="NUMBER SEARCH"
          title="Schulte Nexus"
          description="Changing number-search missions"
          meta={`${FEATURED_GAME.durationLabel ?? formatActivityDuration(FEATURED_GAME.durationSeconds)} · Free`}
          onPress={() => open(FEATURED_GAME.route)}
          accessibilityLabel="Schulte Nexus, number search challenge"
        />
        <GameRow
          visual={<MillsVisual />}
          accent={MILLS_ACCENT}
          category="STRATEGY"
          title="Mills"
          description="Classic strategy and tactical play"
          meta="Local Two Player · Free"
          onPress={() => open(ROUTES.appMills)}
          accessibilityLabel="Mills, strategy board game"
        />

        {/* ── Recent Activity — compact, no fabricated data ── */}
        <SectionLabel>RECENT ACTIVITY</SectionLabel>
        <GlassCard simple noPadding tint={SURFACE_TINT.card}>
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyTitle}>No recent games yet</Text>
            <Text style={styles.historyEmptyText}>Play a game to see your activity here.</Text>
          </View>
        </GlassCard>
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* ── Hero ── */
  heroCard: {
    marginBottom: SPACING.section,
  },
  heroInner: {
    padding: SPACING.cardPadding,
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: 'rgba(255,255,255,0.5)',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.titleGap + 2,
  },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SCHULTE_ACCENT + '40',
    backgroundColor: SCHULTE_ACCENT + '18',
    flexShrink: 0,
  },
  heroTitleText: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: colors.text.primary,
  },
  heroMessage: {
    fontSize: TYPOGRAPHY.body.fontSize,
    lineHeight: 20,
    color: colors.text.primary,
    fontWeight: TYPOGRAPHY.body.fontWeight,
    marginTop: 8,
  },
  heroMeta: {
    fontSize: TYPOGRAPHY.meta.fontSize,
    fontWeight: TYPOGRAPHY.meta.fontWeight,
    color: TYPOGRAPHY.meta.color,
    marginTop: 4,
  },
  heroCtaWrap: {
    marginTop: SPACING.titleGap + 10,
  },

  /* ── Game rows ── */
  gameCardWrap: {
    marginBottom: 10,
  },
  gameCard: {
    borderWidth: 1,
    borderRadius: RADIUS.card,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    minHeight: 84,
  },
  gameVisualWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.iconBox,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  gameInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  gameCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gameTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: TYPOGRAPHY.cardTitle.fontSize,
    fontWeight: TYPOGRAPHY.cardTitle.fontWeight,
    color: '#f6f8fc',
    marginTop: 1,
  },
  gameDescription: {
    fontSize: 12.5,
    color: 'rgba(245,247,251,0.55)',
    marginTop: 1,
  },
  gameMeta: {
    fontSize: TYPOGRAPHY.meta.fontSize,
    fontWeight: TYPOGRAPHY.meta.fontWeight,
    color: TYPOGRAPHY.meta.color,
    marginTop: 3,
  },

  /* ── Compact play control ── */
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* ── Mini game-tile visuals ── */
  schulteVisual: {
    gap: 2,
  },
  schulteRow: {
    flexDirection: 'row',
    gap: 2,
  },
  schulteCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  schulteCellText: {
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.85)',
  },
  millsVisual: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  millsPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  millsPieceOne: {
    top: 9,
    left: 10,
    backgroundColor: MILLS_ACCENT,
  },
  millsPieceTwo: {
    right: 9,
    bottom: 9,
    backgroundColor: '#F29A72',
  },

  /* ── Recent activity — compact empty state ── */
  historyEmpty: {
    gap: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  historyEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  historyEmptyText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
