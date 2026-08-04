import { FOCUS_SWITCH_DEFAULT_RACE_CPU } from '../eyeRelax';

// Before the Challenge Mode toggle existed, every Focus Switch round raced
// the CPU unconditionally. This locks the toggle's default to reproduce
// that behavior so it can't silently regress to "off" again.
describe('FOCUS_SWITCH_DEFAULT_RACE_CPU', () => {
  it('defaults Challenge Mode to on', () => {
    expect(FOCUS_SWITCH_DEFAULT_RACE_CPU).toBe(true);
  });
});
