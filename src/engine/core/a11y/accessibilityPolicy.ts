/**
 * Accessibility settings translated into concrete engine numbers.
 *
 * **The contract: nothing here may reach scoring.** A player using large
 * targets, high contrast and reduced motion must score identically to one
 * who isn't, given the same input stream. That is asserted directly by
 * `__tests__/accessibilityPolicy.test.ts`, which replays one recorded run
 * under every combination of settings and compares the snapshots.
 *
 * This mirrors the guarantee `useEyeGameAccessibility` already documents for
 * the existing games; the engine now enforces it structurally, because the
 * policy object is simply never handed to the `MetricsRecorder`.
 */
export interface AccessibilitySettings {
  largeTarget: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface AccessibilityPolicy {
  readonly settings: AccessibilitySettings;
  /** Visual + hit radius multiplier for gameplay targets. */
  targetRadius(baseRadius: number): number;
  /** Extra tap forgiveness in px, added to the hit test only. */
  hitSlopPx(): number;
  /** 0..1 multiplier on requested particle counts. */
  particleBudget(): number;
  /** 0..1 multiplier on camera shake amplitude. */
  shakeScale(): number;
  /** 0..1 multiplier on popup travel distance. */
  popupMotionScale(): number;
  /** Scales stage-transition and telegraph durations. Reduced motion gets
   *  shorter animations, never shorter *reaction windows* — those are
   *  gameplay timing and belong to the game's difficulty, not to a11y. */
  transitionMs(baseMs: number): number;
  /** Multiplier applied to entity colour channels. High contrast pushes
   *  toward full saturation so targets separate from the background. */
  contrastBoost(): number;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  largeTarget: false,
  highContrast: false,
  reducedMotion: false,
};

export function createAccessibilityPolicy(
  settings: AccessibilitySettings = DEFAULT_ACCESSIBILITY,
): AccessibilityPolicy {
  const { largeTarget, highContrast, reducedMotion } = settings;

  return {
    settings,
    targetRadius: base => base * (largeTarget ? 1.35 : 1),
    hitSlopPx: () => (largeTarget ? 14 : 6),
    // Reduced motion kills particles outright: drifting debris is exactly
    // the kind of incidental movement the setting exists to remove.
    particleBudget: () => (reducedMotion ? 0 : 1),
    shakeScale: () => (reducedMotion ? 0 : 1),
    popupMotionScale: () => (reducedMotion ? 0.25 : 1),
    transitionMs: base => Math.round(base * (reducedMotion ? 0.45 : 1)),
    contrastBoost: () => (highContrast ? 1.25 : 1),
  };
}
