import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Bed, Bell, ChevronRight, Clock, Flame, Moon, MoonStar, RefreshCw, Settings, Sparkles, Star, Sun } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { CircularSleepSlider } from '@/components/sleep/CircularSleepSlider';
import { BreatheToDismiss } from '@/components/sleep/BreatheToDismiss';
import { SleepQualityModal } from '@/components/sleep/SleepQualityModal';
import { SleepRoutinePanel } from '@/components/sleep/SleepRoutinePanel';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  COLORS,
  NIGHT_PRESETS,
  ROUTES,
  getPresetById,
  resolvePresetMinutes,
  streakEncouragementMessage,
} from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useGreeting } from '@/hooks/useGreeting';
import { usePersistedSleepTracker } from '@/hooks/usePersistedSleepTracker';
import { useSleep } from '@/context/SleepContext';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { formatWakeTime } from '@/services/sleepAlarm';
import { avgDuration, calculateStreak, formatDuration, formatElapsed } from '@/utils/sleepUtils';
import { formatAlarmCountdown, formatPresetDuration } from '@/utils/sleepDisplay';
import type { SleepPreset } from '@/constants/sleepSessions';
import type { SleepStage } from '@/services/accelerometerSleepTracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Add minutes to a "HH:MM" time string, wrapping around 24h. */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Format a "HH:MM" string to a short 12h display like "6:30 AM". */
function formatTimeAmPm(wakeTime: string): string {
  const [h, m] = wakeTime.split(':').map(Number);
  const hh24 = h % 24;
  const hour12 = hh24 === 0 ? 12 : hh24 > 12 ? hh24 - 12 : hh24;
  const ampm = hh24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Calculate minutes between two "HH:MM" times, wrapping overnight if needed. */
function timeDiffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff <= 0) diff += 1440;
  return diff;
}

