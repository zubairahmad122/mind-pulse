import {
  BREATHING_PATTERNS,
  patternDurationSeconds,
} from '../breathingPatterns';
import {
  RELAX_SESSIONS,
  formatSessionDuration,
  getSessionById,
  getSessionRoute,
} from '../relaxSessions';

describe('formatSessionDuration', () => {
  it('shows whole minutes without seconds', () => {
    expect(formatSessionDuration(540)).toBe('9 min');
    expect(formatSessionDuration(60)).toBe('1 min');
  });

  it('shows Xm Ys for partial minutes', () => {
    expect(formatSessionDuration(320)).toBe('5m 20s');
    expect(formatSessionDuration(378)).toBe('6m 18s');
    expect(formatSessionDuration(630)).toBe('10m 30s');
    expect(formatSessionDuration(65)).toBe('1m 5s');
  });
});

describe('session durations stay consistent with their pattern', () => {
  // The shipped bug: card said "5 min", timer ran 300s, but 20 box cycles
  // need 320s — the last cycles silently never happened.
  it.each(RELAX_SESSIONS.filter(s => s.breathingPattern))(
    '$id durationSeconds equals its pattern cycles × cycle length',
    session => {
      expect(session.durationSeconds).toBe(
        patternDurationSeconds(BREATHING_PATTERNS[session.breathingPattern!]),
      );
    },
  );
});

describe('getSessionRoute', () => {
  it('sends narration sessions to their dedicated guided screens', () => {
    expect(getSessionRoute('body-scan').pathname).toBe('/(app)/stress/body-scan');
    expect(getSessionRoute('muscle-release').pathname).toBe('/(app)/stress/tension-release');
    expect(getSessionRoute('5-4-3-2-1').pathname).toBe('/(app)/stress/grounding');
  });

  it('sends breathing sessions to the relax player with their id', () => {
    for (const id of ['calm-flow', 'box-breathing', 'reset-wave', 'sleep-drop']) {
      expect(getSessionRoute(id)).toEqual({
        pathname: '/(app)/relax/player',
        params: { sessionId: id },
      });
    }
  });
});

describe('getSessionById', () => {
  it('finds every declared session', () => {
    for (const s of RELAX_SESSIONS) {
      expect(getSessionById(s.id)).toBe(s);
    }
  });

  it('returns null for unknown ids', () => {
    expect(getSessionById('nope')).toBeNull();
    expect(getSessionById('')).toBeNull();
  });
});
