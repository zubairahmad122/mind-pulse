import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PhoneOff, X } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import { FONTS, STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { ROUTES } from '@/constants';

const OFFLINE_ACCENT = STATUS_COLORS.success;
const DURATIONS_MIN = [5, 15, 30, 60] as const;
const DEFAULT_MINUTES = 5;

export default function OfflineResetScreen() {
  const router = useRouter();
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES);

  const start = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: ROUTES.appOfflineSession,
      params: { duration: String(minutes * 60) },
    } as never);
  };

  return (
    <ScreenShell scroll={false} pillar="mind" contentStyle={styles.root} ambient={<AmbientBackground subtle />} safeBottom>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>GO OFFLINE</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
          <X size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        <View style={styles.iconWrap}>
          <PhoneOff size={36} color={OFFLINE_ACCENT} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>Put your phone down for a few minutes.</Text>
        <Text style={styles.subtitle}>Give your eyes and attention a real break.</Text>

        <View style={styles.chipsRow}>
          {DURATIONS_MIN.map(m => {
            const active = m === minutes;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setMinutes(m);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${m} minutes`}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{m} min</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <GradientCTA label="Start Offline Time" onPress={start} textColor="#03212C" />
      </View>
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
    color: OFFLINE_ACCENT,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OFFLINE_ACCENT + '14',
    borderWidth: 1,
    borderColor: OFFLINE_ACCENT + '30',
    marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 19,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: 300,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  chip: {
    minHeight: 48,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    borderColor: OFFLINE_ACCENT,
    backgroundColor: OFFLINE_ACCENT + '1C',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: OFFLINE_ACCENT,
  },
  ctaWrap: {
    paddingBottom: spacing.lg,
  },
});
