import { act, renderHook } from '@testing-library/react-native';
import { useSessionClock } from '../useSessionClock';

interface ClockResult {
  secondsLeft: number;
  progress: number;
  elapsedSeconds: number;
  isDone: boolean;
}

describe('useSessionClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts down from the total using wall-clock time', () => {
    const { result } = renderHook(() =>
      useSessionClock({ totalSeconds: 5, running: true, paused: false }),
    );
    expect(result.current.secondsLeft).toBe(5);

    act(() => { jest.advanceTimersByTime(2500); });
    expect(result.current.secondsLeft).toBe(3);

    act(() => { jest.advanceTimersByTime(2500); });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isDone).toBe(true);
  });

  it('survives JS-thread stalls — a long gap is consumed, not dropped or doubled', () => {
    const { result } = renderHook(() =>
      useSessionClock({ totalSeconds: 5, running: true, paused: false }),
    );
    // A hung JS thread means no interval callbacks for 4.2s; the next tick
    // must catch up to the true wall-clock elapsed time.
    act(() => { jest.advanceTimersByTime(4200); });
    expect(result.current.secondsLeft).toBe(1);
  });

  it('excludes paused time entirely', () => {
    const onComplete = jest.fn();
    const { result, rerender } = renderHook<ClockResult, { paused: boolean }>(
      ({ paused }) => useSessionClock({
        totalSeconds: 10, running: true, paused, onComplete,
      }),
      { initialProps: { paused: false } },
    );

    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.secondsLeft).toBe(8);

    // Pause for 5s of wall time — nothing may elapse.
    rerender({ paused: true });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(8);

    // Resume and run to completion.
    rerender({ paused: false });
    act(() => { jest.advanceTimersByTime(9000); });
    expect(result.current.secondsLeft).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires onComplete exactly once', () => {
    const onComplete = jest.fn();
    renderHook(() =>
      useSessionClock({
        totalSeconds: 2, running: true, paused: false, onComplete,
      }),
    );
    act(() => { jest.advanceTimersByTime(4000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('restarts from the top when resetKey changes while running', () => {
    const { result, rerender } = renderHook<ClockResult, { resetKey: string }>(
      ({ resetKey }) => useSessionClock({
        totalSeconds: 5, running: true, paused: false, resetKey,
      }),
      { initialProps: { resetKey: 'a' } },
    );

    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.secondsLeft).toBe(3);

    // Reset mid-run — the clock must re-anchor and keep ticking (regression
    // for the old anchor-null freeze).
    rerender({ resetKey: 'b' });
    expect(result.current.secondsLeft).toBe(5);
    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.secondsLeft).toBe(3);
  });

  // ── Lifecycle validation (Android background/foreground, phone
  //    lock/unlock, rapid app switching) — simulated with running flips ──

  it('rapid background/foreground flips neither lose nor double-count time', () => {
    const { result, rerender } = renderHook<ClockResult, { running: boolean }>(
      ({ running }) => useSessionClock({
        totalSeconds: 10, running, paused: false,
      }),
      { initialProps: { running: true } },
    );

    // Foreground for 1s, background 3s, foreground 1s, background 2s,
    // foreground 1s — only foreground time may elapse (4s total → 6 left).
    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ running: false });
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.secondsLeft).toBe(9);

    rerender({ running: true });
    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ running: false });
    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.secondsLeft).toBe(8);

    rerender({ running: true });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.secondsLeft).toBe(7);
  });

  it('never completes (or fires onComplete) while backgrounded', () => {
    const onComplete = jest.fn();
    const { result, rerender } = renderHook<ClockResult, { running: boolean }>(
      ({ running }) => useSessionClock({
        totalSeconds: 3, running, paused: false, onComplete,
      }),
      { initialProps: { running: true } },
    );

    // Run 1s, then background for 10s — the clock must freeze at 2s and not
    // fire completion (no scoring while backgrounded).
    act(() => { jest.advanceTimersByTime(1000); });
    rerender({ running: false });
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(result.current.secondsLeft).toBe(2);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes exactly once when the last moment happens on return from background', () => {
    const onComplete = jest.fn();
    const { result, rerender } = renderHook<ClockResult, { running: boolean }>(
      ({ running }) => useSessionClock({
        totalSeconds: 2, running, paused: false, onComplete,
      }),
      { initialProps: { running: true } },
    );

    act(() => { jest.advanceTimersByTime(1500); });
    rerender({ running: false }); // phone locks with 0.5s left
    act(() => { jest.advanceTimersByTime(4000); });
    expect(onComplete).not.toHaveBeenCalled();

    // Return to foreground: the remaining half-second elapses and completion
    // fires once — a stale background completion must not also fire.
    rerender({ running: true });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.secondsLeft).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
