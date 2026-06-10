import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue, withSequence, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = { worstArea: string };

const CHALLENGES: Record<string, { title: string; subtitle: string; emoji: string; route: string; color: string }> = {
  Eyes:  { title: 'Complete the Eye Reset Protocol', subtitle: 'Recovery · 3 min',    emoji: '👁️', route: '/(app)/cvs-protocol',                color: '#6ee7b7' },
  Sleep: { title: 'Log tonight\'s sleep session',    subtitle: 'Sleep tracker · 1 min', emoji: '🌙', route: '/(app)/(tabs)/sleep?tab=tonight',     color: '#a78bfa' },
  Mind:  { title: 'Try 5 minutes of Box Breathing',  subtitle: 'Stress relief · 5 min', emoji: '🧘', route: '/(app)/stress/box-breathing',         color: '#38bdf8' },
};

const STORAGE_KEY = '@mindpulse/daily-challenge';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyChallenge({ worstArea }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const checkScale = useSharedValue(1);

  const challenge = CHALLENGES[worstArea] ?? CHALLENGES.Mind;

  useEffect(() => {
    void AsyncStorage.getItem(`${STORAGE_KEY}:${todayKey()}`).then(val => {
      if (val === worstArea) setDone(true);
    });
  }, [worstArea]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  function handlePress() {
    if (done) { router.push(challenge.route as never); return; }
    setDone(true);
    void AsyncStorage.setItem(`${STORAGE_KEY}:${todayKey()}`, worstArea);
    checkScale.value = withSequence(
      withSpring(1.5, { damping: 6, stiffness: 280 }),
      withSpring(1.0, { damping: 12 }),
    );
    setTimeout(() => router.push(challenge.route as never), 350);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>DAILY CHALLENGE</Text>
        {done && <Text style={styles.doneTag}>✓ DONE</Text>}
      </View>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <GlassCard style={{ ...styles.card, ...(done ? styles.cardDone : {}) }}>
          <View style={[styles.iconWrap, { backgroundColor: challenge.color + '22' }]}>
            <Text style={styles.emoji}>{challenge.emoji}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, done && styles.titleDone]}>{challenge.title}</Text>
            <Text style={styles.sub}>{challenge.subtitle}</Text>
          </View>
          <Animated.View style={checkStyle}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'chevron-forward'}
              size={22}
              color={done ? challenge.color : colors.text.tertiary}
            />
          </Animated.View>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.tertiary },
  doneTag: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#6ee7b7' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardDone: { opacity: 0.7 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  info: { flex: 1, gap: 3 },
  title: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  titleDone: { textDecorationLine: 'line-through', color: colors.text.secondary },
  sub: { ...typography.caption, color: colors.text.secondary },
});
