import { type ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size: number;
  strokeWidth: number;
  duration: number;       // seconds for the current step
  active: boolean;        // false when idle / done
  paused: boolean;
  resetKey: string | number;  // change to restart progress at 0
  color?: string;
  trackColor?: string;
  gradient?: boolean;     // gradient stroke (accent → faint) vs solid
  children?: ReactNode;
}

export function StepCountdownRing({
  size,
  strokeWidth,
  duration,
  active,
  paused,
  resetKey,
  color = '#6ee7b7',
  trackColor = 'rgba(255,255,255,0.06)',
  gradient = true,
  children,
}: Props) {
  const gradId = `ringGrad-${String(resetKey)}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  const stepKeyRef     = useRef(resetKey);
  const wasPausedRef   = useRef(paused);
  const wasActiveRef   = useRef(active);

  useEffect(() => {
    // New step — reset and (re)start
    if (stepKeyRef.current !== resetKey) {
      stepKeyRef.current = resetKey;
      cancelAnimation(progress);
      progress.value = 0;
      if (active && !paused) {
        progress.value = withTiming(1, {
          duration: duration * 1000,
          easing: Easing.linear,
        });
      }
      wasPausedRef.current = paused;
      wasActiveRef.current = active;
      return;
    }

    // Same step, but active flipped off
    if (!active) {
      cancelAnimation(progress);
      wasActiveRef.current = active;
      wasPausedRef.current = paused;
      return;
    }

    // Pausing within step → freeze
    if (paused && !wasPausedRef.current) {
      cancelAnimation(progress);
      wasPausedRef.current = paused;
      return;
    }

    // Resuming within step → continue from current progress
    if (!paused && wasPausedRef.current) {
      const remainingFrac = Math.max(0, 1 - progress.value);
      const remainingMs   = remainingFrac * duration * 1000;
      if (remainingMs > 0) {
        progress.value = withTiming(1, {
          duration: remainingMs,
          easing: Easing.linear,
        });
      }
      wasPausedRef.current = paused;
      return;
    }

    // Active just turned on (fresh start from 0)
    if (active && !wasActiveRef.current && !paused) {
      const remainingFrac = Math.max(0, 1 - progress.value);
      const remainingMs   = remainingFrac * duration * 1000;
      if (remainingMs > 0) {
        progress.value = withTiming(1, {
          duration: remainingMs,
          easing: Easing.linear,
        });
      }
      wasActiveRef.current = active;
    }
  }, [active, paused, resetKey, duration]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * progress.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {gradient && (
          <Defs>
            <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={color} stopOpacity={1}    />
              <Stop offset="100%" stopColor={color} stopOpacity={0.18} />
            </SvgLinearGradient>
          </Defs>
        )}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor} strokeWidth={strokeWidth} fill="none"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={gradient ? `url(#${gradId})` : color}
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
