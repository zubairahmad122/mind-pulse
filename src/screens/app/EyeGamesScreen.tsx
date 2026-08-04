import { Gamepad2, Play, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EYE_GAMES, ROUTES, type EyeActivity } from '@/constants';
import { colors } from '@/constants/colors';
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

function GameCard({
  item,
  pb,
  pbDate,
  onPress,
}: {
  item: EyeActivity;
  pb: string | null;
  pbDate: string | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.gameCard}>
        <LinearGradient
          colors={[EYE_COLOR + '0E', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.gameRow}>
          <View style={styles.gameIconWrap}>
            <Text style={styles.gameEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.gameSub} numberOfLines={1}>{item.subtitle}</Text>
            {pb && (
              <Text style={styles.gamePb}>
                <Text style={styles.gamePbLabel}>PB </Text>
                {pb}
                {pbDate ? ` · ${pbDate}` : ''}
              </Text>
            )}
          </View>
          <View style={styles.playPill}>
            <Play size={11} color={EYE_COLOR} fill={EYE_COLOR} />
            <Text style={styles.playPillText}>Play</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function EyeGamesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const gameProgress = useEyeGameProgress(user?.uid);
  const focus = useGameRecord(user?.uid, 'focus-sprint');

  const open = (id: string) => router.push(ROUTES.appEyeGame(id) as never);

  return (
    <ScreenShell pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader title="Eye Games" subtitle="Visual training, playfully" showBack />

        {/* ── Level + XP hero ─────────────────────────────────────── */}
        <GlassCard style={styles.levelCard} tint={SURFACE_TINT.card}>
          <View style={styles.levelTop}>
            <View style={styles.levelIcon}>
              <Trophy size={20} color={PRO_GOLD} strokeWidth={2.2} />
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>
                {gameProgress.loading
                  ? 'Loading game progress…'
                  : `${gameProgress.badge} · Level ${gameProgress.level} — ${gameProgress.title}`}
              </Text>
              {!gameProgress.loading && (
                <Text style={styles.levelXp}>{gameProgress.xpIntoLevel}/100 XP</Text>
              )}
            </View>
          </View>
          <ProgressBar
            progress={gameProgress.loading ? 0 : gameProgress.progress}
            fill={PRO_GOLD}
            style={styles.levelBar}
          />
          <Text style={styles.levelSub}>
            {gameProgress.loading
              ? ' '
              : gameProgress.roundsCompleted === 0
                ? 'Play a round to start earning XP.'
                : gameProgress.nextMilestone
                  ? `${gameProgress.roundsCompleted} round${gameProgress.roundsCompleted === 1 ? '' : 's'} · Next: ${gameProgress.nextMilestone.badge} ${gameProgress.nextMilestone.cosmetic} at level ${gameProgress.nextMilestone.level}`
                  : `${gameProgress.roundsCompleted} rounds · ${gameProgress.cosmetic} unlocked`}
          </Text>
        </GlassCard>

        {/* ── Games ────────────────────────────────────────────────── */}
        <SectionLabel first>GAMES</SectionLabel>
        {EYE_GAMES.map(item => (
          <GameCard
            key={item.id}
            item={item}
            pb={formatPb(focus.record?.value)}
            pbDate={formatDate(focus.record?.updatedAt)}
            onPress={() => open(item.id)}
          />
        ))}

        {/* ── Game history — personal bests ───────────────────────── */}
        <SectionLabel>GAME HISTORY</SectionLabel>
        <GlassCard simple noPadding tint={SURFACE_TINT.card}>
          {focus.record ? (
            EYE_GAMES.map((item, index) => (
              <View
                key={item.id}
                style={[styles.historyRow, index > 0 && styles.historyRowDivider]}
              >
                <Text style={styles.historyEmoji}>{item.emoji}</Text>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyDate}>
                    Last played {formatDate(focus.record?.updatedAt) ?? 'recently'}
                  </Text>
                </View>
                <Text style={styles.historyPb}>
                  {formatPb(focus.record?.value) ?? '—'}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.historyEmpty}>
              <Gamepad2 size={22} color="rgba(255,255,255,0.35)" strokeWidth={1.8} />
              <Text style={styles.historyEmptyText}>
                No games played yet — play one to set your first personal best.
              </Text>
            </View>
          )}
        </GlassCard>
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  levelCard: {
    marginBottom: spacing.lg,
    padding: 16,
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRO_GOLD + '14',
    borderWidth: 1,
    borderColor: PRO_GOLD + '35',
  },
  levelInfo: { flex: 1, gap: 2 },
  levelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  levelXp: {
    fontSize: 11.5,
    fontWeight: '800',
    color: PRO_GOLD,
  },
  levelBar: { marginTop: 12 },
  levelSub: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: colors.text.tertiary,
  },

  gameCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    borderColor: EYE_COLOR + '22',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingLeft: 14,
    paddingRight: 16,
    minHeight: 74,
  },
  gameIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EYE_COLOR + '14',
    borderWidth: 1,
    borderColor: EYE_COLOR + '26',
    flexShrink: 0,
  },
  gameEmoji: { fontSize: 22 },
  gameInfo: { flex: 1, gap: 3, minWidth: 0 },
  gameTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f6f8fc',
  },
  gameSub: {
    fontSize: 12,
    color: 'rgba(245,247,251,0.5)',
  },
  gamePb: {
    fontSize: 11,
    fontWeight: '700',
    color: PRO_GOLD,
  },
  gamePbLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    backgroundColor: EYE_COLOR + '14',
    borderColor: EYE_COLOR + '40',
  },
  playPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: EYE_COLOR,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  historyRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  historyEmoji: { fontSize: 20, width: 30, textAlign: 'center' },
  historyInfo: { flex: 1, gap: 2 },
  historyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text.primary,
  },
  historyDate: {
    fontSize: 10.5,
    color: colors.text.tertiary,
  },
  historyPb: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '700',
    color: PRO_GOLD,
  },
  historyEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  historyEmptyText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: colors.text.tertiary,
  },
});
