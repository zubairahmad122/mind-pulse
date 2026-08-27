import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Music, Pause } from 'lucide-react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import { PILLAR_COLORS, RADIUS } from '@/constants/designSystem';

const ACCENT = PILLAR_COLORS.sleep;

// A calming default loop for falling asleep — same bundled ambient tracks
// Relax already uses, just looped continuously instead of session-timed.
const TRACK = BREATHING_MUSIC.find(t => t.id === 'rain')!;

/** One animated equalizer bar — pulses while sound is playing, settles flat when not. */
function EqualizerBar({ index, playing }: { index: number; playing: boolean }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (playing) {
      height.value = withRepeat(
        withTiming(14, { duration: 420 + index * 90, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(4, { duration: 200 });
    }
    return () => cancelAnimation(height);
  }, [playing, index, height]);

  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[styles.bar, style]} />;
}

/**
 * Prominent play/pause control for a looping ambient sleep sound — separate
 * from the "Sounds & Music" row (which only opens alarm/ringtone settings).
 * Loops indefinitely once started; stops itself on unmount.
 */
export function SleepSoundButton() {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
      }
    };
  }, []);

  const toggle = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playing) {
      try { playerRef.current?.pause(); } catch {}
      setPlaying(false);
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      if (!playerRef.current) {
        const player = createAudioPlayer(TRACK.url);
        player.loop = true;
        player.volume = 0.6;
        playerRef.current = player;
      }
      playerRef.current.play();
      setPlaying(true);
    } catch {
      // Audio not available — silently ignore rather than crash a sleep session.
      setPlaying(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => void toggle()}
      activeOpacity={0.85}
      style={[styles.row, playing && styles.rowActive]}
    >
      <View style={[styles.iconWrap, playing && { backgroundColor: ACCENT + '26', borderColor: ACCENT + '45' }]}>
        {playing ? <Pause size={18} color={ACCENT} /> : <Music size={18} color="rgba(255,255,255,0.7)" />}
      </View>
      <Text style={[styles.label, playing && { color: ACCENT }]} numberOfLines={1}>
        {playing ? `Playing ${TRACK.label}` : 'Play Sleep Sounds'}
      </Text>
      {playing && (
        <View style={styles.bars}>
          {[0, 1, 2].map(i => (
            <EqualizerBar key={i} index={i} playing={playing} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowActive: {
    backgroundColor: ACCENT + '12',
    borderColor: ACCENT + '35',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: ACCENT,
  },
});
