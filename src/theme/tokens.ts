// ──────────────────────────────────────────────────────────────────────────────
// MindPulse Design Tokens — Single Source of Truth
// Every component MUST import from here. No hardcoded values anywhere.
// ──────────────────────────────────────────────────────────────────────────────

// ── COLOR PALETTE ────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bg: '#0F0F1A',
  card: '#1A1A2E',
  elevated: '#252542',
  input: '#13132A',

  // Accent — Purple
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',

  // Accent — Blue
  blue: '#3B82F6',

  // Accent — Cyan (Eye tab exclusive)
  cyan: '#06B6D4',

  // Accent — Green (success, streaks, savings, trial)
  green: '#10B981',

  // Accent — Gold (premium badges, crown, stars)
  gold: '#F59E0B',

  // Accent — Red (errors, logout, destructive)
  red: '#EF4444',

  // Accent — Orange (warnings)
  orange: '#F97316',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Borders
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderActive: 'rgba(255,255,255,0.1)',
} as const;

// ── GRADIENTS ────────────────────────────────────────────────────────────────

export const GRADIENTS = {
  /** Primary CTAs only */
  primary: ['#8B5CF6', '#3B82F6'] as const,
  /** Sleep tab accents */
  sleep: ['#8B5CF6', '#A78BFA'] as const,
  /** Premium elements */
  gold: ['#F59E0B', '#FBBF24'] as const,
} as const;

// ── TYPOGRAPHY SCALE ─────────────────────────────────────────────────────────

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'caption-xs';

export interface TypographyToken {
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  lineHeight: number;
  letterSpacing?: number;
  fontFamily: string;
}

const HEADING_FONT = 'SpaceGrotesk_700Bold';
const HEADING_SEMI_FONT = 'SpaceGrotesk_600SemiBold';
const BODY_FONT = 'Inter_400Regular';
const BODY_SEMI_FONT = 'Inter_600SemiBold';
const BODY_BOLD_FONT = 'Inter_700Bold';

export const TYPOGRAPHY: Record<TypographyVariant, TypographyToken> = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    fontFamily: HEADING_FONT,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    fontFamily: HEADING_FONT,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    fontFamily: HEADING_SEMI_FONT,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    fontFamily: BODY_FONT,
  },
  'body-sm': {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    fontFamily: BODY_FONT,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 1.2,
    fontFamily: BODY_SEMI_FONT,
  },
  'caption-xs': {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    fontFamily: BODY_SEMI_FONT,
  },
};

// ── SPACING SCALE ────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

// ── BORDER RADIUS ────────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ── SHADOWS (card, elevated) ─────────────────────────────────────────────────

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  }),
} as const;

// ── COMPONENT DIMENSIONS ─────────────────────────────────────────────────────

export const SIZES = {
  /** Minimum touch target for all tappable elements */
  touchTarget: 44,
  /** Button heights by size */
  buttonSm: 36,
  buttonMd: 44,
  buttonLg: 56,
  /** Icon size tokens */
  iconXs: 14,
  iconSm: 18,
  iconMd: 22,
  iconLg: 28,
  iconXl: 36,
  /** Feature card icon circle */
  featureIconCircle: 44,
  /** MPListItem icon circle */
  listItemCircle: 40,
  /** MPProgressRing stroke width */
  progressStroke: 8,
  /** MPDaySelector circle size */
  dayCircle: 40,
  /** MPBadge pill padding */
  badgePaddingH: 10,
  badgePaddingV: 4,
} as const;
