/**
 * Onboarding/auth visual theme — single source of truth for the styling
 * introduced with the onboarding redesign (per-pillar gradients + the
 * glassmorphism card), shared by OnboardingScreen and AuthHeroLayout so the
 * two can never drift apart. Mirrored into tailwind.config.js for any
 * screen that wants these tokens via NativeWind classes instead of inline
 * style objects.
 */
import { COLORS } from './colors';

export type PillarKey = 'mind' | 'sleep' | 'eyes' | 'focus';

export type PillarTheme = {
  accent: string;
  bgGradient: readonly [string, string, string];
  cardTint: readonly [string, string];
  buttonGradient: readonly [string, string];
  buttonTextColor: string;
  buttonShadow: string;
};

export const PILLAR_THEME: Record<PillarKey, PillarTheme> = {
  // Same violet as PILLAR_COLORS.mind (designSystem.ts) — the accent Focus
  // already uses on Home (FeaturedSection, the first-run feature guide), so
  // onboarding's lead slide stays visually consistent with the real feature.
  focus: {
    accent: '#7B5CFF',
    bgGradient: ['#22185A', '#0F0C29', '#08061A'],
    cardTint: ['rgba(40,28,96,0.3)', 'rgba(10,6,20,0.55)'],
    buttonGradient: ['#7B5CFF', '#6C63FF'],
    buttonTextColor: '#fff',
    buttonShadow: 'rgba(123,92,255,0.5)',
  },
  mind: {
    accent: '#6C63FF',
    bgGradient: ['#1A1650', '#0F0C29', '#08061A'],
    cardTint: ['rgba(30,24,80,0.3)', 'rgba(8,12,24,0.55)'],
    buttonGradient: ['#6C63FF', '#3B2ED0'],
    buttonTextColor: '#fff',
    buttonShadow: 'rgba(59,46,208,0.6)',
  },
  sleep: {
    accent: '#A48BFF',
    bgGradient: ['#1E1450', '#0F0C29', '#08061A'],
    cardTint: ['rgba(20,14,44,0.25)', 'rgba(8,4,18,0.55)'],
    buttonGradient: ['#A48BFF', '#7B5CFF'],
    buttonTextColor: '#fff',
    buttonShadow: 'rgba(123,92,255,0.6)',
  },
  eyes: {
    accent: '#4DE1C1',
    bgGradient: ['#19124A', '#0F0C29', '#08061A'],
    cardTint: ['rgba(24,28,80,0.3)', 'rgba(6,12,16,0.55)'],
    buttonGradient: ['#4DE1C1', '#3BC9AB'],
    buttonTextColor: '#03212c',
    buttonShadow: 'rgba(59,201,171,0.5)',
  },
};

/** Used by screens with no pillar of their own (e.g. Sign In / Sign Up). */
export const DEFAULT_PILLAR_THEME: PillarTheme = {
  accent: COLORS.purple,
  bgGradient: ['#1A1650', '#0F0C29', '#08061A'],
  cardTint: ['rgba(30,24,80,0.3)', 'rgba(8,12,24,0.55)'],
  buttonGradient: [COLORS.purpleLight, COLORS.purple],
  buttonTextColor: '#fff',
  buttonShadow: COLORS.purpleDim,
};

export function getPillarTheme(icon?: string): PillarTheme {
  return (icon && PILLAR_THEME[icon as PillarKey]) || DEFAULT_PILLAR_THEME;
}

/** Glassmorphism card — shared by Onboarding's bottom card and AuthHeroLayout's sheet. */
export const GLASS_CARD = {
  borderRadius: 28,
  borderTopWidth: 1.5,
  borderColor: 'rgba(255,255,255,0.1)',
  blurIntensity: 40,
  highlightColors: ['transparent', 'rgba(255,255,255,0.55)', 'transparent'] as const,
  innerTopColors: ['rgba(255,255,255,0.07)', 'transparent'] as const,
  innerTopHeight: 54,
  innerBottomColors: ['transparent', 'rgba(0,0,0,0.28)'] as const,
  innerBottomHeight: 44,
  outerGlow: {
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
} as const;

/** Font families introduced with the onboarding redesign (loaded in src/app/_layout.tsx). */
export const FONTS = {
  heading: 'SpaceGrotesk_700Bold',
  headingSemi: 'SpaceGrotesk_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodySemi: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
} as const;
