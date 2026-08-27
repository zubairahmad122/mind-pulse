// ──────────────────────────────────────────────────────────────────────────────
// useHaptics — Standard haptic feedback patterns for the design system
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  /** Light impact — button presses, toggles */
  const lightImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  /** Medium impact — toggle switches, important actions */
  const mediumImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  /** Heavy impact — paywall appear, big events */
  const heavyImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, []);

  /** Success notification — goal complete, streak increment */
  const successNotification = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  /** Error notification — streak break, failure */
  const errorNotification = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, []);

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    successNotification,
    errorNotification,
  };
}
