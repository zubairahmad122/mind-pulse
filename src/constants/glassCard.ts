import { colors } from './colors';
import { radius } from './radius';
import { spacing } from './spacing';

export const glassCard = {
  backgroundColor: colors.background.card,
  borderWidth: 0.5,
  borderColor: colors.accent.purpleBorder,
  borderRadius: radius.lg,
  padding: spacing.md,
} as const;
