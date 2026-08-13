import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Pause, PersonStanding, Play, X } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/context/AuthContext';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { recordResetCompleted } from '@/services/screenBalancePersistence';

const MOVE_ACCENT = PILLAR_COLORS.challenge;
const DURATION_SECONDS = 120;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Phase = 'idle' | 'active' | 'done';

export default function MoveResetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);

  const { isBackgrounded } = useSessionLifecycle({
    onPause: () => setPaused(true),
  });

  const complete = useCallback(() => {
    if (isBackgrounded) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void recordResetCompleted(user?.uid, 'move');
    setPhase('done');
  }, [isBackgrounded, user?.uid]);

  const { secondsLeft } = useSessionClock({
    totalSeconds: DURATION_SECONDS,
    running: phase === 'active' && !isBackgrounded,
    paused,
    resetKey: 'move-reset',
    onComplete: complete,
  });

  const start = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaused(false);
    setPhase('active');
  };

  const end = () => router.back();

  return (
    <ScreenShell scroll={false} pillar="mind" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
      {phase !== 'done' && (
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MOVE RESET</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={end} hitSlop={12} accessibilityLabel="Close">
            <X size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {phase === 'idle' && (
        <View style={styles.centerContent}>
          <View style={styles.iconWrap}>
            <PersonStanding size={40} color={MOVE_ACCENT} strokeWidth={1.8} />
          </View>
          <Text style={styles.clock}>{formatClock(DURATION_SECONDS)}</Text>
          <Text style={styles.instruction}>
            Stand up, roll your shoulders, stretch gently, and walk around for a moment.
          </Text>
          <View style={styles.ctaWrap}>
            <GradientCTA label="Start 2-Min Reset" onPress={start} textColor="#03212C" />
          </View>
        </View>
      )}

      {phase === 'active' && (
        <View style={styles.centerContent}>
          <Text style={styles.clock}>{formatClock(secondsLeft)}</Text>
          <ProgressBar
            progress={1 - secondsLeft / DURATION_SECONDS}
            fill={MOVE_ACCENT}
            style={styles.progressBar}
          />
          <Text style={styles.instruction}>
            Stand up, roll your shoulders, stretch gently, and walk around for a moment.
          </Text>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setPaused(p => !p)}
              activeOpacity={0.8}
              accessibilityLabel={paused ? 'Resume' : 'Pause'}
            >
              {paused ? (
                <Play size={16} color={MOVE_ACCENT} fill={MOVE_ACCENT} />
              ) : (
                <Pause size={16} color={MOVE_ACCENT} fill={MOVE_ACCENT} />
              )}
              <Text style={styles.controlText}>{paused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={end} activeOpacity={0.8} accessibilityLabel="End reset">
              <Text style={styles.controlText}>End</Text>
            </TouchableOpacity>
          </View>

          {paused && isBackgrounded && (
            <Text style={styles.pausedNote}>Paused while you were away.</Text>
          )}
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.doneContainer}>
          <View style={styles.doneIcon}>
            <Check size={36} color={STATUS_COLORS.success} strokeWidth={3} />
          </View>
          <Text style={styles.doneTitle}>Movement reset complete</Text>
          <Text style={styles.doneSub}>Nice. Take that with you back to the screen.</Text>
          <View style={styles.ctaWrap}>
            <GradientCTA label="Done" onPress={() => router.back()} textColor="#03212C" />
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: MOVE_ACCENT,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MOVE_ACCENT + '14',
    borderWidth: 1,
    borderColor: MOVE_ACCENT + '30',
    marginBottom: 4,
  },
  clock: {
    fontFamily: FONTS.heading,
    fontSize: 52,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '100%',
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  ctaWrap: {
    width: '100%',
    marginTop: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MOVE_ACCENT + '40',
    backgroundColor: MOVE_ACCENT + '0E',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '700',
    color: MOVE_ACCENT,
  },
  pausedNote: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 6,
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  doneIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STATUS_COLORS.success + '14',
    borderWidth: 1,
    borderColor: STATUS_COLORS.success + '38',
    marginBottom: 4,
  },
  doneTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
