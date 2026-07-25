import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { DURATION, PROGRESS_BAR } from '@/constants/designSystem';

type Props = {
  /** 0–1 */
  progress: number;
  /** Fill color — pass the screen's pillar accent. */
  fill: string;
  style?: ViewStyle;
};

/**
 * The single canonical progress bar — height 8, fully-rounded track/fill,
 * animates its width over 600ms. Used for "Today's Goal", weekly progress
 * rows, and any other completion indicator.
 */
export function ProgressBar({ progress, fill, style }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clamped,
      duration: DURATION.progress,
      useNativeDriver: false,
    }).start();
  }, [clamped, widthAnim]);

  return (
    <View style={[styles.track, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fill,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: PROGRESS_BAR.height,
    borderRadius: PROGRESS_BAR.radius,
    backgroundColor: PROGRESS_BAR.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: PROGRESS_BAR.radius,
  },
});
