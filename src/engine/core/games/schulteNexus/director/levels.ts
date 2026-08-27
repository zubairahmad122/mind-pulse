import type { SchulteOrderFamily } from '../types';
import type { SchulteDirectorVector, SchultePlayerSkillProfile } from './types';

/**
 * Level Progression — an envelope layer on top of the Mission Director. A
 * level is never one fixed mission: it constrains *which* families/grids/
 * target counts/mechanics `resolveNextSchulteLevelMission` (see
 * `levelMission.ts`) may draw from; the actual board/sequence/seed is still
 * resolved per-attempt by the existing director primitives.
 */

export const SCHULTE_FREE_LEVEL_MAX = 5;

export type SchulteLevelAccessState = 'free' | 'premiumRequired' | 'unlocked';

export interface SchulteLevelAccessResult {
  readonly canPlay: boolean;
  readonly reason: 'ok' | 'premium_required';
  readonly requiredLevel: number;
}

/** Lightweight, player-independent metadata — safe to expose to a future UI directly. */
export interface SchulteLevelDefinition {
  readonly level: number;
  readonly premiumRequired: boolean;
  readonly purpose: string;
  readonly families: readonly SchulteOrderFamily[];
  readonly allowNeutralCells: boolean;
  readonly allowParityFilter: boolean;
  readonly allowNonUnitOrigin: boolean;
  readonly allowFading: boolean;
  readonly allowRowShift: boolean;
  readonly allowColumnShift: boolean;
}

/** The full, resolved generation envelope — player-tuned for level 21+. */
export interface SchulteLevelEnvelope extends SchulteLevelDefinition {
  readonly geometries: readonly (readonly [rows: number, columns: number])[];
  readonly targetCountRange: readonly [min: number, max: number];
  readonly baseVector: SchulteDirectorVector;
}

function vector(overrides: Partial<SchulteDirectorVector> = {}): SchulteDirectorVector {
  return {
    searchSpeed: 0,
    targetCount: 0,
    gridComplexity: 0,
    sequenceComplexity: 0,
    ruleSwitching: 0,
    visualComplexity: 0,
    timePressure: 0,
    ...overrides,
  };
}

const BASE_FAMILIES: readonly SchulteOrderFamily[] = ['ascending', 'descending'];

