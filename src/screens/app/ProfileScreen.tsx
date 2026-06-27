import { ScreenShell } from '@/components/layout/ScreenShell';
import { ActionCard } from '@/components/ui/ActionCard';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { SubscriptionBadge } from '@/components/ui/SubscriptionBadge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { COLORS, ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { LANGUAGES } from '@/constants/languages';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSleep } from '@/context/SleepContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { calculateMindPulseScore } from '@/utils/scoring';
import { calculateStreak } from '@/utils/sleepUtils';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Crown, Edit3, Flame, Globe, LogOut, Moon, Sparkles, Trophy } from 'lucide-react-native';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { LucideIcon } from 'lucide-react-native';

type MenuItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  route: string;
};

const MENU: MenuItem[] = [
  { label: 'Edit Profile', description: 'Name, age & personal details', icon: Edit3, route: ROUTES.appEditProfile },
  { label: 'Sleep History', description: 'Review your tracked sessions', icon: Clock, route: ROUTES.appHistory },
  { label: 'Achievements', description: 'Streaks, badges & milestones', icon: Trophy, route: ROUTES.appAchievements },
];

function StatCell({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: LucideIcon;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <GlassCard style={styles.stat}>
      <View style={[styles.statIcon, { borderColor: color + '38' }]}>
        <LinearGradient
          colors={[color + '28', color + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Icon size={17} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

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
    <ScreenShell safeBottom ambient={<AmbientBackground />}>
      <ScreenTransition>
      <ScreenHeader title="Profile" rightAction={<SubscriptionBadge />} />

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

      <SectionLabel>OVERVIEW</SectionLabel>
      <View style={styles.statsRow}>
        <StatCell icon={Flame} color="#FF9800" value={String(streak)} label="Day streak" />
        <StatCell icon={Moon} color="#a78bfa" value={String(sessions.length)} label="Sessions" />
        <StatCell
          icon={Sparkles}
          color="#22d3ee"
          value={anyLoading ? '–' : sessions.length > 0 ? String(mindPulseScore) : '0'}
          label={sessions.length === 0 ? 'Start your first session!' : 'Score'}
        />
      </View>

      {/* Language selector */}
      <SectionLabel>PREFERENCES</SectionLabel>
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

      <SectionLabel>ACCOUNT</SectionLabel>
      {MENU.map(item => (
        <ActionCard
          key={item.route}
          icon={item.icon}
          title={item.label}
          description={item.description}
          accent={colors.accent.purple}
          onPress={() => router.push(item.route as never)}
        />
      ))}

      {isGuest && (
        <View style={styles.createWrap}>
          <GradientCTA
            label="CREATE ACCOUNT"
            onPress={() => router.push(ROUTES.authCreateAccount)}
            colors={['#3b82f6', '#7c3aed', '#c026d3']}
            glowColor="rgba(124,58,237,0.5)"
            letterSpacing={1.2}
          />
        </View>
      )}

      <ActionCard
        icon={LogOut}
        title={isGuest ? 'Exit Guest Mode' : 'Log Out'}
        description={isGuest ? 'Return to welcome screen' : 'Sign out of your account'}
        accent={'#F44336'}
        onPress={handleSignOut}
      />
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(167, 139, 250, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarLetter: { fontSize: 38, fontWeight: '800', color: colors.text.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.headingMedium, color: colors.text.primary, fontWeight: '700' },
  email: { ...typography.body, color: colors.text.secondary },
  membershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  membershipIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipText: { flex: 1, gap: 2 },
  membershipTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '700' },
  membershipSub: { ...typography.caption, color: colors.text.secondary },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: 8 },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  statValue: { fontSize: 22, color: '#FFFFFF', fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { ...typography.caption, color: colors.text.tertiary, fontWeight: '600' },
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  langBtnActive: {
    borderColor: colors.accent.purple,
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
  },
  langFlag: { fontSize: 24 },
  langLabel: { ...typography.caption, color: colors.text.secondary, fontSize: 11, fontWeight: '500' },
  langLabelActive: { color: colors.accent.purple, fontWeight: '700' },
  createWrap: { marginTop: spacing.md },

});
