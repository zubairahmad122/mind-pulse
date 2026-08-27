/**
 * Onboarding/auth visual theme — single source of truth for the styling
 * introduced with the onboarding redesign (per-pillar gradients + the
 * glassmorphism card), shared by OnboardingScreen and AuthHeroLayout so the
 * two can never drift apart. Mirrored into tailwind.config.js for any
 * screen that wants these tokens via NativeWind classes instead of inline
 * style objects.
 */
import { COLORS } from './colors';

export type PillarKey = 'mind' | 'sleep' | 'eyes';

export type PillarTheme = {
  accent: string;
  bgGradient: readonly [string, string, string];
  cardTint: readonly [string, string];
  buttonGradient: readonly [string, string];
  buttonTextColor: string;
  buttonShadow: string;
};

export const PILLAR_THEME: Record<PillarKey, PillarTheme> = {
  mind: {
    accent: '#3b82f6',
    bgGradient: ['#0C1225', '#080D1A', '#040810'],
    cardTint: ['rgba(16,20,40,0.3)', 'rgba(8,12,24,0.55)'],
    buttonGradient: ['#3b82f6', '#2563eb'],
    buttonTextColor: '#fff',
    buttonShadow: 'rgba(37,99,235,0.6)',
  },
  sleep: {
    accent: '#a78bfa',
    bgGradient: ['#1e1438', '#0d0a1a', '#06040e'],
    cardTint: ['rgba(20,14,44,0.25)', 'rgba(8,4,18,0.55)'],
    buttonGradient: ['#a78bfa', '#7c3aed'],
    buttonTextColor: '#fff',
    buttonShadow: 'rgba(124,58,237,0.6)',
  },
  eyes: {
    accent: '#22d3ee',
    bgGradient: ['#0B1920', '#071216', '#03080B'],
    cardTint: ['rgba(12,22,28,0.3)', 'rgba(6,12,16,0.55)'],
    buttonGradient: ['#5eead4', '#06b6d4'],
    buttonTextColor: '#03212c',
    buttonShadow: 'rgba(8,145,178,0.6)',
  },
};

/** Used by screens with no pillar of their own (e.g. Sign In / Sign Up). */
export const DEFAULT_PILLAR_THEME: PillarTheme = {
  accent: COLORS.purple,
  bgGradient: ['#0C1225', '#080D1A', '#040810'],
  cardTint: ['rgba(16,20,40,0.3)', 'rgba(8,12,24,0.55)'],
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
