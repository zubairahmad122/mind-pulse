/**
 * Shared "levels 1-N free, N+1 requires Pro" gate — generalized from Schulte
 * Nexus's original per-game implementation
 * (src/engine/core/games/schulteNexus/director/levels.ts:
 * SCHULTE_FREE_LEVEL_MAX / canAccessSchulteLevel / resolveSchulteLevelAccess)
 * so MathGap, TimeFlow, and PatternShift reuse the same logic instead of
 * each re-implementing it. Schulte itself is left as-is — it has extra
 * per-level metadata (`SchulteLevelDefinition`) this helper doesn't need to
 * model — but all four games now agree on the same free-tier level cap.
 */

export const FREE_LEVEL_MAX = 5;

export type LevelAccessState = 'free' | 'premiumRequired' | 'unlocked';

export interface LevelAccessResult {
  readonly canPlay: boolean;
  readonly reason: 'ok' | 'premium_required';
  readonly requiredLevel: number;
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 1;
  return Math.round(level);
}

export function canAccessLevel(
  level: number,
  isPremium: boolean,
  freeLevelMax: number = FREE_LEVEL_MAX,
): LevelAccessState {
  const clamped = clampLevel(level);
  if (clamped <= freeLevelMax) return 'free';
  return isPremium ? 'unlocked' : 'premiumRequired';
}

export function resolveLevelAccess(
  level: number,
  isPremium: boolean,
  freeLevelMax: number = FREE_LEVEL_MAX,
): LevelAccessResult {
  const clamped = clampLevel(level);
  const state = canAccessLevel(clamped, isPremium, freeLevelMax);
  if (state === 'premiumRequired') {
    return { canPlay: false, reason: 'premium_required', requiredLevel: clamped };
  }
  return { canPlay: true, reason: 'ok', requiredLevel: clamped };
}
