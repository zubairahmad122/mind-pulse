import { act, renderHook } from '@testing-library/react-native';
import { useSessionClock } from '../useSessionClock';
import { cvsTimingBlocked } from '@/utils/cvsLifecycle';

/**
 * Models EXACTLY how CVSProtocolScreen now wires its step countdown:
 *   running   = phase === 'active'
 *   paused    = cvsTimingBlocked('active', backgrounded, userPaused) || interstitial
 *   resetKey  = `${stepIndex}:${clockNonce}`
 *
 * The screen's onPause callback flips `userPaused` on, and only the user's
 * Resume tap flips it off — so tests mirror that by moving the props the way
 * the screen does.
 */
function useCvsStepTimer(props: {
  bg: boolean;
  userPaused: boolean;
  interstitial?: boolean;
  stepDuration?: number;
  stepIndex?: number;
  onComplete?: () => void;
}) {
  const { bg, userPaused, interstitial = false, stepDuration = 25, stepIndex = 0, onComplete } = props;
  return useSessionClock({
    totalSeconds: stepDuration,
    running: true,
    paused: cvsTimingBlocked('active', bg, userPaused) || interstitial,
    resetKey: stepIndex,
    onComplete,
  });
}

describe('CVSProtocolScreen step timer — lifecycle wiring', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('background during a step freezes the countdown at the exact remaining time', () => {
    const { result, rerender } = renderHook(
      (p: { bg: boolean; userPaused: boolean }) => useCvsStepTimer(p),
      { initialProps: { bg: false, userPaused: false } },
    );
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(20);

    // App backgrounds → the screen's onPause also sets the user-paused flag.
    rerender({ bg: true, userPaused: true });
    act(() => { jest.advanceTimersByTime(12000); });
    expect(result.current.secondsLeft).toBe(20);
  });

  it('return after longer than the remaining step time does NOT auto-advance the step', () => {
    const onComplete = jest.fn();
    const { result, rerender } = renderHook(
      (p: { bg: boolean; userPaused: boolean }) => useCvsStepTimer({ ...p, onComplete }),
      { initialProps: { bg: false, userPaused: false } },
    );
    act(() => { jest.advanceTimersByTime(24000); }); // 1s left in the step
    expect(result.current.secondsLeft).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();

    // Lock the phone for 10 minutes — away for way longer than 1s.
    rerender({ bg: true, userPaused: true });
    act(() => { jest.advanceTimersByTime(600000); });
    // Still the same step, same remaining time: no auto-advance while away.
    expect(result.current.secondsLeft).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();

    // Return — still frozen behind the paused overlay until the user resumes.
    rerender({ bg: false, userPaused: true });
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.secondsLeft).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();

    // User taps Resume → the last second elapses → completion fires ONCE.
    rerender({ bg: false, userPaused: false });
    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.secondsLeft).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Extra time does not re-fire completion.
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('manual pause then background stays paused — resume from exact remaining', () => {
    const { result, rerender } = renderHook(
      (p: { bg: boolean; userPaused: boolean }) => useCvsStepTimer(p),
      { initialProps: { bg: false, userPaused: false } },
    );
    act(() => { jest.advanceTimersByTime(4000); }); // 21 left
    rerender({ bg: false, userPaused: true });      // manual pause
    act(() => { jest.advanceTimersByTime(3000); });
    rerender({ bg: true, userPaused: true });       // background while paused
    act(() => { jest.advanceTimersByTime(9000); });
    expect(result.current.secondsLeft).toBe(21);    // nothing moved

    rerender({ bg: false, userPaused: true });      // return, still paused
    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.secondsLeft).toBe(21);

    rerender({ bg: false, userPaused: false });     // resume
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(16);    // exact remaining, no reset
  });

  it('rapid background/foreground flips lose no time (paused overlay each return)', () => {
    const onComplete = jest.fn();
    const { result, rerender } = renderHook(
      (p: { bg: boolean; userPaused: boolean }) => useCvsStepTimer({ ...p, onComplete }),
      { initialProps: { bg: false, userPaused: false } },
    );
    act(() => { jest.advanceTimersByTime(2000); }); // 23 left

    // 10 quick flips — each return lands on the paused overlay (userPaused
    // stays on until the user taps Resume), so zero time may pass.
    for (let i = 0; i < 10; i++) {
      rerender({ bg: true, userPaused: true });
      act(() => { jest.advanceTimersByTime(100); });
      rerender({ bg: false, userPaused: true });
      act(() => { jest.advanceTimersByTime(500); });
    }
    expect(result.current.secondsLeft).toBe(23);
    expect(onComplete).not.toHaveBeenCalled();

    // Finally the user resumes → exact remaining time continues.
    rerender({ bg: false, userPaused: false });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(18);
  });

  it('background during the interstitial defers the step change, never ticks away', () => {
    const { result, rerender } = renderHook(
      (p: { bg: boolean; userPaused: boolean; interstitial: boolean; stepIndex?: number; stepDuration?: number }) =>
        useCvsStepTimer(p),
      { initialProps: { bg: false, userPaused: false, interstitial: false } },
    );
    act(() => { jest.advanceTimersByTime(2000); });

    // The "complete → next" beat starts; the app backgrounds mid-beat.
    rerender({ bg: true, userPaused: true, interstitial: true });
    act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.secondsLeft).toBe(23); // frozen, no advance while away

    // Return — screen's onResume replays the deferred step swap (new resetKey,
    // new duration) but the paused overlay is still up until the user resumes.
    rerender({ bg: false, userPaused: true, interstitial: true, stepIndex: 1, stepDuration: 30 });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(30); // fresh step, still frozen

    rerender({ bg: false, userPaused: true, interstitial: false, stepIndex: 1, stepDuration: 30 });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(30);

    // User resumes → the new step ticks from the top.
    rerender({ bg: false, userPaused: false, interstitial: false, stepIndex: 1, stepDuration: 30 });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.secondsLeft).toBe(25);
  });

  it('phone lock (AppState background) freezes the step identically', () => {
    const { result, rerender } = renderHook(
      (p: { bg: boolean; userPaused: boolean }) => useCvsStepTimer(p),
      { initialProps: { bg: false, userPaused: false } },
    );
    act(() => { jest.advanceTimersByTime(6000); }); // 19 left
    rerender({ bg: true, userPaused: true });       // locked
    act(() => { jest.advanceTimersByTime(60000); });
    expect(result.current.secondsLeft).toBe(19);
  });
});
