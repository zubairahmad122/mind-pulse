import { seedFromString } from '../signature';

/**
 * Personal mission seed — deterministic per (user, mission index, generator
 * version, attempt salt). Never `Math.random()`: two different users at the
 * same difficulty get different, but reproducible, boards.
 */
export function buildPersonalMissionSeed(
  userStableId: string,
  missionIndex: number,
  version: number,
  attemptSalt = 0,
): number {
  return seedFromString(`schulte-nexus|director|${userStableId}|${missionIndex}|v${version}|${attemptSalt}`);
}
