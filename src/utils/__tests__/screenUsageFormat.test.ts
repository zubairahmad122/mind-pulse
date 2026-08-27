import { formatScreenTimeMs, formatTopAppDurationMs } from '../screenUsageFormat';

describe('formatScreenTimeMs', () => {
  it('formats under an hour as "N min"', () => {
    expect(formatScreenTimeMs(42 * 60_000)).toBe('42 min');
  });

  it('formats an hour+minutes without zero-padding when minutes are already two digits', () => {
    expect(formatScreenTimeMs((60 + 18) * 60_000)).toBe('1h 18m');
  });

  it('zero-pads single-digit minutes when hours are present', () => {
    expect(formatScreenTimeMs((3 * 60 + 7) * 60_000)).toBe('3h 07m');
  });

  it('never shows seconds — rounds to the nearest minute', () => {
    expect(formatScreenTimeMs(90_500)).toBe('2 min'); // 1m30.5s rounds up to 2m
    expect(formatScreenTimeMs(59_000)).toBe('1 min'); // 59s rounds up to 1m
  });

  it('handles exactly zero usage', () => {
    expect(formatScreenTimeMs(0)).toBe('0 min');
  });

  it('never goes negative for a (defensively) negative input', () => {
    expect(formatScreenTimeMs(-1000)).toBe('0 min');
  });
});

describe('formatTopAppDurationMs', () => {
  it('shows "0 min" only for truly zero usage', () => {
    expect(formatTopAppDurationMs(0)).toBe('0 min');
  });

  it('shows "<1 min" for any non-zero duration under a minute', () => {
    expect(formatTopAppDurationMs(1_000)).toBe('<1 min');
    expect(formatTopAppDurationMs(30_000)).toBe('<1 min');
    expect(formatTopAppDurationMs(59_000)).toBe('<1 min');
  });

  it('switches to minute formatting at exactly 60 seconds', () => {
    expect(formatTopAppDurationMs(60_000)).toBe('1 min');
  });

  it('defers to the existing minute/hour formatting above a minute', () => {
    expect(formatTopAppDurationMs(42 * 60_000)).toBe('42 min');
    expect(formatTopAppDurationMs((60 + 18) * 60_000)).toBe('1h 18m');
  });

  it('never goes negative for a (defensively) negative input', () => {
    expect(formatTopAppDurationMs(-1000)).toBe('0 min');
  });
});