/** Hand-authored envelopes, levels 1–20 — one dimension unlocked per level, per spec. */
const LEVEL_ENVELOPES: readonly SchulteLevelEnvelope[] = [
  // 1 — teach the game
  { level: 1, premiumRequired: false, purpose: 'Teach the basic Schulte search — ascending only.',
    families: ['ascending'], geometries: [[3, 3]], targetCountRange: [9, 9],
    allowNeutralCells: false, allowParityFilter: false, allowNonUnitOrigin: false,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector() },
  // 2 — descending
  { level: 2, premiumRequired: false, purpose: 'Introduce descending order.',
    families: ['descending'], geometries: [[3, 3]], targetCountRange: [9, 10],
    allowNeutralCells: false, allowParityFilter: false, allowNonUnitOrigin: false,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector() },
  // 3 — variable target counts, small grid variety
  { level: 3, premiumRequired: false, purpose: 'Variable target counts on slightly varied small grids.',
    families: BASE_FAMILIES, geometries: [[3, 4], [4, 3], [4, 4], [4, 5], [5, 4]], targetCountRange: [11, 20],
    allowNeutralCells: true, allowParityFilter: false, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 15, gridComplexity: 15 }) },
  // 4 — larger ranges/grids
  { level: 4, premiumRequired: false, purpose: 'Larger ranges and a slightly bigger grid.',
    families: BASE_FAMILIES, geometries: [[4, 4], [4, 5], [5, 4], [5, 5]], targetCountRange: [13, 21],
    allowNeutralCells: true, allowParityFilter: false, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 30, gridComplexity: 25 }) },
  // 5 — foundation mastery check, right before the premium boundary
  { level: 5, premiumRequired: false, purpose: 'Foundation mastery check before the premium boundary.',
    families: BASE_FAMILIES, geometries: [[4, 4], [4, 5], [5, 4], [5, 5]], targetCountRange: [15, 23],
    allowNeutralCells: true, allowParityFilter: false, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 25, timePressure: 10 }) },
  // 6 — odd/even sequences (premium starts here)
  { level: 6, premiumRequired: true, purpose: 'Unlock odd/even sequence search.',
    families: BASE_FAMILIES, geometries: [[4, 4]], targetCountRange: [10, 14],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: false,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 25, timePressure: 10 }) },
  // 7 — speed-mastery variants (tighter timer on already-known mechanics)
  { level: 7, premiumRequired: true, purpose: 'Speed-mastery pass on already-known mechanics.',
    families: BASE_FAMILIES, geometries: [[4, 4]], targetCountRange: [10, 14],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: false,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 25, searchSpeed: 20, timePressure: 25 }) },
  // 8 — fixed-step
  { level: 8, premiumRequired: true, purpose: 'Unlock fixed-step sequences.',
    families: ['fixed-step'], geometries: [[4, 4]], targetCountRange: [10, 14],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: false,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 25, sequenceComplexity: 30, timePressure: 20 }) },
  // 9 — ranges not starting at 1
  { level: 9, premiumRequired: true, purpose: 'Ranges that do not start at 1.',
    families: BASE_FAMILIES, geometries: [[4, 4]], targetCountRange: [10, 14],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 25, timePressure: 20 }) },
  // 10 — alternating ends
  { level: 10, premiumRequired: true, purpose: 'Unlock alternating-ends search.',
    families: ['alternating-ends'], geometries: [[4, 4]], targetCountRange: [12, 16],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 50, gridComplexity: 25, sequenceComplexity: 55, timePressure: 20 }) },
  // 11 — neutral/distractor cells become the norm
  { level: 11, premiumRequired: true, purpose: 'Neutral/distractor cells as a deliberate mechanic.',
    families: [...BASE_FAMILIES, 'alternating-ends'], geometries: [[4, 4], [4, 5]], targetCountRange: [10, 15],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 40, timePressure: 20 }) },
  // 12 — custom target queue
  { level: 12, premiumRequired: true, purpose: 'Unlock custom target queue.',
    families: ['custom-target-queue'], geometries: [[4, 4], [4, 5]], targetCountRange: [10, 15],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 40, gridComplexity: 40, sequenceComplexity: 70, timePressure: 20 }) },
  // 13 — reverse blocks
  { level: 13, premiumRequired: true, purpose: 'Unlock reverse-blocks search.',
    families: ['reverse-blocks'], geometries: [[4, 4], [4, 5]], targetCountRange: [10, 16],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 45, gridComplexity: 40, sequenceComplexity: 55, timePressure: 20 }) },
  // 14 — larger target counts, larger grids
  { level: 14, premiumRequired: true, purpose: 'Larger target counts and larger grids.',
    families: [...BASE_FAMILIES, 'alternating-ends', 'reverse-blocks'], geometries: [[4, 5], [5, 4], [5, 5]], targetCountRange: [19, 23],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 70, gridComplexity: 60, timePressure: 20 }) },
  // 15 — fading (visual only — safe on any grid shape)
  { level: 15, premiumRequired: true, purpose: 'Unlock fading visibility.',
    families: [...BASE_FAMILIES, 'alternating-ends'], geometries: [[4, 5], [5, 4], [5, 5]], targetCountRange: [16, 21],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: true, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 60, gridComplexity: 60, visualComplexity: 30, timePressure: 20 }) },
  // 16 — row shift (square boards only — see `challengeBuilder.ts`'s transform note)
  { level: 16, premiumRequired: true, purpose: 'Unlock row-shift.',
    families: BASE_FAMILIES, geometries: [[4, 4], [5, 5]], targetCountRange: [12, 20],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: true, allowRowShift: true, allowColumnShift: false, baseVector: vector({ targetCount: 55, gridComplexity: 50, visualComplexity: 20, timePressure: 25 }) },
  // 17 — column shift (square boards only)
  { level: 17, premiumRequired: true, purpose: 'Unlock column-shift.',
    families: BASE_FAMILIES, geometries: [[4, 4], [5, 5]], targetCountRange: [12, 20],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: true, allowRowShift: false, allowColumnShift: true, baseVector: vector({ targetCount: 55, gridComplexity: 50, visualComplexity: 20, timePressure: 25 }) },
  // 18 — controlled rule switching
  { level: 18, premiumRequired: true, purpose: 'Unlock controlled rule switching.',
    families: ['rule-switch'], geometries: [[4, 4], [5, 5]], targetCountRange: [14, 20],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 60, gridComplexity: 50, ruleSwitching: 60, timePressure: 25 }) },
  // 19 — stronger adaptive time pressure (still ≤60s, enforced by calculateAdaptiveTimeLimit)
  { level: 19, premiumRequired: true, purpose: 'Stronger adaptive time pressure.',
    families: [...BASE_FAMILIES, 'alternating-ends', 'reverse-blocks'], geometries: [[4, 4], [5, 5]], targetCountRange: [14, 21],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: false, allowRowShift: false, allowColumnShift: false, baseVector: vector({ targetCount: 65, gridComplexity: 55, searchSpeed: 40, timePressure: 45 }) },
  // 20 — two compatible advanced dimensions together (e.g. descending + fading, or alternating + one shift)
  { level: 20, premiumRequired: true, purpose: 'Two compatible advanced mechanics together.',
    families: [...BASE_FAMILIES, 'alternating-ends'], geometries: [[4, 4], [5, 5]], targetCountRange: [16, 23],
    allowNeutralCells: true, allowParityFilter: true, allowNonUnitOrigin: true,
    allowFading: true, allowRowShift: true, allowColumnShift: false, baseVector: vector({ targetCount: 70, gridComplexity: 60, sequenceComplexity: 40, visualComplexity: 25, timePressure: 35 }) },
];

function clampLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 1;
  return Math.round(level);
}

/** Lightweight, player-independent metadata. For level 21+, describes the algorithmic band generically. */
export function getSchulteLevelDefinition(level: number): SchulteLevelDefinition {
  const clamped = clampLevel(level);
  if (clamped <= LEVEL_ENVELOPES.length) return LEVEL_ENVELOPES[clamped - 1];
  return {
    level: clamped,
    premiumRequired: true,
    purpose: 'Algorithmic Nexus level — envelope derived from player rating, mastery and recent performance.',
    families: [...BASE_FAMILIES, 'alternating-ends', 'reverse-blocks', 'fixed-step', 'custom-target-queue', 'rule-switch'],
    allowNeutralCells: true,
    allowParityFilter: true,
    allowNonUnitOrigin: true,
    allowFading: true,
    allowRowShift: true,
    allowColumnShift: true,
  };
}

/**
 * Derives the level 21+ envelope from player state. Deterministic in its
 * inputs (rating/mastery/level) — no randomness lives here, only in the
 * seeded candidate generation that consumes the envelope afterward.
 */
function algorithmicEnvelope(level: number, profile: SchultePlayerSkillProfile): SchulteLevelEnvelope {
  const definition = getSchulteLevelDefinition(level);
  const growth = Math.min(1, (level - LEVEL_ENVELOPES.length) / 20);
  const ratingFactor = Math.min(1, Math.max(0, profile.rating) / 1000);
  const blend = (base: number, ceiling: number) => Math.round(base + (ceiling - base) * ((growth + ratingFactor) / 2));

  return {
    ...definition,
    geometries: [[4, 5], [5, 4], [5, 5]],
    targetCountRange: [blend(16, 19), blend(21, 25)],
    baseVector: vector({
      searchSpeed: blend(40, 80),
      targetCount: blend(60, 90),
      gridComplexity: blend(60, 90),
      sequenceComplexity: blend(45, 80),
      ruleSwitching: blend(35, 70),
      visualComplexity: blend(25, 60),
      timePressure: blend(40, 75),
    }),
  };
}

/** The full resolved envelope a mission may be generated from. Player-tuned only for level 21+. */
export function getSchulteLevelEnvelope(level: number, profile: SchultePlayerSkillProfile): SchulteLevelEnvelope {
  const clamped = clampLevel(level);
  if (clamped <= LEVEL_ENVELOPES.length) return LEVEL_ENVELOPES[clamped - 1];
  return algorithmicEnvelope(clamped, profile);
}

/**
 * Slot-aware envelope: expands target counts and geometries as the player
 * progresses within a level. This prevents semantic repetition by ensuring
 * consecutive missions feel meaningfully different.
 */
interface SlotOverride {
  readonly targetCountRange?: readonly [min: number, max: number];
  readonly geometries?: readonly (readonly [rows: number, columns: number])[];
  readonly allowNeutralCells?: boolean;
}

