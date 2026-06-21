import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Globe, Edit3, Clock, Trophy, ChevronRight, LogOut, Crown } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { COLORS, ROUTES } from '@/constants';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { useSleep } from '@/context/SleepContext';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { calculateMindPulseScore } from '@/utils/scoring';
import { calculateStreak } from '@/utils/sleepUtils';

import type { LucideIcon } from 'lucide-react-native';

type MenuItem = {
  label: string;
  icon: LucideIcon;
  route: string;
};

const MENU: MenuItem[] = [
  { label: 'Edit Profile', icon: Edit3, route: ROUTES.appEditProfile },
  { label: 'Sleep History', icon: Clock, route: ROUTES.appHistory },
  { label: 'Achievements', icon: Trophy, route: ROUTES.appAchievements },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const { sessions } = useSleep();
  const { langCode, setLang } = useLanguage();
  const router = useRouter();

  const eyeResult = useEyeScore(user?.uid ?? undefined);
  const mindResult = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(user?.uid ?? undefined, user?.isAnonymous ?? true);

  const isGuest = user?.isAnonymous ?? true;
  const displayName = isGuest
    ? 'Guest'
    : (user?.displayName ?? user?.email?.split('@')[0] ?? 'User');
  const streak = calculateStreak(sessions);
  const anyLoading = eyeResult.loading || mindResult.loading || sleepResult.loading;
  const eyes = eyeResult.loading ? 0 : eyeResult.score;
  const sleepScore = sleepResult.loading ? 0 : sleepResult.score;
  const mind = mindResult.loading ? 0 : mindResult.score;
  const mindPulseScore = calculateMindPulseScore({ eyeScore: eyes, sleepScore, mindScore: mind });

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
              router.replace(ROUTES.welcome);
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
      <ScreenTransition>
      <ScreenHeader title="Profile" />

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{displayName}</Text>
          {isPremium && <PremiumBadge />}
        </View>
        <Text style={styles.email}>{isGuest ? 'Guest mode' : (user?.email ?? '')}</Text>
      </View>

      {isPremium ? (
        <GlassCard style={styles.membershipCard}>
          <View style={styles.membershipIconWrap}>
            <Crown size={20} color={COLORS.gold} />
          </View>
          <View style={styles.membershipText}>
            <Text style={styles.membershipTitle}>MindPulse Pro</Text>
            <Text style={styles.membershipSub}>You have full access to every feature</Text>
          </View>
        </GlassCard>
      ) : (
        <TouchableOpacity onPress={() => router.push(ROUTES.appPremium as never)} activeOpacity={0.85}>
          <GlassCard style={{ ...styles.membershipCard, borderColor: colors.accent.purpleBorder }}>
            <View style={styles.membershipIconWrap}>
              <Crown size={20} color={colors.accent.purple} />
            </View>
            <View style={styles.membershipText}>
              <Text style={styles.membershipTitle}>Upgrade to Pro</Text>
              <Text style={styles.membershipSub}>Unlock every feature across MindPulse</Text>
            </View>
            <ChevronRight size={18} color={colors.text.tertiary} />
          </GlassCard>
        </TouchableOpacity>
      )}

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
          <Text style={styles.statValue}>{anyLoading ? '–' : sessions.length > 0 ? String(mindPulseScore) : '—'}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </GlassCard>
      </View>

      {/* Language selector */}
      <GlassCard style={styles.langCard}>
        <View style={styles.langHeader}>
          <Globe size={20} color={colors.accent.purple} />
          <Text style={styles.langTitle}>Voice Language</Text>
        </View>
        <View style={styles.langRow}>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.langBtn, langCode === l.code && styles.langBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, langCode === l.code && styles.langLabelActive]}>
                {l.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {MENU.map(item => (
        <TouchableOpacity key={item.route} onPress={() => router.push(item.route as never)}>
          <GlassCard style={styles.menuRow}>
            <item.icon size={20} color={colors.accent.purple} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color={colors.text.tertiary} />
          </GlassCard>
        </TouchableOpacity>
      ))}

      {isGuest && (
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push(ROUTES.authSignUp)}>
          <Text style={styles.createBtnText}>Create Account</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <LogOut size={18} color={COLORS.textMuted} />
        <Text style={styles.signOutText}>{isGuest ? 'Exit Guest Mode' : 'Log Out'}</Text>
      </TouchableOpacity>
      </ScreenTransition>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.headingMedium, color: colors.text.primary },
  email: { ...typography.body, color: colors.text.secondary },
  membershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  membershipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipText: { flex: 1, gap: 2 },
  membershipTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '700' },
  membershipSub: { ...typography.caption, color: colors.text.secondary },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.headingSmall, color: colors.accent.purple },
  statLabel: { ...typography.caption, color: colors.text.secondary },
  langCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langTitle: { ...typography.label, color: colors.text.primary, fontSize: 16, fontWeight: '600' },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  langBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  langBtnActive: {
    borderColor: colors.accent.purple,
    backgroundColor: 'rgba(157, 138, 255, 0.15)',
  },
  langFlag: { fontSize: 24 },
  langLabel: { ...typography.caption, color: colors.text.secondary, fontSize: 11, fontWeight: '500' },
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
