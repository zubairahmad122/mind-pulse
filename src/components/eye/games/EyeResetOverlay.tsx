import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const C = {
  bg:    'rgba(8,6,22,0.97)',
  card:  '#1a1535',
  green: '#6ee7b7',
  text:  '#ffffff',
  muted: '#9b8ec4',
  dim:   '#7a6fa0',
};

const RESET_SECS = 20;

interface Props {
  onComplete: () => void;
  onSkip:     () => void;
}

export function EyeResetOverlay({ onComplete, onSkip }: Props) {
  const [secs, setSecs] = useState(RESET_SECS);
  const progress = useSharedValue(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef   = useRef(false);

  useEffect(() => {
    progress.value = withTiming(1, { duration: RESET_SECS * 1000, easing: Easing.linear });
    tickerRef.current = setInterval(() => {
      setSecs(s => {
        const next = s - 1;
        if (next <= 0) {
          if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
          if (!doneRef.current) { doneRef.current = true; onComplete(); }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, []);

  function handleSkip() {
    if (doneRef.current) return;
    doneRef.current = true;
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    onSkip();
  }

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%` as `${number}%`,
  }));

  return (
    <View style={s.wrap}>
      <Ionicons name="eye-outline" size={42} color={C.green} />
      <Text style={s.title}>Eye Reset</Text>
      <Text style={s.bigSecs}>{secs}</Text>
      <Text style={s.line}>Now look 20 feet away for 20 seconds.</Text>
      <Text style={s.sub}>This is the part that helps your eyes most after screen time.</Text>
      <View style={s.track}>
        <Animated.View style={[s.fill, barStyle]} />
      </View>
      <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.6} hitSlop={10}>
        <Text style={s.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    zIndex: 200,
  },
  title:   { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 1, marginTop: 6 },
  bigSecs: { fontSize: 88, fontWeight: '900', color: C.green, lineHeight: 96, letterSpacing: -2 },
  line:    { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 6 },
  sub:     { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  track:   { width: '78%', height: 6, backgroundColor: '#1a1535', borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  fill:    { height: 6, backgroundColor: C.green, borderRadius: 3 },
  skipBtn: { marginTop: 20, paddingHorizontal: 18, paddingVertical: 8, opacity: 0.55 },
  skipText:{ fontSize: 12, color: C.dim, fontWeight: '600', letterSpacing: 0.5 },
});