/** Per-level slot overrides: missionInLevel 0 = first mission, 1 = second, etc. */
const SLOT_OVERRIDES: readonly (readonly SlotOverride[])[] = [
  // Level 1: ascending foundation — grow from 9 to 19 targets
  [
    { targetCountRange: [9, 9], geometries: [[3, 3] as const] },
    { targetCountRange: [13, 14], geometries: [[4, 4] as const], allowNeutralCells: true },
    { targetCountRange: [18, 19], geometries: [[4, 5] as const, [5, 4] as const], allowNeutralCells: true },
  ],
  // Level 2: descending foundation — same progression, opposite direction
  [
    { targetCountRange: [9, 10], geometries: [[3, 3] as const, [3, 4] as const, [4, 3] as const], allowNeutralCells: true },
    { targetCountRange: [14, 15], geometries: [[4, 4] as const], allowNeutralCells: true },
    { targetCountRange: [18, 19], geometries: [[4, 5] as const, [5, 4] as const], allowNeutralCells: true },
  ],
  // Level 3: variable ranges — growing search space
  [
    { targetCountRange: [11, 13], geometries: [[3, 4] as const, [4, 3] as const, [4, 4] as const] },
    { targetCountRange: [15, 16], geometries: [[4, 4] as const] },
    { targetCountRange: [18, 20], geometries: [[4, 5] as const, [5, 4] as const] },
  ],
  // Level 4: larger ranges — same progression
  [
    { targetCountRange: [13, 15], geometries: [[4, 4] as const] },
    { targetCountRange: [16, 18], geometries: [[4, 4] as const, [4, 5] as const, [5, 4] as const] },
    { targetCountRange: [19, 21], geometries: [[4, 5] as const, [5, 4] as const, [5, 5] as const] },
  ],
  // Level 5: foundation mastery — larger grids
  [
    { targetCountRange: [15, 16], geometries: [[4, 4] as const] },
    { targetCountRange: [18, 19], geometries: [[4, 5] as const, [5, 4] as const] },
    { targetCountRange: [21, 23], geometries: [[5, 5] as const] },
  ],
];

/**
 * Returns a level envelope adjusted for the player's current mission slot
 * within the level. For levels 1–5, this ensures consecutive missions feel
 * meaningfully different (growing target count, expanding grid).
 */
export function getSlotAwareEnvelope(
  level: number,
  missionInLevel: number,
  profile: SchultePlayerSkillProfile,
): SchulteLevelEnvelope {
  const clamped = clampLevel(level);
  const base = getSchulteLevelEnvelope(clamped, profile);

  // For levels beyond hand-authored slot overrides, use the base envelope
  if (clamped > SLOT_OVERRIDES.length) return base;

  const slots = SLOT_OVERRIDES[clamped - 1];
  if (!slots) return base;

  // Safety: fallback to slot 0 if missionInLevel is somehow undefined/NaN
  const safeMissionInLevel = typeof missionInLevel === 'number' && Number.isFinite(missionInLevel) ? missionInLevel : 0;

  // Clamp to the last slot if missionInLevel exceeds available slots
  const slotIndex = Math.max(0, Math.min(Math.floor(safeMissionInLevel), slots.length - 1));
  const override = slots[slotIndex];

  return {
    ...base,
    targetCountRange: override.targetCountRange ?? base.targetCountRange,
    geometries: override.geometries ?? base.geometries,
    allowNeutralCells: override.allowNeutralCells ?? base.allowNeutralCells,
  };
}

export function canAccessSchulteLevel(level: number, isPremium: boolean): SchulteLevelAccessState {
  const clamped = clampLevel(level);
  if (clamped <= SCHULTE_FREE_LEVEL_MAX) return 'free';
  return isPremium ? 'unlocked' : 'premiumRequired';
}

export function resolveSchulteLevelAccess(level: number, isPremium: boolean): SchulteLevelAccessResult {
  const clamped = clampLevel(level);
  const state = canAccessSchulteLevel(clamped, isPremium);
  if (state === 'premiumRequired') return { canPlay: false, reason: 'premium_required', requiredLevel: clamped };
  return { canPlay: true, reason: 'ok', requiredLevel: clamped };
}
