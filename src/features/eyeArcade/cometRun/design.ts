import { rgba } from '@/engine/core/types';

/**
 * Comet Run's art direction and tuning.
 *
 * Two rules govern what lives here:
 *
 * 1. **Colour is a language, not decoration.** Cyan is the player — hull,
 *    engine, bullets, shield. Red is hostile — enemy ships, their fire,
 *    their telegraphs. Amber means "collect me or use me now" — pickups and
 *    a full special. Steel is inert structure you crash into. A player who
 *    picks up those four associations in the first five seconds can read the
 *    corridor without being told anything, which is the bar this slice has
 *    to clear.
 *
 * 2. **Reaction windows are difficulty, never accessibility.** Telegraph
 *    durations and fire rates are constants here; the accessibility policy
 *    is only allowed to widen *forgiveness* (hit radii, tap slop). Two
 *    players flying the same line score the same, whatever their settings.
 */

const c = (hex: string) => {
  const { r, g, b } = rgba(hex);
  return { r, g, b } as const;
};

export type Rgb = { readonly r: number; readonly g: number; readonly b: number };

export const COLORS = {
  space: '#04070F',

  /** Deep field. */
  nebulaCool: c('#16327A'),
  nebulaWarm: c('#4A1A66'),
  star: c('#CBDCFF'),
  starWarm: c('#FFE6BE'),
  planet: c('#2E5FD0'),
  planetRim: c('#8FC4FF'),

  /** The player. */
  cyan: c('#3BE8FF'),
  cyanDeep: c('#0C7FB0'),
  cyanPale: c('#DCFAFF'),

  /** Inert structure — corridor frames, struts, rock. */
  steel: c('#4A648C'),
  steelLit: c('#93B4DC'),
  rock: c('#7A6E68'),
  rockLit: c('#B6A79C'),

  /** Hostile. */
  red: c('#FF3A4E'),
  redDeep: c('#7E0C1C'),
  redPale: c('#FFB0B8'),

  /** Collect / spend. */
  amber: c('#FFC24D'),
  /** The dark interior of a pickup pod, so its glyph reads against the shell. */
  podInner: c('#0A1120'),
  green: c('#5BE58B'),
  violet: c('#B98BFF'),

  white: c('#FFFFFF'),
} as const;

export const SHIP = {
  /** Hull size in px at the near plane. */
  sizePx: 62,
  /** Collision radius — deliberately smaller than the sprite. Every runner
   *  does this: a hitbox that matches the wings makes clean-looking dodges
   *  register as hits, which reads as the game being broken. */
  hitRadius: 17,
  /** How far above the finger the ship rides, so a thumb never covers it. */
  fingerLiftPx: 92,
  /** Approach rate toward the finger, per second. Fast enough to feel
   *  direct, damped enough that the ship has mass. */
  followRate: 16,
  /** Roll from lateral speed. */
  bankPerSpeed: 0.0016,
  maxBankRad: 0.62,
  /** Invulnerability after taking a hit, so one clip is not three hits. */
  iframesMs: 900,
} as const;

export const WEAPON = {
  /** Auto-fire interval. */
  intervalMs: 145,
  /**
   * Bolt speed, world-z per second.
   *
   * Fast on purpose, and not only for feel. A slow bolt lives for seconds,
   * and at a shot every 145ms that means dozens of them alive at once —
   * which costs two draw nodes and a pool slot each, and was measured
   * flooding both budgets. Fast bolts that expire early are cheaper *and*
   * read better: gunfire should crack, not drift.
   */
  boltSpeedZ: 9000,
  /** How far a bolt travels before it expires, as a fraction of `farZ`. */
  rangeFrac: 0.62,
  damage: 1,
  /** How long the triple-shot pickup lasts. */
  upgradeMs: 9000,
  upgradeIntervalMs: 105,
  /** Lateral spread of the outer bolts, world units per unit z. */
  spread: 0.055,
} as const;

export const SPECIAL = {
  /** Energy needed to fire. */
  cost: 100,
  /** Damage dealt to everything in the corridor. */
  damage: 6,
  durationMs: 900,
} as const;

export const RUN = {
  /** Corridor speed in world-z units per second, and how it escalates. */
  baseSpeed: 2100,
  /** Speed at the mini-boss — the "stronger speed sensation" beat. */
  maxSpeed: 3400,
  /** How fast the corridor accelerates toward its target speed. */
  speedLerp: 0.6,
  startShield: 100,
  maxShield: 100,
  startEnergy: 0,
  maxEnergy: 100,
} as const;

export const DAMAGE = {
  debris: 18,
  barrier: 26,
  enemyBullet: 12,
  enemyRam: 22,
  beam: 30,
  bossRam: 30,
} as const;

export const REWARD = {
  energyPerKill: 12,
  energyPerGate: 18,
  energyPickup: 25,
  shieldPickup: 34,
  gateScore: 150,
  scoutScore: 200,
  turretScore: 400,
  bossScore: 1500,
  checkpointScore: 1000,
} as const;

export const ENEMY = {
  scoutHp: 2,
  scoutFireMs: 1400,
  scoutBulletSpeedZ: 2600,
  /** Tough enough to survive the approach and land at least one beam — a
   *  turret the player guns down before it ever fires is a beat that never
   *  happened. */
  turretHp: 24,
  /** How long the turret's beam telegraph runs before it fires. */
  turretTelegraphMs: 1200,
  turretBeamMs: 1400,
  /** Sized so the fight runs ~6s of sustained fire once the interceptor is
   *  on station — long enough for both of its patterns to show themselves,
   *  which is the whole point of having two. */
  bossHp: 56,
  /** Length of each of the boss's two attack patterns. */
  bossPatternMs: 2600,
  bossTelegraphMs: 900,
} as const;

/** The scripted slice runs 45s; this is the hard cap that catches a player
 *  who simply stops flying. */
export const MISSION = {
  sliceMs: 45_000,
  checkpointHoldMs: 3000,
} as const;

/**
 * Node budget for one frame.
 *
 * **Measured, not guessed** — `__tests__/budget.test.ts` draws every frame of
 * a full played slice and reports the peak. Capacity is not free: the atlas's
 * pooled buffers iterate every slot each frame whether it is live or not, so
 * this is the measured peak plus headroom, and the test fails if a new effect
 * pushes past it rather than letting the frame silently drop nodes.
 */
export const NODE_CAPACITY = 384;
export const PARTICLE_CAPACITY = 120;
export const ENTITY_CAPACITY = 96;
export const POPUP_CAPACITY = 8;
