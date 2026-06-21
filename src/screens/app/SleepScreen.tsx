import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Bed, Bell, ChevronRight, Clock, Moon, MoonStar, Music, Play, Settings, Sparkles, Star, Sun, Volume2 } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { MoonWave } from '@/components/sleep/MoonWave';
import { HoldButton } from '@/components/sleep/HoldButton';
import { TimePickerModal } from '@/components/sleep/TimePickerModal';
import { BreatheToDismiss } from '@/components/sleep/BreatheToDismiss';
import { SleepQualityModal } from '@/components/sleep/SleepQualityModal';
import { SleepRoutinePanel } from '@/components/sleep/SleepRoutinePanel';
import { GlassCard } from '@/components/ui/GlassCard';
import { SubscriptionBadge } from '@/components/ui/SubscriptionBadge';
import {
  NIGHT_PRESETS,
  ROUTES,
  getPresetById,
  resolvePresetMinutes,
} from '@/constants';
import { ALARM_RINGTONES, getRingtoneRequire } from '@/constants/alarmSounds';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { useAuth } from '@/context/AuthContext';
import { useGreeting } from '@/hooks/useGreeting';
import { usePersistedSleepTracker } from '@/hooks/usePersistedSleepTracker';
import { useSleep } from '@/context/SleepContext';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
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

// ─── Test Alarm Modal ─────────────────────────────────────────────────────────

