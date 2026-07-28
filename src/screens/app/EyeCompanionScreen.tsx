import { Bell, Monitor, Pause, Play, RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS, RADIUS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';

const INTERVALS = [20, 30, 45, 60] as const;
type Mode = 'idle' | 'focus' | 'break';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function notifyBrowser(title: string, body: string): void {
  if (Platform.OS !== 'web' || typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export default function EyeCompanionScreen() {
  const [intervalMinutes, setIntervalMinutes] = useState<(typeof INTERVALS)[number]>(20);
  const [mode, setMode] = useState<Mode>('idle');
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft(current => {
        if (current > 1) return current - 1;
        if (mode === 'focus') {
          setMode('break');
          notifyBrowser('Time for an eye break', 'Look away from the screen for 20 seconds.');
          return 20;
        }
        setMode('idle');
        setRunning(false);
        notifyBrowser('Break complete', 'Return when you are ready.');
        return intervalMinutes * 60;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [intervalMinutes, mode, running]);

  const start = () => {
    if (Platform.OS === 'web' && typeof Notification !== 'undefined'
      && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    if (mode === 'idle') {
      setMode('focus');
      setSecondsLeft(intervalMinutes * 60);
    }
    setRunning(true);
  };

  const reset = () => {
    setMode('idle');
    setRunning(false);
    setSecondsLeft(intervalMinutes * 60);
  };

  const accent = PILLAR_COLORS.eye;
  return (
    <ScreenShell ambient={<AmbientBackground subtle />} contentStyle={styles.shell}>
      <ScreenHeader
        title="Desktop Eye Companion"
        subtitle="A simple browser break timer"
        showBack
      />

      <GlassCard style={styles.hero}>
        <View style={styles.icon}>
          {mode === 'break'
            ? <Bell size={30} color={accent} />
            : <Monitor size={30} color={accent} />}
        </View>
        <Text style={styles.mode}>
          {mode === 'break' ? 'LOOK AWAY' : mode === 'focus' ? 'SCREEN SESSION' : 'READY'}
        </Text>
        <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>
        <Text style={styles.instruction}>
          {mode === 'break'
            ? 'Look at something far away. Blink naturally and let your eyes rest.'
            : 'The timer stays in this browser tab and prompts a 20-second look-away break.'}
        </Text>
      </GlassCard>

      <Text style={styles.label}>REMIND ME EVERY</Text>
      <View style={styles.options}>
        {INTERVALS.map(minutes => (
          <TouchableOpacity
            key={minutes}
            disabled={mode !== 'idle'}
            onPress={() => {
              setIntervalMinutes(minutes);
              setSecondsLeft(minutes * 60);
            }}
            style={[
              styles.option,
              intervalMinutes === minutes && styles.optionSelected,
              mode !== 'idle' && styles.optionDisabled,
            ]}
          >
            <Text style={[
              styles.optionText,
              intervalMinutes === minutes && styles.optionTextSelected,
            ]}>
              {minutes}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <GradientCTA
        label={running ? 'Pause Timer' : mode === 'idle' ? 'Start Screen Session' : 'Resume Timer'}
        icon={running
          ? <Pause size={17} color="#03212C" />
          : <Play size={17} color="#03212C" />}
        onPress={() => running ? setRunning(false) : start()}
        textColor="#03212C"
      />
      <TouchableOpacity style={styles.reset} onPress={reset}>
        <RotateCcw size={14} color={colors.text.secondary} />
        <Text style={styles.resetText}>Reset timer</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Prototype: keep this tab open. Browser and operating-system power settings
        can delay background timers and notifications.
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.lg, paddingVertical: spacing.xl },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PILLAR_COLORS.eye + '14',
    marginBottom: spacing.md,
  },
  mode: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: PILLAR_COLORS.eye,
  },
  timer: { fontSize: 68, lineHeight: 78, fontWeight: '900', color: colors.text.primary },
  instruction: {
    maxWidth: 460,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  label: {
    marginBottom: spacing.sm,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  options: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  optionSelected: {
    borderColor: PILLAR_COLORS.eye + '80',
    backgroundColor: PILLAR_COLORS.eye + '14',
  },
  optionDisabled: { opacity: 0.55 },
  optionText: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
  optionTextSelected: { color: PILLAR_COLORS.eye },
  reset: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 7,
    padding: spacing.md,
  },
  resetText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  note: {
    marginTop: spacing.md,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
    color: colors.text.tertiary,
  },
});
