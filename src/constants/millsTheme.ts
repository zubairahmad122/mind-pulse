export const MILLS_THEME = {
  background: '#080D18',
  backgroundRaised: '#0E1727',
  surface: 'rgba(15, 24, 40, 0.78)',
  surfaceSoft: 'rgba(255,255,255,0.055)',
  /** Cool blue-tinted border instead of neutral grey — reads as part of the same lit surface, not a generic UI-kit line. */
  border: 'rgba(110,190,255,0.12)',
  /** Cool off-white, not warm ivory — reads as modern/premium rather than parchment. */
  text: '#F5F7FB',
  textMuted: 'rgba(245,247,251,0.72)',
  /** Cooled from the original warm ivory — reads as ivory/silver, not wood. */
  boardLine: '#DCE4EE',
  boardNode: '#6E7886',
  p1: '#37E7E0',
  p1Dark: '#147D82',
  p2: '#F29A7E',
  p2Dark: '#A84C3F',
  legal: '#D9E6DF',
  danger: '#FF7C83',
  success: '#79D9A4',
  /** "Coming soon" roadmap accent — reserved for unavailable-mode badges, kept off the p1/p2 palette. */
  soon: '#E4C989',
  /** Mill-formed reward accent — distinct from both player colors so the "you scored" moment reads as an event, not a player action. */
  mill: '#E8C468',
  /** Warm bronze/gold support accent — the background's lower-area ambient tint, and available for small premium touches (dividers, secondary badges). */
  bronze: '#CDA56B',
} as const;

