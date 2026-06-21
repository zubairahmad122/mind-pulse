import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  label: string;
  onComplete: () => void;
  /** Hold duration in ms before completing. */
  duration?: number;
  disabled?: boolean;
  bg?: string;
  fill?: string;
  textColor?: string;
};

/**
 * Press-and-hold button: a fill sweeps across while held and fires
 * `onComplete` once it reaches the end. Releasing early rewinds it.
 */
export function HoldButton({
  label,
  onComplete,
  duration = 1100,
  disabled = false,
  bg = '#0E1116',
  fill = 'rgba(255,255,255,0.18)',
  textColor = '#FFFFFF',
}: Props) {
  const progress = useSharedValue(0);

  const finish = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onComplete();
  };

  const start = () => {
    if (disabled) return;
    void Haptics.selectionAsync();
    progress.value = withTiming(1, { duration }, finished => {
      if (finished) {
        runOnJS(finish)();
        progress.value = 0;
      }
    });
  };

  const cancel = () => {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 220 });
  };

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      disabled={disabled}
      style={{
        width: '100%',
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: bg,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: fill }, fillStyle]}
      />
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: textColor, letterSpacing: 1 }}>{label}</Text>
      </View>
    </Pressable>
  );
}
