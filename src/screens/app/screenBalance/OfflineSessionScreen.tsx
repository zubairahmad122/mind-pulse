import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, PhoneOff } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import { FONTS, STATUS_COLORS } from '@/constants/designSystem';
import { ROUTES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSession } from '@/hooks/useOfflineSession';

const OFFLINE_ACCENT = STATUS_COLORS.success;

/** One shown per session — never a scrolling list, never gamified. */
const SUGGESTIONS = [
  'Get some water',
  'Walk around',
  'Look outside',
  'Stretch',
  'Tidy one small area',
];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatOfflineMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export default function OfflineSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ duration?: string }>();
  const parsedDuration = Number(params.duration);
  const initialDuration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined;

  const [suggestion] = useState(() => SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]);

  const { phase, remainingSeconds, durationSeconds } = useOfflineSession(user?.uid, initialDuration);

  const finish = () => router.replace(ROUTES.appHome as never);

  if (phase === 'completed') {
    return (
      <ScreenShell scroll={false} pillar="mind" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
        <View style={styles.doneContainer}>
          <View style={styles.doneIcon}>
            <Check size={36} color={OFFLINE_ACCENT} strokeWidth={3} />
          </View>
          <Text style={styles.doneTitle}>Reset complete</Text>
          <Text style={styles.doneMinutes}>{formatOfflineMinutes(durationSeconds)} offline</Text>
          <Text style={styles.doneSub}>Nice. Come back when you actually need the screen.</Text>
          <View style={styles.ctaWrap}>
            <GradientCTA label="Done" onPress={finish} textColor="#03212C" />
          </View>
        </View>
      </ScreenShell>
    );
  }

  if (phase === 'idle' || phase === 'loading') {
    return (
      <ScreenShell scroll={false} pillar="mind" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
        <View style={styles.centerContent} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll={false} pillar="mind" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
      <View style={styles.centerContent}>
        <View style={styles.iconWrap}>
          <PhoneOff size={30} color={OFFLINE_ACCENT} strokeWidth={1.8} />
        </View>
        <Text style={styles.eyebrow}>OFFLINE TIME</Text>
        <Text
          style={styles.clock}
          accessibilityLabel={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}
        >
          {formatClock(remainingSeconds)}
        </Text>
        <Text style={styles.instruction}>Put your phone down.</Text>
        <Text style={styles.instructionSub}>Come back when the timer ends.</Text>

        <View style={styles.suggestionPill}>
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OFFLINE_ACCENT + '14',
    borderWidth: 1,
    borderColor: OFFLINE_ACCENT + '30',
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: OFFLINE_ACCENT,
  },
  clock: {
    fontFamily: FONTS.heading,
    fontSize: 56,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  instruction: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 12,
  },
  instructionSub: {
    fontSize: 13.5,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  suggestionPill: {
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  doneIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OFFLINE_ACCENT + '14',
    borderWidth: 1,
    borderColor: OFFLINE_ACCENT + '38',
    marginBottom: 4,
  },
  doneTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  doneMinutes: {
    fontSize: 14,
    fontWeight: '700',
    color: OFFLINE_ACCENT,
  },
  doneSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 4,
  },
  ctaWrap: {
    width: '100%',
    marginTop: 14,
  },
});
