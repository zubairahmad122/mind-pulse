import {
  changedDimensions,
  clampLadderIndex,
  difficultyBandFor,
  difficultyVectorAt,
  familyPoolFor,
  SCHULTE_DIFFICULTY_DIMENSIONS,
  SCHULTE_DIFFICULTY_LADDER,
  SCHULTE_LADDER_MAX_INDEX,
} from '../index';

describe('Schulte Nexus difficulty ladder', () => {
  it('starts gentle: smallest board, simplest orders, no modifiers, no time pressure', () => {
    expect(SCHULTE_DIFFICULTY_LADDER[0]).toEqual({
      boardSize: 3,
      familyTier: 0,
      revealTier: 0,
      transformTier: 0,
      trapTier: 0,
      paceTier: 0,
    });
  });

  it('raises exactly one dimension, by exactly one step, per rung', () => {
    for (let index = 1; index < SCHULTE_DIFFICULTY_LADDER.length; index++) {
      const previous = SCHULTE_DIFFICULTY_LADDER[index - 1];
      const current = SCHULTE_DIFFICULTY_LADDER[index];
      const changed = changedDimensions(previous, current);

      expect(changed).toHaveLength(1);
      expect(current[changed[0]] - previous[changed[0]]).toBe(1);
    }
  });

  it('never lowers a dimension as the ladder climbs', () => {
    for (let index = 1; index < SCHULTE_DIFFICULTY_LADDER.length; index++) {
      for (const dimension of SCHULTE_DIFFICULTY_DIMENSIONS) {
        expect(SCHULTE_DIFFICULTY_LADDER[index][dimension]).toBeGreaterThanOrEqual(
          SCHULTE_DIFFICULTY_LADDER[index - 1][dimension],
        );
      }
    }
  });

  it('only offers a modifier family once its own dimension has been raised', () => {
    for (let index = 0; index <= SCHULTE_LADDER_MAX_INDEX; index++) {
      const vector = difficultyVectorAt(index);
      const pool = familyPoolFor(vector);

      expect(pool.includes('fading')).toBe(vector.revealTier >= 1);
      expect(pool.includes('row-shift')).toBe(vector.transformTier >= 1);
      expect(pool.includes('column-shift')).toBe(vector.transformTier >= 1);
      expect(pool.includes('trap-nodes')).toBe(vector.trapTier >= 1);
    }
  });

  it('always offers at least two families so repeats can be avoided', () => {
    for (let index = 0; index <= SCHULTE_LADDER_MAX_INDEX; index++) {
      expect(familyPoolFor(difficultyVectorAt(index)).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('clamps out-of-range rungs instead of producing an undefined vector', () => {
    expect(clampLadderIndex(-10)).toBe(0);
    expect(clampLadderIndex(999)).toBe(SCHULTE_LADDER_MAX_INDEX);
    expect(clampLadderIndex(Number.NaN)).toBe(0);
    expect(difficultyVectorAt(999)).toBe(SCHULTE_DIFFICULTY_LADDER[SCHULTE_LADDER_MAX_INDEX]);
  });

  it('bands the ladder from gentle to elite, never moving backwards', () => {
    const order = ['gentle', 'casual', 'sharp', 'elite'];
    let previous = 0;
    for (let index = 0; index <= SCHULTE_LADDER_MAX_INDEX; index++) {
      const current = order.indexOf(difficultyBandFor(index));
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
    expect(difficultyBandFor(0)).toBe('gentle');
    expect(difficultyBandFor(SCHULTE_LADDER_MAX_INDEX)).toBe('elite');
  });
});