function TestAlarmModal({
  visible,
  selectedRingtone,
  alarmVolume,
  onDismiss,
}: {
  visible: boolean;
  selectedRingtone: string;
  alarmVolume: number;
  onDismiss: () => void;
}) {
  const ringtone = ALARM_RINGTONES.find(r => r.id === selectedRingtone);
  const RingIcon = ringtone?.icon ?? Bell;
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
        playerRef.current = null;
      }
      return;
    }

    // Start pulse animation
    pulseScale.value = withRepeat(
      withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // Play ringtone
    void setAudioModeAsync({ playsInSilentMode: true });
    try {
      const source = getRingtoneRequire(selectedRingtone);
      const player = createAudioPlayer(source);
      playerRef.current = player;
      player.play();
    } catch {}

    // Auto-dismiss after 5 seconds
    autoDismissRef.current = setTimeout(() => {
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
        playerRef.current = null;
      }
      onDismissRef.current();
    }, 5000);

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
        playerRef.current = null;
      }
    };
  }, [visible, selectedRingtone]);

  const pulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handleDismiss = () => {
    if (playerRef.current) {
      try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
      playerRef.current = null;
    }
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent={false} statusBarTranslucent>
      <View className="flex-1 bg-[#0a0720] items-center justify-center px-6 pb-12 overflow-hidden">
        {/* Glow halo */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: ringtone?.color ?? '#7B61FF',
            top: '22%',
          }, pulseAnim]}
        />

        {/* Top accent arc */}
        <View style={{
          position: 'absolute',
          top: '14%',
          width: '150%',
          height: 100,
          borderRadius: 200,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          backgroundColor: (ringtone?.color ?? '#7B61FF') + '08',
        }} />

        {/* Icon container */}
        <View className="w-24 h-24 rounded-full items-center justify-center mb-5"
          style={{
            backgroundColor: (ringtone?.color ?? '#7B61FF') + '15',
            borderWidth: 1,
            borderColor: (ringtone?.color ?? '#7B61FF') + '30',
          }}
        >
          <RingIcon size={44} color={ringtone?.color ?? '#7B61FF'} strokeWidth={1.5} />
        </View>

        <Text style={{ fontSize: 38, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>Test Alarm</Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{ringtone?.label ?? 'Alarm'}</Text>

        {/* Volume indicator */}
        <View className="flex-row items-center gap-2 mt-6 bg-white/[0.03] px-4 py-2 rounded-full border border-white/10">
          <Volume2 size={14} color="rgba(255,255,255,0.35)" />
          <View className="flex-row gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <View
                key={i}
                className="w-[4px] rounded-full"
                style={{
                  height: 4 + (i % 3) * 3,
                  backgroundColor: i < Math.round(alarmVolume * 10)
                    ? (ringtone?.color ?? '#7B61FF')
                    : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </View>
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.85}
          className="mt-12 w-full max-w-xs flex-row items-center justify-center gap-2.5 py-4 rounded-2xl bg-app-purple"
          style={{
            shadowColor: '#7B61FF',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 20,
            shadowOpacity: 0.5,
            elevation: 8,
          }}
        >
          <Bell size={18} color="#fff" />
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 }}>DISMISS</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12 }}>Auto-dismisses in a moment</Text>
      </View>
    </Modal>
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
  const { width } = useWindowDimensions();
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

  // ── Bedtime / wake selection ──────────────────────────────────────────────
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

  const setupDurationMin = timeDiffMinutes(sliderBedtime, sliderWakeTime);
  const setupDurH = Math.floor(setupDurationMin / 60);
  const setupDurM = setupDurationMin % 60;

  // ── Elapsed timer + live device clock ─────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (tracking && startTime) {
      const tick = () => {
        setElapsed(Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)));
        setClockNow(new Date());
      };
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

  // Live clock parts for the tracking hero.
  const clockHour24 = clockNow.getHours();
  const clockHm = `${String(clockHour24 % 12 === 0 ? 12 : clockHour24 % 12).padStart(2, '0')} : ${String(clockNow.getMinutes()).padStart(2, '0')}`;
  const clockAmPm = clockHour24 < 12 ? 'AM' : 'PM';
  const clockDate = clockNow.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  // ── Alarm state refresh ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => refreshAlarmState(), 1000);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refreshAlarmState();
    });
    return () => { clearInterval(id); sub.remove(); };
  }, [tracking, refreshAlarmState]);

  // ── Alarm settings for test preview ──────────────────────────────────────
  const { selectedRingtone, alarmVolume } = useAlarmSettings();
  const [showTestAlarm, setShowTestAlarm] = useState(false);

  // ── Manual time entry (no dial) ───────────────────────────────────────────
  const [editingTime, setEditingTime] = useState<'bedtime' | 'wake' | null>(null);

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

  const handleSkipRating = useCallback(async () => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setShowRating(false);
    await clearSession();
    setPendingEnd(null);
    actionBusyRef.current = false;
  }, [clearSession]);

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
  // Gentle breathing pulse on the "time asleep" number.
  const timerScale = useSharedValue(1);

  useEffect(() => {
    if (!tracking) {
      cancelAnimation(timerScale);
      timerScale.value = withTiming(1);
    } else {
      timerScale.value = withRepeat(
        withTiming(1.03, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    }
    return () => {
      cancelAnimation(timerScale);
    };
  }, [tracking]);

  const timerScaleAnim = useAnimatedStyle(() => ({ transform: [{ scale: timerScale.value }] }));
  // ── Stats ─────────────────────────────────────────────────────────────────
  const streak = calculateStreak(sessions);
  const avg = avgDuration(sessions);
  const lastSession = sessions[0];

  // ── Render ────────────────────────────────────────────────────────────────

  if (!hydrated) {
    return <SleepSkeleton />;
  }

  return (
    <ScreenShell safeBottom>
      <ScreenTransition>
      <View className="px-1 pt-1 pb-4">
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>Sleep</Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2, maxWidth: 180 }}>{greeting}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <SubscriptionBadge />
            {/* Alarm settings button */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.appAlarmSettings)}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full items-center justify-center bg-white/[0.06] border border-white/10"
            >
              <Settings size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <View style={{ flexShrink: 0 }} className="flex-row items-center gap-1.5 bg-white/[0.06] px-3 py-1.5 rounded-full border border-white/10">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
                {tracking ? 'Tracking' : 'Ready'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab toggle */}
        {!tracking && (
          <View className="flex-row gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#0D1128' }}>
            {([
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
                  className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: active ? 'rgba(123, 97, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                    borderWidth: active ? 1 : 0,
                    borderColor: active ? 'rgba(123, 97, 255, 0.5)' : 'transparent',
                  }}
                >
                  <TabIcon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.35)'} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── TRACKING STATE ─────────────────────────────────────────────────── */}
        {tracking ? (
          <View className="gap-6 pt-2">
            {/* Live device clock */}
            <View className="items-center">
              <View className="flex-row items-end">
                <Text style={{ fontSize: 66, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
                  {clockHm}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: 'rgba(255,255,255,0.85)', marginBottom: 14, marginLeft: 6 }}>{clockAmPm}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{clockDate}</Text>
            </View>

            {/* Moon + drifting golden wave */}
            <MoonWave width={Math.min(width - 48, 340)} />

            {/* Time asleep */}
            <View className="items-center">
              <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: 'rgba(255,255,255,0.35)' }}>TIME ASLEEP</Text>
              <Animated.View style={timerScaleAnim}>
                <Text style={{ fontSize: 34, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'], letterSpacing: 1, marginTop: 4 }}>
                  {formatElapsed(elapsed)}
                </Text>
              </Animated.View>
            </View>

            {/* Alarm + Sounds list cards */}
            <View className="gap-3">
              <View
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(157,138,255,0.15)' }}>
                  <Clock size={18} color="#9d8aff" />
                </View>
                <View className="flex-1">
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Alarm</Text>
                  <Text style={{ fontSize: 12, color: alarmPastDue ? '#FF9800' : 'rgba(255,255,255,0.5)', marginTop: 1, fontWeight: alarmPastDue ? '700' : '500' }}>
                    {wakeAt
                      ? alarmPastDue
                        ? 'Passed — wake when ready'
                        : `${formatWakeTime(wakeAt)} · in ${formatAlarmCountdown(wakeAt)}`
                      : '—'}
                  </Text>
                </View>
                {smartAlarmEnabled && (
                  <View className={`px-2.5 py-0.5 rounded-full border ${stageBadgeClass(sleepStage)}`}>
                    <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.3 }}>{sleepStage}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => router.push(ROUTES.appAlarmSettings)}
                activeOpacity={0.8}
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(79,195,247,0.15)' }}>
                  <Music size={18} color="#4FC3F7" />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Sounds & Music</Text>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            {/* Snooze (only when alarm is past due) */}
            {alarmPastDue && snoozeCount < 3 && (
              <TouchableOpacity
                onPress={handleSnooze}
                disabled={busy}
                activeOpacity={0.75}
                className="self-center flex-row items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/[0.04]"
              >
                <Bell size={16} color="rgba(255,255,255,0.6)" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>Snooze 10 min ({3 - snoozeCount} left)</Text>
              </TouchableOpacity>
            )}

            {/* Wake up — hold to confirm */}
            <View className="items-center">
              <HoldButton label="Wake up" onComplete={handleStop} disabled={busy} bg="#0E1116" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>Hold to wake up</Text>
            </View>
          </View>
        ) : segment === 'tonight' ? (
          <View className="gap-5">
            {/* ── Main Sleep Setup Card ── */}
            <GlassCard style={{ gap: 0 }}>
              {/* Bedtime → Wake (tap a time to set it) */}
              <View className="px-4 pt-5 pb-4">
                <View className="flex-row items-start justify-between">
                  <TouchableOpacity onPress={() => setEditingTime('bedtime')} activeOpacity={0.8} className="items-center flex-1">
                    <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: 'rgba(157,138,255,0.15)' }}>
                      <Moon size={22} color="#9d8aff" />
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)' }}>BEDTIME</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>{formatTimeAmPm(sliderBedtime)}</Text>
                  </TouchableOpacity>

                  <View className="items-center px-2" style={{ paddingTop: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#9d8aff', letterSpacing: 0.5 }}>
                      {setupDurH}h{setupDurM > 0 ? ` ${setupDurM}m` : ''}
                    </Text>
                    <View style={{ width: 44, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 6 }} />
                    <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>OF SLEEP</Text>
                  </View>

                  <TouchableOpacity onPress={() => setEditingTime('wake')} activeOpacity={0.8} className="items-center flex-1">
                    <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: 'rgba(79,195,247,0.15)' }}>
                      <Sun size={22} color="#4FC3F7" />
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)' }}>WAKE</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>{formatTimeAmPm(sliderWakeTime)}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 12 }}>Tap a time to change it</Text>
              </View>

              <View className="h-px bg-white/[0.06]" />
              <View style={{ height: 12 }} />

              {/* Duration presets row */}
              <View className="flex-row gap-2 justify-center px-2 pb-4">
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
                        const now = new Date();
                        const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        setSliderBedtime(nowStr);
                        setSliderWakeTime(addMinutesToTime(nowStr, mins));
                      }}
                      activeOpacity={0.75}
                      className={`flex-1 items-center py-3 rounded-xl border ${
                        active
                          ? 'bg-[#7B61FF]/15 border-[#7B61FF]/60'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <PresetIcon size={16} color={active ? '#9d8aff' : 'rgba(255,255,255,0.4)'} />
                      <Text style={{ fontSize: 12, fontWeight: '800', marginTop: 4, color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}>
                        {p.label}
                      </Text>
                      <Text style={{ fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 2, color: active ? '#9d8aff' : 'rgba(255,255,255,0.3)' }}>
                        {p.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Divider */}
              <View className="h-px bg-white/[0.06]" />

              {/* Smart alarm toggle (inline, compact) */}
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-7 h-7 rounded-full bg-app-purple/20 items-center justify-center">
                    <Bell size={13} color="#9d8aff" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Smart Alarm</Text>
                  {smartAlarmEnabled && (
                    <View className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <Text style={{ fontSize: 8, fontWeight: '700', color: '#34d399', letterSpacing: 0.5 }}>On</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-1.5">
                  <TouchableOpacity
                    onPress={() => setShowTestAlarm(true)}
                    activeOpacity={0.7}
                    className="w-7 h-7 rounded-full items-center justify-center bg-white/[0.04] border border-white/10"
                  >
                    <Play size={11} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(ROUTES.appAlarmSettings)}
                    activeOpacity={0.7}
                    className="w-7 h-7 rounded-full items-center justify-center bg-white/[0.04] border border-white/10"
                  >
                    <Settings size={11} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                  <ToggleSwitch value={smartAlarmEnabled} onToggle={() => setSmartAlarmEnabled(!smartAlarmEnabled)} />
                </View>
              </View>

              {/* Divider */}
              <View className="h-px bg-white/[0.06]" />

              {/* Start Sleep CTA */}
              <View className="p-4">
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
                  <MoonStar size={20} color="#fff" />
                  <View className="items-start">
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2 }}>START SLEEP</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>
                      Wake at {formatTimeAmPm(sliderWakeTime)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </GlassCard>

            {/* Stats row — compact text */}              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 }}>
              {lastSession?.durationMinutes != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#9d8aff' }} />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    Last: <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{formatDuration(lastSession.durationMinutes)}</Text>
                  </Text>
                </View>
              )}
              {avg > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4FC3F7' }} />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    Avg: <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{formatDuration(avg)}</Text>
                  </Text>
                </View>
              )}
              {streak >= 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9800' }} />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{streak}d</Text> streak
                  </Text>
                </View>
              )}
            </View>
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
          onSkip={handleSkipRating}
        />

        <TestAlarmModal
          visible={showTestAlarm}
          selectedRingtone={selectedRingtone}
          alarmVolume={alarmVolume}
          onDismiss={() => setShowTestAlarm(false)}
        />

        {/* Manual time picker for the Bedtime / Wake cards */}
        <TimePickerModal
          visible={editingTime !== null}
          title={editingTime === 'wake' ? 'Set wake time' : 'Set bedtime'}
          accent={editingTime === 'wake' ? '#4FC3F7' : '#9d8aff'}
          initialTime={editingTime === 'wake' ? sliderWakeTime : sliderBedtime}
          onCancel={() => setEditingTime(null)}
          onConfirm={time => {
            if (editingTime === 'wake') {
              setSliderWakeTime(time);
            } else if (editingTime === 'bedtime') {
              setSliderBedtime(time);
            }
            setEditingTime(null);
          }}
        />
      </View>
      </ScreenTransition>
    </ScreenShell>
  );
}
