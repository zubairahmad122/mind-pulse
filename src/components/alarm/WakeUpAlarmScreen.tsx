import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRingtoneRequire } from '@/constants/alarmSounds';
import { HoldButton } from '@/components/sleep/HoldButton';

type Props = {
  visible: boolean;
  label?: string;
  /** Long-press WAKE UP dismisses the alarm. */
  onWake: () => void;
  /** Tap SNOOZE (optional — hidden when not provided). */
  onSnooze?: () => void;
  /** Play the alarm tone while shown (default true). */
  playSound?: boolean;
  ringtoneId?: string;
  volume?: number;
};

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good Morning!';
  if (hour < 17) return 'Good Afternoon!';
  if (hour < 21) return 'Good Evening!';
  return 'Good Night!';
}

function parts(now: Date) {
  const h24 = now.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    greeting: greetingFor(h24),
    hh: String(h12).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
    ampm: h24 < 12 ? 'AM' : 'PM',
    date: now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

export function WakeUpAlarmScreen({
  visible,
  label,
  onWake,
  onSnooze,
  playSound = true,
  ringtoneId = 'morning-alarm',
  volume = 1,
}: Props) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => new Date());
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // ── Live real-device clock — ticks every second ──────────────────────────
  useEffect(() => {
    if (!visible) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  // ── Alarm tone (looped) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !playSound) return;
    void setAudioModeAsync({ playsInSilentMode: true });
    try {
      const player = createAudioPlayer(getRingtoneRequire(ringtoneId));
      player.loop = true;
      player.volume = volume;
      player.play();
      playerRef.current = player;
    } catch {
      /* tone is best-effort */
    }
    return () => {
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
        playerRef.current = null;
      }
    };
  }, [visible, playSound, ringtoneId, volume]);

  const stopTone = () => {
    if (playerRef.current) {
      try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
      playerRef.current = null;
    }
  };

  const handleWake = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopTone();
    onWake();
  };

  const handleSnooze = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopTone();
    onSnooze?.();
  };

  const p = parts(now);

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={handleWake}>
      <LinearGradient
        colors={['#2B6CB0', '#4A90D9', '#7FB5E6', '#A9D0F0']}
        locations={[0, 0.4, 0.72, 1]}
        style={{ flex: 1 }}
      >
        {/* Soft sun glow */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '6%',
            alignSelf: 'center',
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        {/* Cloud puffs */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: '24%', left: -40, width: 220, height: 90, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: '30%', right: -30, width: 180, height: 80, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.25)' }} />

        <View style={{ flex: 1, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 28, paddingHorizontal: 28 }}>
          {/* Greeting + live clock */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 8 }}>
              {p.greeting}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
              <Text style={{ fontSize: 92, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.15)', textShadowRadius: 10 }}>
                {p.hh} : {p.mm}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 18, marginLeft: 6 }}>{p.ampm}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>{p.date}</Text>
            {label ? (
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 14, textAlign: 'center' }}>{label}</Text>
            ) : null}
          </View>

          <View style={{ flex: 1 }} />

          {/* Actions */}
          {onSnooze ? (
            <TouchableOpacity
              onPress={handleSnooze}
              activeOpacity={0.85}
              style={{ backgroundColor: '#0E1116', paddingVertical: 20, borderRadius: 36, alignItems: 'center', marginBottom: 14 }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2 }}>SNOOZE</Text>
            </TouchableOpacity>
          ) : null}

          <HoldButton
            label="WAKE UP"
            onComplete={handleWake}
            bg="#FFFFFF"
            fill="rgba(20,30,45,0.16)"
            textColor="#0E1116"
          />

          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 14 }}>
            Hold to wake up
          </Text>
        </View>
      </LinearGradient>
    </Modal>
  );
}
