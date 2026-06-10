import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBackground from '@/components/AnimatedBackground';
import { AuthBackButton, Button } from '@/components/ui';
import { AGE_INPUT, COLORS, ROUTES } from '@/constants';
import { sleepHoursRecommendation } from '@/utils/ageSleepRecommendation';

export default function AgeInputScreen() {
  const [age, setAge] = useState(22);
  const router = useRouter();

  return (
    <View className="flex-1 px-6 pt-[56px] pb-12">
      <AnimatedBackground />

      <AuthBackButton marginBottom={8} />

      <View className="flex-1 items-center justify-center gap-4">
        <Text className="text-app-muted text-[12px] font-bold tracking-[2px] uppercase mb-1">
          Step 1 of 3
        </Text>
        <Text className="text-[30px] font-bold text-white text-center">How old are you?</Text>
        <Text className="text-[15px] text-app-muted text-center leading-6 mb-4">
          We personalise your sleep targets{'\n'}based on your age.
        </Text>

        {/* Age stepper */}
        <View className="flex-row items-center gap-10 my-4">
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setAge(a => Math.max(AGE_INPUT.min, a - 1))}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.ageText}>{age}</Text>

          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setAge(a => Math.min(AGE_INPUT.max, a + 1))}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Recommendation badge */}
        <View style={styles.recCard}>
          <Text className="text-app-muted text-[13px] font-medium">Recommended sleep</Text>
          <Text className="text-app-gold font-bold text-[15px]">{sleepHoursRecommendation(age)}</Text>
        </View>
      </View>

      <Button label="Continue" onPress={() => router.push(ROUTES.authSignUp)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stepBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.borderHi,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  ageText: {
    fontSize: 84, fontWeight: '800', color: '#ffffff',
    minWidth: 120, textAlign: 'center', letterSpacing: -3, lineHeight: 96,
  },
  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
  },
});
