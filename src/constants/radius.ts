// Bumped ~+4 per tier to match the softer, larger-radius language introduced
// with the Home redesign (constants/designSystem.ts) — same keys, so every
// existing consumer picks this up with no code changes. `xl` now matches
// designSystem's RADIUS.card (28) exactly.
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 100,
} as const;
