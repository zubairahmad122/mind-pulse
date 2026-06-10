import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { COLORS, ROUTES, type IoniconName } from '@/constants';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSleep } from '@/context/SleepContext';
import { useEyeStressScore } from '@/hooks/useEyeStressScore';
import { useMindScore } from '@/hooks/useMindScore';
import { calculateMindPulseScore } from '@/utils/scoreCalculator';
import { calculateSleepScore, calculateStreak } from '@/utils/sleepUtils';

type MenuItem = {
  label: string;
  icon: IoniconName;
  route: string;
};

const MENU: MenuItem[] = [
  { label: 'Edit Profile', icon: 'create-outline', route: ROUTES.appEditProfile },
  { label: 'Sleep History', icon: 'time-outline', route: ROUTES.appHistory },
  { label: 'Achievements', icon: 'trophy-outline', route: ROUTES.appAchievements },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { sessions } = useSleep();
  const { langCode, setLang } = useLanguage();
  const router = useRouter();

  const { score: eyesScore, loading: eyesLoading } = useEyeStressScore(user?.uid ?? undefined);
  const { score: mindScoreNum, loading: mindLoading } = useMindScore(user?.uid ?? undefined);

  const isGuest = user?.isAnonymous ?? true;
  const displayName = isGuest
    ? 'Guest'
    : (user?.displayName ?? user?.email?.split('@')[0] ?? 'User');
  const streak = calculateStreak(sessions);
  const sleepScore = calculateSleepScore(sessions);
  const eyes = eyesLoading ? 0 : eyesScore;
  const mind = mindLoading ? 0 : mindScoreNum;
  const mindPulseScore = calculateMindPulseScore({ eyesScore: eyes, sleepScore, mindScore: mind });

  const handleSignOut = () => {
    Alert.alert(
      isGuest ? 'Exit Guest Mode' : 'Sign Out',
      isGuest ? 'Return to welcome?' : 'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isGuest ? 'Exit' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace(ROUTES.authOnboarding);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Could not sign out.';
              Alert.alert('Error', message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenShell safeBottom>
      <ScreenHeader title="Profile" showBack />

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{isGuest ? 'Guest mode' : (user?.email ?? '')}</Text>
      </View>

      <View style={styles.statsRow}>
        <GlassCard style={styles.stat}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </GlassCard>
        <GlassCard style={styles.stat}>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </GlassCard>
        <GlassCard style={styles.stat}>
          <Text style={styles.statValue}>{(eyesLoading || mindLoading) ? '–' : sessions.length > 0 ? String(mindPulseScore) : '—'}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </GlassCard>
      </View>

      {/* Language selector */}
      <GlassCard style={styles.langCard}>
        <Text style={styles.langTitle}>Voice Language</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.langBtn, langCode === l.code && styles.langBtnActive]}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, langCode === l.code && styles.langLabelActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {MENU.map(item => (
        <TouchableOpacity key={item.route} onPress={() => router.push(item.route as never)}>
          <GlassCard style={styles.menuRow}>
            <Ionicons name={item.icon} size={20} color={colors.accent.purple} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </GlassCard>
        </TouchableOpacity>
      ))}

      {isGuest && (
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push(ROUTES.authSignUp)}>
          <Text style={styles.createBtnText}>Create Account</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.textMuted} />
        <Text style={styles.signOutText}>{isGuest ? 'Exit Guest Mode' : 'Log Out'}</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent.purpleLight,
    borderWidth: 2,
    borderColor: colors.accent.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: colors.text.primary },
  name: { ...typography.headingMedium, color: colors.text.primary },
  email: { ...typography.body, color: colors.text.secondary },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.headingSmall, color: colors.accent.purple },
  statLabel: { ...typography.caption, color: colors.text.secondary },
  langCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  langTitle: { ...typography.label, color: colors.text.secondary },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  langBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  langBtnActive: {
    borderColor: colors.accent.purple,
    backgroundColor: colors.accent.purpleLight,
  },
  langFlag: { fontSize: 18 },
  langLabel: { ...typography.caption, color: colors.text.secondary, fontSize: 10 },
  langLabelActive: { color: colors.accent.purple, fontWeight: '700' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  menuLabel: { flex: 1, ...typography.bodyLarge, color: colors.text.primary },
  createBtn: {
    backgroundColor: colors.accent.purple,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  createBtnText: { color: colors.text.primary, fontWeight: '700', fontSize: 15 },
  signOutBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    borderRadius: 16,
  },
  signOutText: { color: colors.text.secondary, fontWeight: '600' },
});
