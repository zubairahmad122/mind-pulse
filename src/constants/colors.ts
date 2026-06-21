/** AuraSync design tokens — spec-aligned with legacy flat aliases */
export const colors = {
  background: {
    primary: '#080D1A',
    secondary: '#0D1128',
    card: 'rgba(255, 255, 255, 0.05)',
  },
  accent: {
    purple: '#1A8FFF',
    purpleLight: 'rgba(26, 143, 255, 0.15)',
    purpleBorder: 'rgba(26, 143, 255, 0.3)',
    purpleGlow: 'rgba(26, 143, 255, 0.2)',
    blue: '#00D4FF',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.6)',
    tertiary: 'rgba(255, 255, 255, 0.3)',
    purple: '#1A8FFF',
  },
  status: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  },
} as const;

/** Flat aliases used across existing screens */
export const COLORS = {
  bg: colors.background.primary,
  surface: colors.background.secondary,
  card: colors.background.card,
  cardHi: 'rgba(255, 255, 255, 0.08)',
  border: colors.accent.purpleBorder,
  borderHi: colors.accent.purple,
  purple: colors.accent.purple,
  purpleLight: '#7EB8FF',
  purpleDim: 'rgba(26, 143, 255, 0.35)',
  text: colors.text.primary,
  textMuted: colors.text.secondary,
  textDim: colors.text.tertiary,
  gold: colors.status.warning,
  goldDim: '#c77a00',
  success: colors.status.success,
  error: colors.status.error,
  blue: colors.accent.blue,
} as const;
