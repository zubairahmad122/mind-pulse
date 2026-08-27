/**
 * MindPulse Global Design System — the single, frozen source of truth for
 * every screen's background, cards, typography, spacing, radii, shadows,
 * and component dimensions. Every new screen/component should read from
 * here instead of hardcoding colors, radii, or sizes.
 *
 * `RADIUS`/`SHADOWS`/`PILLAR_COLORS`/`SURFACE_TINT`/`SURFACE`/`DURATION`
 * keep their existing key names (already consumed across Home/Relax/Eye/
 * Sleep/Challenges) — only their *values* were corrected to match the
 * frozen spec, so existing call sites did not need to change. `large`/
 * `medium`/`small` in `SHADOWS` are kept as aliases of the single frozen
 * card shadow (the spec has one card shadow that "never changes").
 */
import { colors } from './colors';

// ── Global background (identical on every screen) — mostly black, purple only
// as a faint accent (not a wash) ─────────────────────────────────────────────
export const BACKGROUND = {
  base: '#09090F',
  /** Top → bottom overlay gradient painted over `base` on every screen. */
  overlay: ['#131028', '#0C0B17'] as const,
} as const;

// ── Radius — frozen forever. One radius for every card, no exceptions. ──────
export const RADIUS = {
  hero: 24,
  card: 24,
  quickAction: 32,
  button: 18,
  /** Pills / small chips. */
  chip: 16,
  iconBox: 18,
  bottomNav: 30,
} as const;

// ── Spacing scale ────────────────────────────────────────────────────────────
export const SPACING = {
  screenH: 24,
  screenTop: 20,
  screenBottom: 36,
  section: 32,
  titleGap: 6,
  cardPadding: 24,
} as const;

// ── Typography scale ─────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

/** Font families — moved here from `constants/theme.ts` (design token, not onboarding-specific). */
export const FONTS = {
  heading: 'SpaceGrotesk_700Bold',
  headingSemi: 'SpaceGrotesk_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodySemi: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
} as const;

/** Animation durations — reach for these instead of ad-hoc millisecond literals. */
export const DURATION = {
  fast: 180,
  normal: 250,
  slow: 350,
  /** Progress-bar width animation (spec: "Animate Width 600ms"). */
  progress: 600,
} as const;

/**
 * Shadow presets. The spec defines exactly one shadow per surface type and
 * says cards "never change" — `card`/`button`/`quickAction` are the frozen
 * set. `large`/`medium`/`small` are back-compat aliases (all cards, however
 * they were previously weighted, now render the identical card shadow).
 */
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.35,
  shadowRadius: 40,
};
const BUTTON_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.25,
  shadowRadius: 24,
};
const QUICK_ACTION_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.2,
  shadowRadius: 18,
};

export const SHADOWS = {
  card: CARD_SHADOW,
  button: BUTTON_SHADOW,
  quickAction: QUICK_ACTION_SHADOW,
  large: CARD_SHADOW,
  medium: CARD_SHADOW,
  small: CARD_SHADOW,
} as const;

/** One accent color per wellness pillar — reference these, never hardcode hex. */
export const PILLAR_COLORS = {
  eye: '#00E0FF',
  relax: '#48D9FF',
  mind: '#9D5CFF',
  sleep: '#7B7FFF',
  challenge: '#FFAE1A',
  /** Screen Balance / Reset — soft cyan-teal, distinct from eye's pure cyan and mind's purple. */
  reset: '#3DE8D0',
} as const;

export const STATUS_COLORS = {
  success: '#32D583',
  warning: '#FFC83D',
  error: '#FF5F72',
} as const;

/**
 * The one "Pro/premium" gold — crown icons, PRO badges, upgrade CTAs.
 * Deliberately separate from STATUS_COLORS.warning (a semantic alert color)
 * and PILLAR_COLORS.challenge (the streak/reward orange) — this is a third,
 * distinct meaning ("this is a paid feature") that was previously three
 * different undocumented hex values (#FF9800, #FFC83D, #F7B733) scattered
 * across PremiumBadge/SubscriptionBadge/PaywallGate/PremiumScreen.
 */
export const PRO_GOLD = '#F7B733';

/** Flat glass-card surface — every "normal" card looks identical (spec: "No different card styles"). */
export const GLASS_CARD = {
  bg: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  topHighlight: 'rgba(255,255,255,0.04)',
  blurIntensity: 40,
} as const;

/** Hero card — the one card allowed a distinct gradient fill (muted, not saturated). */
export const HERO_CARD = {
  gradient: ['#4B2C77', '#241938'] as const,
  radius: RADIUS.hero,
  padding: SPACING.cardPadding,
} as const;

export const BUTTON = {
  primaryGradient: ['#45D6FF', '#5A9EFF'] as const,
  height: 56,
  radius: RADIUS.button,
  secondaryBorder: 'rgba(255,255,255,0.12)',
} as const;

export const ICON_SIZES = {
  hero: 26,
  card: 22,
  nav: 22,
  quickAction: 26,
} as const;

export const ICON_CONTAINERS = {
  quickAction: 64,
  sessionCard: 60,
  hero: 48,
} as const;

export const SESSION_CARD = {
  height: 108,
  radius: RADIUS.card,
  padding: 20,
} as const;

export const PROGRESS_BAR = {
  height: 6,
  radius: 999,
  track: 'rgba(255,255,255,0.08)',
} as const;

export const BOTTOM_NAV = {
  height: 82,
  radius: RADIUS.bottomNav,
  bg: 'rgba(13,10,25,0.96)',
} as const;

/**
 * Card/surface tints, passed to `GlassCard`'s `tint` prop. `card`/`tip` are
 * flat (both gradient stops identical) so they render as the uniform spec
 * fill; `hero` is the one legitimately distinct gradient (Hero Card, spec
 * section 4).
 */
export const SURFACE_TINT = {
  hero: HERO_CARD.gradient,
  card: [GLASS_CARD.bg, GLASS_CARD.bg] as const,
  tip: [GLASS_CARD.bg, GLASS_CARD.bg] as const,
} as const;

/** Flat surface/border/accent colors that don't fit the pillar or tint sets above. */
export const SURFACE = {
  background: colors.background.primary,
  surface: colors.background.secondary,
  border: GLASS_CARD.border,
  purple: PILLAR_COLORS.mind,
  warning: STATUS_COLORS.warning,
} as const;
