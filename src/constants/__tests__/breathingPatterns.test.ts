import {
  BREATHING_PATTERNS,
  patternCycleSeconds,
  patternDurationSeconds,
} from '../breathingPatterns';

// The pattern IS the single source of truth for session timing — these
// numbers showing up wrong on a card or timer was a real shipped bug.
describe('breathing pattern timing math', () => {
  it('computes the cycle length as the sum of its phases', () => {
    expect(patternCycleSeconds(BREATHING_PATTERNS.calm)).toBe(10); // 5-5
    expect(patternCycleSeconds(BREATHING_PATTERNS.box)).toBe(16); // 4-4-4-4
    expect(patternCycleSeconds(BREATHING_PATTERNS.wave)).toBe(14); // 4-2-6-2
    expect(patternCycleSeconds(BREATHING_PATTERNS.drop)).toBe(21); // 4-4-8-5
  });

  it('derives the exact session duration from cycles × cycle length', () => {
    expect(patternDurationSeconds(BREATHING_PATTERNS.calm)).toBe(540); // 9:00
    expect(patternDurationSeconds(BREATHING_PATTERNS.box)).toBe(320); // 5:20
    expect(patternDurationSeconds(BREATHING_PATTERNS.wave)).toBe(378); // 6:18
    expect(patternDurationSeconds(BREATHING_PATTERNS.drop)).toBe(630); // 10:30
  });

  it.each(Object.values(BREATHING_PATTERNS))(
    '$id has positive cycles and phase durations (timer math relies on it)',
    def => {
      expect(def.cycles).toBeGreaterThan(0);
      expect(def.phases.length).toBeGreaterThan(0);
      for (const phase of def.phases) {
        expect(phase.duration).toBeGreaterThan(0);
        expect(['inhale', 'hold-in', 'exhale', 'hold-out']).toContain(phase.name);
      }
    },
  );
});
