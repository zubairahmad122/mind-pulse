import { createContext, useContext, useMemo } from 'react';
import {
  PILLAR_THEME,
  DEFAULT_PILLAR_THEME,
  type PillarKey,
  type PillarTheme,
} from '@/constants/theme';

interface PillarCtx {
  pillar: PillarKey;
  theme: PillarTheme;
}

const PillarContext = createContext<PillarCtx>({
  pillar: 'mind',
  theme: DEFAULT_PILLAR_THEME,
});

/**
 * Provides the current pillar theme (mind / sleep / eyes) to all descendants.
 * Wired into ScreenShell — every screen automatically gets the right pillar
 * without needing to pass props through intermediate components.
 */
export function PillarProvider({
  pillar,
  children,
}: {
  pillar: PillarKey;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ pillar, theme: PILLAR_THEME[pillar] }),
    [pillar],
  );
  return (
    <PillarContext.Provider value={value}>
      {children}
    </PillarContext.Provider>
  );
}

/**
 * Returns the current pillar key and its full PillarTheme (accent, cardTint,
 * bgGradient, buttonGradient, etc.).
 */
export function usePillar(): PillarCtx {
  return useContext(PillarContext);
}

/**
 * Convenience: returns just the current PillarKey.
 */
export function usePillarKey(): PillarKey {
  return useContext(PillarContext).pillar;
}

/**
 * Convenience: returns just the current PillarTheme.
 */
export function usePillarTheme(): PillarTheme {
  return useContext(PillarContext).theme;
}
