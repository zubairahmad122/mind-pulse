import { createContext, useContext, useMemo } from 'react';
import { PILLAR_COLORS } from '@/constants/designSystem';

export type PillarKey = keyof typeof PILLAR_COLORS;

interface PillarCtx {
  pillar: PillarKey;
  accent: string;
}

const PillarContext = createContext<PillarCtx>({
  pillar: 'mind',
  accent: PILLAR_COLORS.mind,
});

/**
 * Provides the current screen's accent color (one of `PILLAR_COLORS`) to all
 * descendants. Wired into `ScreenShell` — every screen automatically gets
 * the right accent without needing to pass props through intermediate
 * components. Background is global (see `ScreenShell`) — this context only
 * ever drives per-screen accent color, never background/card styling.
 */
export function PillarProvider({
  pillar,
  children,
}: {
  pillar: PillarKey;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ pillar, accent: PILLAR_COLORS[pillar] }),
    [pillar],
  );
  return (
    <PillarContext.Provider value={value}>
      {children}
    </PillarContext.Provider>
  );
}

/** Returns the current pillar key and its accent color. */
export function usePillar(): PillarCtx {
  return useContext(PillarContext);
}

/** Convenience: returns just the current PillarKey. */
export function usePillarKey(): PillarKey {
  return useContext(PillarContext).pillar;
}

/** Convenience: returns just the current pillar's accent color. */
export function usePillarAccent(): string {
  return useContext(PillarContext).accent;
}
