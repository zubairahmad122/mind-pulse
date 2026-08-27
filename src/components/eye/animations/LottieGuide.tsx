import { type ReactNode } from 'react';

interface Props {
  stepId: string;
  active: boolean;
  size?: number;
  speed?: number;
  fallback: ReactNode;
}

/**
 * Renders the programmatic fallback guide for every step.
 * (Lottie JSON entries were removed — all steps use their native Animated guides.)
 */
export function LottieGuide({ fallback }: Props) {
  return <>{fallback}</>;
}
