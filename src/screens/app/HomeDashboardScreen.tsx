import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { SoftPaywallModal } from '@/components/ui/SoftPaywallModal';
import { SubscriptionBadge } from '@/components/ui/SubscriptionBadge';
import { ROUTES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useGreeting } from '@/hooks/useGreeting';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { useHomeInsight } from '@/hooks/useHomeInsight';
import { useDailyTip } from '@/hooks/useDailyTip';
import { DailyTip } from '@/components/home/DailyTip';
import { StaggerItem } from '@/components/ui/StaggerItem';
import { calculateStreak } from '@/utils/sleepUtils';
import {
  calculateMindPulseScore,
  getFocusArea,
  pulseScoreTheme,
  type FocusArea,
} from '@/utils/scoring';
import { saveDailyScore } from '@/services/dailyScorePersistence';

const ONBOARDING_PAYWALL_KEY = 'onboarding_paywall_shown';
const STREAK_PAYWALL_KEY     = 'streak_paywall_shown';

// ── SVG progress ring (circular) ──────────────────────────────────────────────

function ProgressRing({
  size = 96,
  strokeWidth = 8,
  progress,      // 0–100
  color,
  label,
  value,
  valueSuffix = '%',
  icon,
  gradient,
}: {
  size?: number; strokeWidth?: number;
  progress: number; color: string;
  label?: string; value: string | number;
  valueSuffix?: string;
  icon?: React.ReactNode;
  gradient?: { id: string; stops: { offset: string; color: string }[] };
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {gradient && (
            <SvgLinearGradient id={gradient.id} x1="0" y1="0" x2="1" y2="1">
              {gradient.stops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </SvgLinearGradient>
          )}
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={gradient ? `url(#${gradient.id})` : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={{
          position: 'absolute', inset: 0,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon ? icon : (
            <>
              <Text style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: size * 0.27,
                color: '#f6f8fc',
                lineHeight: size * 0.3,
              }}>
                {value}
              </Text>
              {valueSuffix ? (
                <Text style={{
                  fontSize: size * 0.085,
                  letterSpacing: 1.5,
                  color: 'rgba(245,247,251,0.5)',
                  marginTop: 1,
                }}>
                  {valueSuffix}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
      {label ? (
        <Text style={{
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 13, color: '#f6f8fc', marginTop: 8,
        }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

// ── PillarRow ─────────────────────────────────────────────────────────────────

function PillarRow({
  icon, value, label, sublabel, color, progress,
  onPress,
}: {
  icon: React.ReactNode; value: string; label: string;
  sublabel: string; color: string; progress: number;
  onPress: () => void;
}) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <TouchableOpacity
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 13,
        paddingVertical: 13, paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.035)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        marginBottom: 10,
      }}
    >
      <View style={{ position: 'relative', width: 46, height: 46 }}>
        <Svg width={46} height={46} viewBox="0 0 46 46">
          <Circle cx={23} cy={23} r={18} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
          <Circle
            cx={23} cy={23} r={18}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 23 23)"
          />
        </Svg>
        <View style={{ position: 'absolute', inset: 13, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 14, color: '#f6f8fc',
        }}>
          {label}
        </Text>
        <Text style={{
          fontSize: 11, color: 'rgba(245,247,251,0.5)',
          marginTop: 1,
        }}>
          {sublabel}
        </Text>
      </View>
      <Text style={{
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 16, color,
      }}>
        {value}
      </Text>
    </TouchableOpacity>
  );
}

// ── TypewriterText ────────────────────────────────────────────────────────────

function TypewriterText({
  text, speed = 16, style,
}: { text: string; speed?: number; style?: TextStyle }) {
  const [shown, setShown] = useState('');
  const prevRef = useRef('');

  useEffect(() => {
    if (!text || text === prevRef.current) return;
    prevRef.current = text;
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <Text style={style}>{shown || ' '}</Text>;
}

// ── Small icon SVGs ───────────────────────────────────────────────────────────

function MindIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M2 12 H6 L8 6 L11 18 L14 9 L16 12 H22" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SleepIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" fill="none" stroke="#c4b5fd" strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z" fill="none" stroke="#67e8f9" strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3.2} fill="#67e8f9" />
    </Svg>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  const color = active ? '#60a5fa' : '#f5f7fb';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function TrendsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 19V5M4 16l5-5 4 4 7-8" fill="none" stroke="#f5f7fb" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TargetsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8} fill="none" stroke="#f5f7fb" strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={3.4} fill="none" stroke="#f5f7fb" strokeWidth={1.8} />
    </Svg>
  );
}

function ProfileIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={3.6} fill="none" stroke="#f5f7fb" strokeWidth={1.8} />
      <Path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke="#f5f7fb" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ── TabItem ───────────────────────────────────────────────────────────────────

function TabItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 4, opacity: active ? 1 : 0.5 }}>
      {icon}
      <Text style={{
        fontSize: 9, fontWeight: '600',
        color: active ? '#60a5fa' : '#f5f7fb',
      }}>
        {label}
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const router        = useRouter();
  const { user }      = useAuth();
  const { isPremium } = useSubscription();
  const { sessions }  = useSleep();
  const displayName   = user?.displayName ?? user?.email?.split('@')[0] ?? 'Alex';
  const greeting      = useGreeting(displayName);

  const eyeResult   = useEyeScore(user?.uid ?? undefined);
  const mindResult  = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(user?.uid ?? undefined, user?.isAnonymous ?? true);

  const anyLoading     = eyeResult.loading || mindResult.loading || sleepResult.loading;
  const eyes           = eyeResult.loading   ? 0 : eyeResult.score;
  const sleepScore     = sleepResult.loading  ? 0 : sleepResult.score;
  const mind           = mindResult.loading   ? 0 : mindResult.score;
  const mindPulseScore = anyLoading ? 0 : calculateMindPulseScore({ eyeScore: eyes, sleepScore, mindScore: mind });
  const theme          = pulseScoreTheme(mindPulseScore);
  const focusArea      = getFocusArea(eyes, sleepScore, mind);

  const { insight: homeInsight } = useHomeInsight({
    eye: eyeResult, sleep: sleepResult, mind: mindResult,
    focusArea, mindPulseScore, anyLoading,
  });

  const { tip: dailyTip } = useDailyTip({
    mindPulseScore, eyeScore: eyes, sleepScore, mindScore: mind, focusArea, anyLoading,
  });

  const savedRef = useRef(false);
  useEffect(() => {
    if (anyLoading || !user?.uid || savedRef.current) return;
    savedRef.current = true;
    void saveDailyScore(user.uid, {
      mindPulseScore, eyesScore: eyes, sleepScore, mindScore: mind, savedAt: Date.now(),
    });
  }, [anyLoading, user?.uid, mindPulseScore, eyes, sleepScore, mind]);

  const streak = calculateStreak(sessions);
  const [showOnboardingPaywall, setShowOnboardingPaywall] = useState(false);
  const [showStreakPaywall, setShowStreakPaywall]         = useState(false);

  useEffect(() => {
    if (isPremium || !user?.uid) return;
    let cancelled = false;
    void (async () => {
      const onboardingKey   = `${ONBOARDING_PAYWALL_KEY}:${user.uid}`;
      const onboardingShown = await AsyncStorage.getItem(onboardingKey);
      if (cancelled) return;
      if (!onboardingShown) { setShowOnboardingPaywall(true); return; }
      if (streak < 3) return;
      const streakKey   = `${STREAK_PAYWALL_KEY}:${user.uid}`;
      const streakShown = await AsyncStorage.getItem(streakKey);
      if (cancelled) return;
      if (!streakShown) setShowStreakPaywall(true);
    })();
    return () => { cancelled = true; };
  }, [isPremium, user?.uid, streak]);

  const dismissOnboardingPaywall = () => {
    setShowOnboardingPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${ONBOARDING_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const dismissStreakPaywall = () => {
    setShowStreakPaywall(false);
    if (user?.uid) void AsyncStorage.setItem(`${STREAK_PAYWALL_KEY}:${user.uid}`, '1');
  };
  const goToPremium = () => router.push(ROUTES.appPremium as never);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase();

  // Convert sleep score (0-100) to hours display (e.g. 84 -> "8.4h")
  const sleepHours = sleepScore > 0 ? `${(sleepScore / 10).toFixed(1)}h` : '–';

  return (
    <ScreenShell scroll={true}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <StaggerItem index={0}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 6, marginBottom: 4,
        }}>
          <View>
            <Text style={{
              fontSize: 11, color: 'rgba(245,247,251,0.45)',
              letterSpacing: 0.5,
            }}>
              {dateLabel}
            </Text>
            <Text style={{
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 21, color: '#f6f8fc', marginTop: 3,
            }}>
              {anyLoading ? 'Loading…' : greeting}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SubscriptionBadge />
            <TouchableOpacity
              onPress={() => router.push(ROUTES.appProfile as never)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#7c3aed']}
                style={{
                  width: 42, height: 42, borderRadius: 21,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: 'rgba(59,130,246,0.4)',
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 14, shadowOpacity: 1,
                  elevation: 8,
                }}
              >
                <Text style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 15, color: '#fff',
                }}>
                  {anyLoading ? '…' : displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </StaggerItem>

      {/* ── Wellness Score Card ────────────────────────────────────── */}
      <StaggerItem index={1}>
        <View style={{
          marginTop: 16, marginBottom: 8,
          padding: 18, borderRadius: 22,
          backgroundColor: 'rgba(59,130,246,0.06)',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          flexDirection: 'row', alignItems: 'center', gap: 16,
        }}>
          <ProgressRing
            size={96}
            strokeWidth={8}
            progress={anyLoading ? 0 : mindPulseScore}
            color="#60a5fa"
            value={anyLoading ? '–' : mindPulseScore}
            valueSuffix="SCORE"
            gradient={{
              id: 'scoreG',
              stops: [
                { offset: '0%', color: '#60a5fa' },
                { offset: '100%', color: '#a78bfa' },
              ],
            }}
          />

          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: 15, color: '#f6f8fc',
            }}>
              {anyLoading ? 'Loading…' : theme.label}
            </Text>
            <Text style={{
              fontSize: 11.5, lineHeight: 17,
              color: 'rgba(245,247,251,0.6)',
              marginTop: 4,
            }}>
              {anyLoading
                ? 'Analysing your wellness data…'
                : homeInsight || 'Mind & sleep are trending up. Keep it steady today.'
              }
            </Text>
            {/* Trend badge */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              alignSelf: 'flex-start',
              marginTop: 8,
              paddingHorizontal: 9, paddingVertical: 3,
              borderRadius: 99,
              backgroundColor: 'rgba(52,211,153,0.15)',
              borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)',
            }}>
              <Text style={{
                fontSize: 10, fontWeight: '600',
                color: '#6ee7b7',
              }}>
                ↑ +{streak > 0 ? streak : 6} this week
              </Text>
            </View>
          </View>


        </View>
      </StaggerItem>

      {/* ── Today's Targets ─────────────────────────────────────────── */}
      <StaggerItem index={2}>
        <Text style={{
          fontSize: 10, fontWeight: '600', letterSpacing: 2,
          color: 'rgba(245,247,251,0.42)',
          marginTop: 18, marginBottom: 11, marginLeft: 2,
        }}>
          TODAY'S TARGETS
        </Text>

        {/* Mind */}
        <PillarRow
          icon={<MindIcon />}
          value={anyLoading ? '–' : `${mind}%`}
          label="Mind"
          sublabel="Focus & stress · on track"
          color="#3b82f6"
          progress={anyLoading ? 0 : mind}
          onPress={() => router.push(ROUTES.appRelax as never)}
        />

        {/* Sleep */}
        <PillarRow
          icon={<SleepIcon />}
          value={anyLoading ? '–' : sleepHours}
          label="Sleep"
          sublabel={`Last night · ${sleepScore > 70 ? 'great' : sleepScore > 50 ? 'fair' : 'needs work'} recovery`}
          color="#a78bfa"
          progress={anyLoading ? 0 : sleepScore}
          onPress={() => router.push(`${ROUTES.appSleep}?tab=tonight` as never)}
        />

        {/* Eye */}
        <PillarRow
          icon={<EyeIcon />}
          value={anyLoading ? '–' : `${eyes}%`}
          label="Eye"
          sublabel={`Screen strain · ${eyes < 50 ? 'take a break' : eyes < 70 ? 'moderate' : 'looking good'}`}
          color="#22d3ee"
          progress={anyLoading ? 0 : eyes}
          onPress={() => router.push(ROUTES.appEyeRelax as never)}
        />
      </StaggerItem>

      {/* ── Daily Tip ──────────────────────────────────────────────── */}
      <StaggerItem index={3}>
        <DailyTip tip={dailyTip} focusArea={focusArea} />
      </StaggerItem>

      {/* ── Bottom Nav ─────────────────────────────────────────────── */}
      <StaggerItem index={4}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-around',
          alignItems: 'center',
          paddingVertical: 12, paddingHorizontal: 18,
          marginTop: 20, marginBottom: 4,
          borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(8,10,18,0.5)',
          borderRadius: 20,
        }}>
          <TabItem icon={<HomeIcon active />} label="Home" active />
          <TabItem icon={<TrendsIcon />} label="Trends" />
          <TabItem icon={<TargetsIcon />} label="Targets" />
          <TabItem icon={<ProfileIcon />} label="Profile" />
        </View>
      </StaggerItem>

      <SoftPaywallModal
        visible={showOnboardingPaywall}
        emoji="✨"
        title="Welcome to MindPulse"
        subtitle="Unlock the full toolkit — guided sessions, eye training, and deeper insights — anytime you're ready."
        onUpgrade={() => { dismissOnboardingPaywall(); goToPremium(); }}
        onDismiss={dismissOnboardingPaywall}
      />
      <SoftPaywallModal
        visible={showStreakPaywall}
        emoji="🔥"
        title="You're building momentum"
        subtitle="3 days in a row — unlock the full toolkit to keep your progress going."
        onUpgrade={() => { dismissStreakPaywall(); goToPremium(); }}
        onDismiss={dismissStreakPaywall}
      />
    </ScreenShell>
  );
}
