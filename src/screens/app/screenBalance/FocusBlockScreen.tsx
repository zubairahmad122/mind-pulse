import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check, Pause, Play, TimerReset } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SHADOWS, STATUS_COLORS } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useFocusBlockSession } from '@/hooks/useFocusBlockSession';
import { isMeaningfulFocusGoal } from '@/services/focusBlockPersistence';

const ACCENT = PILLAR_COLORS.reset;
const DURATIONS = [15, 25, 45] as const;
const PLACEHOLDERS = [
  'Finish the report',
  'Study one chapter',
  'Read 10 pages',
  'Reply to important emails',
] as const;
const CTA_TEXT = '#03212C';
const CTA_GLOW = 'rgba(84,168,255,0.22)';
/** Same navy-glass family as the Home Featured card / Screen Balance Details
 * hero — a 2-stop gradient, not the flat neutral `GlassCard` default, so the
 * setup card actually reads as its own surface instead of blending into the
 * screen background. */
const SETUP_TINT = ['#1C2A50', '#111A36'] as const;

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default function FocusBlockScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [durationMinutes, setDurationMinutes] = useState<(typeof DURATIONS)[number]>(25);
  const [goal, setGoal] = useState('');
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const {
    phase,
    session,
    completion,
    remainingSeconds,
    start,
    pause,
    resume,
    endEarly,
    acknowledgeCompletion,
  } = useFocusBlockSession(user?.uid);

  const activeGoal = session?.goal ?? completion?.goal ?? goal.trim();
  const canStart = useMemo(() => isMeaningfulFocusGoal(goal), [goal]);

  const startFocus = async () => {
    const ok = await start(durationMinutes * 60, goal);
    if (ok) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmEnd = () => {
    Alert.alert('End focus block?', 'You still have time remaining.', [
      { text: 'Keep Focusing', style: 'cancel' },
      {
        text: 'End Block',
        style: 'destructive',
        onPress: () => void endEarly(),
      },
    ]);
  };

  const done = async () => {
    await acknowledgeCompletion();
    router.replace(ROUTES.appScreenBalance as never);
  };

  if (phase === 'loading') {
    return (
      <ScreenShell scroll={false} pillar="reset" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
        <View style={styles.centerContent} />
      </ScreenShell>
    );
  }

  if (phase === 'completed') {
    return (
      <ScreenShell scroll={false} pillar="reset" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
        <View style={styles.doneContainer}>
          <View style={styles.doneIcon}>
            <Check size={38} color={STATUS_COLORS.success} strokeWidth={3} />
          </View>
          <Text style={styles.doneEyebrow}>FOCUS COMPLETE</Text>
          <Text style={styles.doneTitle}>{formatDuration(completion?.durationSeconds ?? session?.durationSeconds ?? durationMinutes * 60)} focused</Text>
          <View style={styles.goalBlock}>
            <Text style={styles.goalLabel}>Goal:</Text>
            <Text style={styles.goalText} numberOfLines={3}>{activeGoal}</Text>
          </View>
          <Text style={styles.doneSub}>Nice work. Take a moment before starting something else.</Text>
          <View style={styles.ctaWrap}>
            <GradientCTA label="Done" onPress={done} textColor="#03212C" />
          </View>
        </View>
      </ScreenShell>
    );
  }

  if (phase === 'active' || phase === 'paused') {
    const paused = phase === 'paused';
    return (
      <ScreenShell scroll={false} pillar="reset" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
        <View style={styles.focusContainer}>
          <View style={styles.activeHeader}>
            <Text style={styles.eyebrow}>FOCUS BLOCK</Text>
          </View>
          <Text
            style={styles.clock}
            accessibilityLabel={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}
          >
            {formatClock(remainingSeconds)}
          </Text>
          <View style={styles.goalBlock}>
            <Text style={styles.goalLabel}>Goal:</Text>
            <Text style={styles.goalText} numberOfLines={4}>{activeGoal}</Text>
          </View>
          <Text style={styles.supportLine}>{paused ? 'Paused.' : 'Stay with one task.'}</Text>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => void (paused ? resume() : pause())}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume focus block' : 'Pause focus block'}
            >
              {paused ? (
                <Play size={17} color={ACCENT} fill={ACCENT} />
              ) : (
                <Pause size={17} color={ACCENT} fill={ACCENT} />
              )}
              <Text style={styles.controlText}>{paused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.endBtn]}
              onPress={confirmEnd}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="End focus block"
            >
              <Text style={styles.endText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell safeBottom pillar="reset" ambient={<AmbientBackground subtle />}>
      <ScreenHeader
        title="Focus Block"
        subtitle="Choose one thing to focus on."
        showBack
        subtitleLines={1}
      />

      <GlassCard noPadding tint={SETUP_TINT} style={{ marginTop: 4, ...SHADOWS.small }}>
        {/* Ambient depth — cyan glow behind the duration selector up top, a
            barely-there violet echo low down. Full-bleed (no inner box) so
            there's no hard-edged seam, the same treatment as the Home
            Featured card and Screen Balance Details. */}
        <LinearGradient
          colors={['rgba(0,224,255,0.11)', 'rgba(0,224,255,0.03)', 'rgba(0,224,255,0)']}
          locations={[0, 0.45, 0.75]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(157,92,255,0)', 'rgba(157,92,255,0.03)', 'rgba(157,92,255,0.08)']}
          locations={[0.5, 0.8, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.setupInner}>
          <View style={styles.setupHeaderRow}>
            <View style={styles.setupIconWrap}>
              <TimerReset size={18} color={ACCENT} strokeWidth={2} />
            </View>
            <View style={styles.setupHeaderText}>
              <Text style={styles.setupTitle}>Choose your focus time</Text>
              <Text style={styles.setupSubtitle}>Start with one clear task.</Text>
            </View>
          </View>

          <Text style={styles.sectionEyebrow}>FOCUS WINDOW</Text>
          <View style={styles.durationTrack}>
            {DURATIONS.map(minutes => {
              const active = durationMinutes === minutes;
              return (
                <TouchableOpacity
                  key={minutes}
                  onPress={() => setDurationMinutes(minutes)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${minutes} minute focus duration${active ? ', selected' : ''}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.durationSegment, active && styles.durationSegmentActive]}
                >
                  <Text style={[styles.durationSegmentText, active && styles.durationSegmentTextActive]}>
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionEyebrow, styles.goalEyebrow]}>ONE GOAL</Text>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder={placeholder}
            placeholderTextColor="rgba(245,247,251,0.32)"
            maxLength={100}
            multiline
            textAlignVertical="top"
            style={styles.goalInput}
            accessibilityLabel="Focus goal"
            returnKeyType="done"
          />
          {goal.length > 0 ? <Text style={styles.inputHint}>{goal.length}/100</Text> : null}

          <Text style={styles.intentionLine}>{durationMinutes} min · One goal · No rush</Text>
        </View>
      </GlassCard>

      <View style={styles.setupCta}>
        {canStart ? (
          <GradientCTA
            label="Start Focus"
            onPress={startFocus}
            textColor={CTA_TEXT}
            glowColor={CTA_GLOW}
            height={50}
          />
        ) : (
          <View
            style={styles.ctaDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Start Focus, disabled until you add a goal"
          >
            <Text style={styles.ctaDisabledText}>Start Focus</Text>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
  },
  setupInner: {
    padding: 18,
  },
  setupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setupIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT + '16',
    borderWidth: 1,
    borderColor: ACCENT + '30',
    borderTopColor: 'rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  setupHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  setupTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 19,
    fontWeight: '600',
    color: colors.text.primary,
  },
  setupSubtitle: {
    fontSize: 12.5,
    color: colors.text.secondary,
    marginTop: 1,
  },
  sectionEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(245,247,251,0.5)',
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  goalEyebrow: {
    marginTop: 16,
  },
  durationTrack: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationSegment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  durationSegmentActive: {
    backgroundColor: ACCENT + '22',
    borderColor: ACCENT + '55',
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  durationSegmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.5)',
  },
  durationSegmentTextActive: {
    fontSize: 14.5,
    fontWeight: '800',
    color: ACCENT,
  },
  goalInput: {
    minHeight: 52,
    maxHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text.primary,
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '600',
  },
  inputHint: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  intentionLine: {
    marginTop: 16,
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.42)',
    textAlign: 'center',
  },
  setupCta: {
    marginTop: 18,
  },
  ctaDisabled: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaDisabledText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.38)',
  },
  focusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 34,
  },
  activeHeader: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: ACCENT,
    textAlign: 'center',
  },
  clock: {
    fontFamily: FONTS.heading,
    fontSize: 60,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
    marginBottom: 22,
  },
  goalBlock: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(245,247,251,0.48)',
    marginBottom: 6,
  },
  goalText: {
    fontFamily: FONTS.headingSemi,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.text.primary,
  },
  supportLine: {
    marginTop: 18,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
  },
  controlBtn: {
    minWidth: 116,
    minHeight: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: ACCENT + '10',
    borderWidth: 1,
    borderColor: ACCENT + '3D',
  },
  endBtn: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  controlText: {
    fontSize: 14,
    fontWeight: '800',
    color: ACCENT,
  },
  endText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(245,247,251,0.72)',
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 34,
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
    marginBottom: 2,
  },
  doneEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: STATUS_COLORS.success,
  },
  doneTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 4,
  },
  ctaWrap: {
    width: '100%',
    marginTop: 14,
  },
});
