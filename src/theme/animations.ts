// ──────────────────────────────────────────────────────────────────────────────
// MindPulse Animation Tokens — Timing, Behaviors, Haptics
// Use react-native-reanimated for ALL animations. No LayoutAnimation.
// ──────────────────────────────────────────────────────────────────────────────

import type { EasingFunction } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

// ── TIMING TOKENS ────────────────────────────────────────────────────────────

export const TIMING = {
  /** 0ms — state toggles */
  instant: 0,
  /** 150ms — button presses, toggles */
  fast: 150,
  /** 300ms — screen transitions, modals */
  normal: 300,
  /** 500ms — page reveals */
  slow: 500,
  /** 800ms — confetti, streak celebration */
  celebration: 800,
} as const;

// ── EASING PRESETS ───────────────────────────────────────────────────────────

export const EASING = {
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  easeIn: Easing.in(Easing.cubic),
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;

// ── STANDARD BEHAVIORS ───────────────────────────────────────────────────────
// These are reference specs — implement with useAnimatedStyle + withTiming.

export const BEHAVIORS = {
  buttonPress: {
    scale: 0.96,
    duration: TIMING.fast,
  },
  cardPress: {
    scale: 0.98,
    opacity: 0.9,
    duration: TIMING.fast,
  },
  screenEnter: {
    translateYFrom: 20,
    translateYTo: 0,
    opacityFrom: 0,
    opacityTo: 1,
    duration: TIMING.normal,
  },
  listStagger: {
    translateYFrom: 10,
    translateYTo: 0,
    opacityFrom: 0,
    opacityTo: 1,
    /** Delay per item in ms */
    delayPerItem: 100,
  },
  paywallStagger: {
    translateYFrom: 30,
    translateYTo: 0,
    opacityFrom: 0,
    opacityTo: 1,
    delayPerItem: 100,
  },
  saveBadgePulse: {
    scaleFrom: 1,
    scaleTo: 1.05,
    duration: 2000,
    /** Infinite repeat */
    repeat: -1,
  },
  ctaShimmer: {
    /** Gradient sweep from left to right, 2000ms, infinite */
    duration: 2000,
    repeat: -1,
  },
} as const;

// ── HAPTIC FEEDBACK ──────────────────────────────────────────────────────────
// Import from 'expo-haptics' and use these impact types.

export const HAPTICS = {
  buttonPress: 'Light' as const,
  toggle: 'Medium' as const,
  goalComplete: 'Success' as const,
  streakBreak: 'Error' as const,
  paywallAppear: 'Heavy' as const,
} as const;