function stageBadgeClass(stage: SleepStage): string {
  if (stage === 'light') return 'bg-emerald-500/20 border-emerald-500/40';
  if (stage === 'rem') return 'bg-sky-400/20 border-sky-400/40';
  return 'bg-purple-500/20 border-purple-500/40';
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({
  lastMinutes,
  avgMinutes,
  streakDays,
  message,
}: {
  lastMinutes?: number;
  avgMinutes: number;
  streakDays: number;
  message: string;
}) {
  const STAT_CARDS = [
    { key: 'last', label: 'Last night', icon: 'moon', color: '#9d8aff' },
    { key: 'avg', label: 'Average', icon: 'clock', color: '#4FC3F7' },
    { key: 'streak', label: 'Streak', icon: 'flame', color: '#FF9800' },
  ];

  const statValues: Record<string, string> = {
    last: lastMinutes ? formatDuration(lastMinutes) : '—',
    avg: avgMinutes > 0 ? formatDuration(avgMinutes) : '—',
    streak: `${streakDays}d`,
  };

  const iconMap: Record<string, typeof Moon> = {
    moon: Moon,
    clock: Clock,
    flame: Flame,
  };

  return (
    <View className="mt-4">
      <View className="flex-row gap-2.5">
        {STAT_CARDS.map(s => {
          const StatIcon = iconMap[s.icon];
          return (
            <View key={s.key} className="flex-1">
              <View className="rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Gradient header bar */}
                <View style={{ backgroundColor: s.color + '18', height: 3 }} />
                <View className="bg-white/[0.03] px-3 py-3 items-center gap-1.5">
                  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <StatIcon size={14} color={s.color} />
                  </View>
                  <Text className="text-[9px] font-bold text-white/40 uppercase tracking-[1]">
                    {s.label}
                  </Text>
                  <Text className="text-lg font-extrabold text-white" style={{ lineHeight: 22 }}>
                    {statValues[s.key]}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View className="flex-row items-center justify-center gap-2 mt-3">
        <View className="w-1 h-1 rounded-full bg-[#9d8aff]" />
        <Text className="text-[12px] text-white/40 text-center leading-[18px] flex-1">{message}</Text>
        <View className="w-1 h-1 rounded-full bg-[#9d8aff]" />
      </View>
    </View>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      className={`w-12 h-7 rounded-full p-0.5 justify-center border ${
        value ? 'bg-app-purple border-app-purple' : 'bg-white/[0.06] border-white/10'
      }`}
    >
      <View className={`w-[22px] h-[22px] rounded-full bg-white shadow-sm ${value ? 'self-end' : 'self-start'}`} />
    </TouchableOpacity>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SleepSkeleton() {
  const pulseSV = useSharedValue(0.3);

  useEffect(() => {
    pulseSV.value = withRepeat(
      withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulseSV);
  }, []);

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: pulseSV.value,
  }));

  function Block({ w, h, r = 12, style }: { w: number | string; h: number; r?: number; style?: any }) {
    return (
      <Animated.View
        style={[{
          width: w as any,
          height: h,
          borderRadius: r,
          backgroundColor: 'rgba(255,255,255,0.07)',
        }, pulseAnim, style]}
      />
    );
  }

  function Circle({ size }: { size: number }) {
    return (
      <Animated.View
        style={[{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.07)',
        }, pulseAnim]}
      />
    );
  }

  function GlassSkeleton({ children, style }: { children: React.ReactNode; style?: any }) {
    return (
      <View style={[{
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 16,
      }, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScreenShell>
      <View className="px-1 pt-1 pb-4">
        {/* Header */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between">
            <Block w={90} h={32} r={8} />
            <Block w={70} h={26} r={20} />
          </View>
          <Block w={160} h={16} r={6} style={{ marginTop: 8 }} />
        </View>

        {/* Tab toggle */}
        <View className="flex-row gap-2 mb-5 p-1">
          <Block w="50%" h={38} r={10} />
          <Block w="50%" h={38} r={10} />
        </View>

        {/* Start sleep button */}
        <View className="items-center justify-center py-2">
          <Circle size={196} />
        </View>

        {/* Info text */}
        <Block w={240} h={14} r={4} style={{ alignSelf: 'center', marginTop: 4, marginBottom: 16 }} />

        {/* Circular slider card */}
        <GlassSkeleton style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Circle size={200} />
          {/* Time labels row */}
          <View className="flex-row justify-between w-full mt-4 px-2">
            <View className="items-center gap-1.5">
              <Block w={14} h={14} r={7} />
              <Block w={40} h={10} r={3} />
              <Block w={60} h={18} r={4} />
            </View>
            <View className="items-center gap-1.5">
              <Block w={14} h={14} r={7} />
              <Block w={40} h={10} r={3} />
              <Block w={60} h={18} r={4} />
            </View>
            <View className="items-center gap-1.5">
              <Block w={14} h={14} r={7} />
              <Block w={40} h={10} r={3} />
              <Block w={60} h={18} r={4} />
            </View>
          </View>
        </GlassSkeleton>

        {/* Duration section header */}
        <View className="flex-row items-center gap-2 px-1 mt-2">
          <Block w={14} h={14} r={7} />
          <Block w={60} h={11} r={3} />
          <View className="flex-1 h-px bg-white/[0.04]" />
        </View>

        {/* Preset cards */}
        <View className="flex-row gap-2.5 justify-center mt-3">
          {[1, 2, 3, 4].map(i => (
            <View key={i} className="flex-1 items-center py-3 rounded-2xl bg-white/[0.03] gap-1.5">
              <Block w={20} h={20} r={10} />
              <Block w={32} h={14} r={4} />
              <Block w={36} h={10} r={3} />
            </View>
          ))}
        </View>

        {/* Smart alarm toggle */}
        <GlassSkeleton style={{ marginTop: 12 }}>
          <View className="flex-row items-center gap-3">
            <Block w={28} h={28} r={14} />
            <View className="flex-1 gap-1.5">
              <Block w={140} h={14} r={4} />
              <Block w={180} h={10} r={3} />
            </View>
            <Block w={48} h={28} r={14} />
          </View>
        </GlassSkeleton>

        {/* AI insight card */}
        <GlassSkeleton style={{ marginTop: 12 }}>
          <View className="flex-row items-center gap-1.5">
            <Block w={14} h={14} r={7} />
            <Block w={70} h={11} r={3} />
          </View>
          <Block w="100%" h={14} r={4} style={{ marginTop: 10 }} />
          <Block w="75%" h={14} r={4} style={{ marginTop: 6 }} />
        </GlassSkeleton>

        {/* Stats row */}
        <View className="flex-row gap-2.5 mt-4">
          {[1, 2, 3].map(i => (
            <View key={i} className="flex-1 rounded-2xl bg-white/[0.03] overflow-hidden">
              <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <View className="px-3 py-3 items-center gap-2">
                <Block w={14} h={14} r={7} />
                <Block w={36} h={10} r={3} />
                <Block w={40} h={20} r={4} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type SleepSegment = 'tonight' | 'routine';

type Params = { tab?: string; preset?: string };

export default function SleepScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Sleeper';
  const greeting = useGreeting(displayName);
  const { sessions, addSession } = useSleep();
  const { schedule } = useSleepSchedule(user?.uid);

  // ── Default preset ────────────────────────────────────────────────────────
  const defaultNight = NIGHT_PRESETS.find(p => p.id === 'night-7.5') ?? NIGHT_PRESETS[2];
  const initialPreset =
    (params.preset && getPresetById(params.preset)) || defaultNight;

  const tracker = usePersistedSleepTracker({
    uid: user?.uid,
    defaultPreset: initialPreset,
  });

  const {
    hydrated,
    busy,
    selectedPreset,
    setSelectedPreset,
    tracking,
    alarmPastDue,
    startTime,
    wakeAt,
    startSleep,
    stopSleep,
    snooze,
    clearSession,
    refreshAlarmState,
    smartAlarmEnabled,
    setSmartAlarmEnabled,
    sleepStage,
  } = tracker;

  // ── Tab state ─────────────────────────────────────────────────────────────
  const initialTab: SleepSegment = params.tab === 'routine' ? 'routine' : 'tonight';
  const [segment, setSegment] = useState<SleepSegment>(initialTab);

  useEffect(() => {
    if (params.tab === 'routine') setSegment('routine');
    if (params.tab === 'tonight') setSegment('tonight');
  }, [params.tab]);

  useEffect(() => {
    if (tracker.tracking) setSegment('tonight');
  }, [tracker.tracking]);

  // ── Circular slider state ─────────────────────────────────────────────────
  const defaultBedtime = schedule?.bedtime ?? '23:00';
  const defaultWake = schedule?.wakeTime ?? '06:30';
  const [sliderBedtime, setSliderBedtime] = useState(defaultBedtime);
  const [sliderWakeTime, setSliderWakeTime] = useState(defaultWake);

  useEffect(() => {
    if (schedule) {
      setSliderBedtime(schedule.bedtime);
      setSliderWakeTime(schedule.wakeTime);
    }
  }, [schedule]);

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (tracking && startTime) {
      const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tracking, startTime, hydrated]);

  // ── Alarm state refresh ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => refreshAlarmState(), 1000);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refreshAlarmState();
    });
    return () => { clearInterval(id); sub.remove(); };
  }, [tracking, refreshAlarmState]);

  // ── Breathing & Rating ────────────────────────────────────────────────────
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(3);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);
  const actionBusyRef = useRef(false);

  const handleStartSleep = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    // Use the slider's actual wake time instead of the preset duration
    const sliderMinutes = timeDiffMinutes(sliderBedtime, sliderWakeTime);
    const wakeTimeLabel = `Sleep until ${formatTimeAmPm(sliderWakeTime)}`;
    const ok = await startSleep(
      sliderMinutes,
      wakeTimeLabel,
      selectedPreset.id,
    );
    actionBusyRef.current = false;
    if (ok) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [busy, sliderBedtime, sliderWakeTime, selectedPreset, startSleep]);

  const handleStop = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    setShowBreathing(true);
    actionBusyRef.current = false;
  }, [busy]);

  const handleSnooze = useCallback(async () => {
    if (snoozeCount >= 3 || busy) return;
    await snooze();
    setSnoozeCount(prev => prev + 1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [snooze, snoozeCount, busy]);

  const handleBreathingComplete = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    await stopSleep();
    setPendingEnd(new Date());
    setSelectedQuality(3);
    setShowBreathing(false);
    setShowRating(true);
    actionBusyRef.current = false;
  }, [busy, stopSleep]);

  const handleSaveSession = useCallback(async () => {
    if (actionBusyRef.current || !startTime || !pendingEnd) return;
    actionBusyRef.current = true;
    const durationMinutes = Math.round((pendingEnd.getTime() - startTime.getTime()) / 60000);
    if (durationMinutes >= 1) {
      try {
        await addSession({
          date: startTime.toISOString().slice(0, 10),
          startTime: startTime.getTime(),
          endTime: pendingEnd.getTime(),
          durationMinutes,
          quality: selectedQuality,
        });
      } catch { /* shown by context */ }
    }
    setShowRating(false);
    await clearSession();
    setPendingEnd(null);
    actionBusyRef.current = false;
  }, [addSession, clearSession, pendingEnd, selectedQuality, startTime]);

  // ── Animations ────────────────────────────────────────────────────────────
  const wakePulseScale = useSharedValue(1);
  const wakePulseOpacity = useSharedValue(0.7);

  useEffect(() => {
    if (!tracking) {
      cancelAnimation(wakePulseScale);
      cancelAnimation(wakePulseOpacity);
      wakePulseOpacity.value = withTiming(0);
      wakePulseScale.value = withTiming(1);
    } else {
      wakePulseScale.value = withRepeat(
        withTiming(1.35, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false,
      );
      wakePulseOpacity.value = withRepeat(
        withTiming(0, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false,
      );
    }
    return () => {
      cancelAnimation(wakePulseScale);
      cancelAnimation(wakePulseOpacity);
    };
  }, [tracking]);

  const wakePulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: wakePulseScale.value }],
    opacity: wakePulseOpacity.value,
  }));

  // ── Stats ─────────────────────────────────────────────────────────────────
  const streak = calculateStreak(sessions);
  const avg = avgDuration(sessions);
  const lastSession = sessions[0];

  function sleepRecommendation(): string {
    if (!lastSession) return 'Start your first sleep session tonight to get personalized insights.';
    const mins = lastSession.durationMinutes;
    const qual = lastSession.quality ?? 3;
    if (mins < 300) return `Last night you only got ${Math.floor(mins / 60)}h ${mins % 60}m. Aim for at least 7 hours tonight.`;
    if (qual <= 2) return `Your sleep quality was poor (${qual}/5). Try Box Breathing before bed to lower stress.`;
    if (streak >= 7) return `${streak}-day streak! Keep going — consistency is the key to deep sleep.`;
    if (avg && avg < 390) return `Your average sleep is ${Math.floor(avg / 60)}h ${Math.round(avg % 60)}m. Try going to bed 30 min earlier.`;
    return 'Your sleep is on track. Maintain your schedule for best results.';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!hydrated) {
    return <SleepSkeleton />;
  }

  return (
    <ScreenShell safeBottom>
      <View className="px-1 pt-1 pb-4">
        {/* Night sky atmospheric header */}
        <View className="mb-5 relative overflow-hidden">
          {/* Ambient glow behind header */}
          <View className="absolute -top-10 -left-6 w-36 h-36 rounded-full bg-[#7B61FF]/10" />
          <View className="absolute -top-6 -right-8 w-28 h-28 rounded-full bg-[#4FC3F7]/8" />
          <View className="absolute top-4 left-20 w-2 h-2 rounded-full bg-white/30" />
          <View className="absolute top-2 right-28 w-1.5 h-1.5 rounded-full bg-white/20" />
          <View className="absolute top-8 right-16 w-1 h-1 rounded-full bg-white/15" />

          <View className="relative z-10 flex-row items-center justify-between">
            <View className="flex-row items-end gap-2">
              <Text className="text-[30px] font-extrabold text-white tracking-tight">Sleep</Text>
              <View className="mb-1.5">
                <Text className="text-[11px] font-semibold text-white/30 tracking-[0.5]" style={{ lineHeight: 14 }}>
                  {schedule ? `${schedule.bedtime} — ${schedule.wakeTime}` : ''}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {/* Alarm settings button */}
              <TouchableOpacity
                onPress={() => router.push(ROUTES.appAlarmSettings)}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full items-center justify-center bg-white/[0.04] border border-white/10"
              >
                <Settings size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/10">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <Text className="text-[11px] font-semibold text-white/50 tracking-[0.5]">
                  {tracking ? 'Tracking' : 'Ready'}
                </Text>
              </View>
            </View>
          </View>
          <Text className="text-[15px] text-white/60 mt-1 relative z-10">{greeting}</Text>
        </View>

        {/* Tab toggle */}
        {!tracking && (
          <View className="flex-row gap-2 mb-5 p-1 rounded-xl bg-white/[0.03] border border-white/10">              {([
              { id: 'tonight' as const, label: 'Tonight', icon: Moon, iconFocused: MoonStar },
              { id: 'routine' as const, label: 'My Routine', icon: Clock },
            ]).map(tab => {
              const active = segment === tab.id;
              const TabIcon = active && tab.iconFocused ? tab.iconFocused : tab.icon;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setSegment(tab.id)}
                  activeOpacity={0.85}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${
                    active ? 'bg-[#7B61FF]/20 border border-[#7B61FF]/50' : ''
                  }`}
                >
                  <TabIcon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.35)'} />
                  <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-white/40'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── TRACKING STATE ─────────────────────────────────────────────────── */}
        {tracking ? (
          <View className="items-center gap-5">
            {/* Alarm card */}
            <GlassCard style={{ alignSelf: 'stretch', alignItems: 'center', gap: 6 }}>
              <Text className="text-[10px] font-bold tracking-[1] text-app-blue uppercase">Wake alarm</Text>
              <Text className="text-[28px] font-extrabold text-white">{wakeAt ? formatWakeTime(wakeAt) : '—'}</Text>
              <Text className={`text-[14px] text-center ${alarmPastDue ? 'text-app-gold font-bold' : 'text-white/60'}`}>
                {alarmPastDue
                  ? 'Alarm time passed — tap WAKE UP when you are ready'
                  : `Rings in ${wakeAt ? formatAlarmCountdown(wakeAt) : '—'}`}
              </Text>
              <Text className="text-[12px] text-app-purple-light font-semibold">
                {selectedPreset.emoji} {selectedPreset.label} · {formatPresetDuration(selectedPreset, schedule?.duration)}
              </Text>

              {smartAlarmEnabled && (
                <View className="flex-row items-center gap-2 mt-2 bg-white/[0.02] px-4 py-2.5 rounded-xl border border-white/10">
                  <Text className="text-[11px] text-white/50 uppercase tracking-[0.5]">Sleep Stage:</Text>
                  <View className={`px-2.5 py-0.5 rounded-md border ${stageBadgeClass(sleepStage)}`}>
                    <Text className="text-[11px] text-white font-bold tracking-[0.5] uppercase">{sleepStage}</Text>
                  </View>
                </View>
              )}

              <Text className="text-[13px] font-bold text-app-gold text-center mt-2 leading-[20px] bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                Keep the "Sleep alarm armed" notification. Press Home — do not swipe away.
              </Text>
            </GlassCard>

            {/* Timer */}
            <GlassCard style={{ alignSelf: 'stretch', alignItems: 'center', padding: 20 }}>
              <Text className="text-[10px] font-bold tracking-[1.5] text-white/40 uppercase">Time asleep</Text>
              <Text className="text-[48px] font-extrabold text-white mt-1 font-mono">{formatElapsed(elapsed)}</Text>
            </GlassCard>

            {/* Wake button */}
            <View className="w-[220px] h-[220px] items-center justify-center">
              <Animated.View
                pointerEvents="none"
                style={[wakePulseAnim, {
                  position: 'absolute',
                  width: 184,
                  height: 184,
                  borderRadius: 92,
                  borderWidth: 2,
                  borderColor: '#FF9800',
                }]}
              />
              <View className="w-[184px] h-[184px] rounded-full border-2 items-center justify-center" style={{ borderColor: '#c77a00' }}>
                <TouchableOpacity
                  onPress={handleStop}
                  disabled={busy}
                  activeOpacity={0.8}
                  className={`w-[124px] h-[124px] rounded-full items-center justify-center gap-1 ${busy ? 'opacity-55' : ''}`}
                  style={{ backgroundColor: '#FF9800' }}
                >
                  <Sun size={32} color="#0a0720" strokeWidth={2.5} />
                  <Text className="text-[13px] font-extrabold tracking-[2]" style={{ color: '#0a0720' }}>WAKE UP</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Snooze button — only when alarm is past due and snoozes remain */}
            {alarmPastDue && snoozeCount < 3 && (
              <TouchableOpacity
                onPress={handleSnooze}
                disabled={busy}
                activeOpacity={0.75}
                className="flex-row items-center gap-2 px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <Bell size={18} color="rgba(255,255,255,0.6)" />
                <Text className="text-[15px] font-bold text-white/70">Snooze 10 min</Text>
                <Text className="text-[11px] text-white/30 ml-1">
                  ({3 - snoozeCount} left)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : segment === 'tonight' ? (
          <View className="gap-5">
            {/* Circular slider */}
            <GlassCard style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 }}>
              <CircularSleepSlider
                bedtime={sliderBedtime}
                wakeTime={sliderWakeTime}
                onChange={(bed, wake) => {
                  setSliderBedtime(bed);
                  setSliderWakeTime(wake);
                }}
                size={280}
              />
              {/* Sync button - reset to schedule */}
              {schedule && (
                <TouchableOpacity
                  onPress={() => {
                    setSliderBedtime(schedule.bedtime);
                    setSliderWakeTime(schedule.wakeTime);
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10"
                >
                  <RefreshCw size={12} color="rgba(255,255,255,0.4)" />
                  <Text className="text-[11px] text-white/40 font-medium">Reset to schedule</Text>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View className="w-full h-px bg-white/[0.06] my-3" />

              {/* Start sleep button inside card */}
              <TouchableOpacity
                onPress={handleStartSleep}
                disabled={busy}
                activeOpacity={0.8}
                className={`w-full flex-row items-center justify-center gap-3 py-3.5 rounded-2xl ${
                  busy ? 'opacity-55' : ''
                } bg-app-purple`}
                style={{
                  shadowColor: '#7B61FF',
                  shadowOffset: { width: 0, height: 0 },
                  shadowRadius: 16,
                  shadowOpacity: busy ? 0 : 0.4,
                  elevation: 6,
                }}
              >
                <View className="w-9 h-9 items-center justify-center">
                  <MoonStar size={22} color="#fff" />
                </View>
                <View className="items-start">
                  <Text className="text-[15px] font-extrabold text-white tracking-[2]">START SLEEP</Text>
                  <Text className="text-[9px] font-bold text-white/50 uppercase tracking-[1.5]">
                    Wake at {formatTimeAmPm(sliderWakeTime)}
                  </Text>
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </GlassCard>

            {/* Quick duration presets */}
            <View className="gap-3">
              <View className="flex-row items-center gap-2 px-1">
                <Clock size={14} color="rgba(255,255,255,0.4)" />
                <Text className="text-[11px] font-bold text-white/40 uppercase tracking-[1.5]">Duration</Text>
                <View className="flex-1 h-px bg-white/[0.06]" />
              </View>
              <View className="flex-row gap-2.5 justify-center">
                {[
                  { id: 'night-7', label: '7h', icon: Moon, sub: 'Min' },
                  { id: 'night-7.5', label: '7.5h', icon: Star, sub: 'Sweet' },
                  { id: 'night-8', label: '8h', icon: Sparkles, sub: 'Optimal' },
                  { id: 'night-9', label: '9h', icon: Bed, sub: 'Extra' },
                ].map(p => {
                  const PresetIcon = p.icon;
                  const preset = getPresetById(p.id) as SleepPreset;
                  const active = selectedPreset.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedPreset(preset);
                        const mins = resolvePresetMinutes(preset, schedule?.duration);
                        // Set bedtime to current time so the slider shows "now → now + duration"
                        const now = new Date();
                        const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        setSliderBedtime(nowStr);
                        setSliderWakeTime(addMinutesToTime(nowStr, mins));
                      }}
                      activeOpacity={0.75}
                      className={`flex-1 items-center py-3.5 rounded-2xl border ${
                        active
                          ? 'bg-[#7B61FF]/15 border-[#7B61FF]/60'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <PresetIcon size={18} color={active ? '#9d8aff' : 'rgba(255,255,255,0.4)'} />
                      <Text className={`text-[13px] font-extrabold mt-1 ${active ? 'text-white' : 'text-white/60'}`}>
                        {p.label}
                      </Text>
                      <Text className={`text-[9px] font-bold uppercase tracking-[1] mt-0.5 ${
                        active ? 'text-[#9d8aff]' : 'text-white/30'
                      }`}>
                        {p.sub}
                      </Text>
                      {/* Active indicator pill */}
                      {active && (
                        <View style={{ position: 'absolute', top: -1, alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#7B61FF', borderRadius: 10 }}>
                          <Text className="text-[8px] font-bold text-white tracking-[0.5]">SELECTED</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Smart alarm toggle */}
            <GlassCard style={{ gap: 0 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-full bg-app-purple/20 items-center justify-center">
                      <Bell size={14} color="#9d8aff" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[13px] font-bold text-white">Smart Stage Alarm</Text>
                        {smartAlarmEnabled && (
                          <View className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                            <Text className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.5]">On</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px] text-white/50 leading-[14px] mt-0.5">
                        Wakes you gently during light sleep
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <TouchableOpacity
                    onPress={() => router.push(ROUTES.appAlarmSettings)}
                    activeOpacity={0.7}
                    className="w-8 h-8 rounded-full items-center justify-center bg-white/[0.04] border border-white/10"
                  >
                    <Settings size={13} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                  <ToggleSwitch value={smartAlarmEnabled} onToggle={() => setSmartAlarmEnabled(!smartAlarmEnabled)} />
                </View>
              </View>
              {/* Configure link */}
              <TouchableOpacity
                onPress={() => router.push(ROUTES.appAlarmSettings)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between mt-2.5 pt-2.5 border-t border-white/[0.06]"
              >
                <View className="flex-row items-center gap-1.5">
                  <Settings size={11} color="rgba(255,255,255,0.25)" />
                  <Text className="text-[11px] text-white/35 font-medium">Ringtone, vibration & more</Text>
                </View>
                <ChevronRight size={13} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </GlassCard>

            {/* AI recommendation */}
            <View className="relative overflow-hidden rounded-2xl border border-app-purple/20 bg-app-purple/[0.06] px-4 py-3.5">
              {/* Decorative gradient dot */}
              <View className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-app-purple/10" />
              <View className="relative z-10">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Sparkles size={14} color="#9d8aff" />
                  <Text className="text-[11px] font-bold text-[#9d8aff] tracking-[0.5] uppercase">Tip</Text>
                </View>
                <Text className="text-[14px] text-white/80 leading-[20px]">{sleepRecommendation()}</Text>
              </View>
            </View>

            {/* Stats row */}
            <StatsRow
              lastMinutes={lastSession?.durationMinutes}
              avgMinutes={avg}
              streakDays={streak}
              message={streakEncouragementMessage(streak)}
            />

          </View>
        ) : (
          /* ── ROUTINE TAB ────────────────────────────────────────────────── */
          <SleepRoutinePanel />
        )}

        {/* Modals */}
        <Modal visible={showBreathing} animationType="fade" statusBarTranslucent>
          <BreatheToDismiss
            onComplete={handleBreathingComplete}
            onEmergencySkip={handleBreathingComplete}
          />
        </Modal>

        <SleepQualityModal
          visible={showRating}
          selectedQuality={selectedQuality}
          onSelectQuality={setSelectedQuality}
          onSave={handleSaveSession}
        />
      </View>
    </ScreenShell>
  );
}
