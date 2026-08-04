import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useSessionLifecycle } from '../useSessionLifecycle';

// The hook reads AppState.currentState at mount and subscribes to
// AppState.addEventListener('change', …). We control both here so we can
// simulate Android background/foreground and phone lock/unlock exactly.
let currentState: AppStateStatus = 'active';
let listener: ((next: AppStateStatus) => void) | null = null;

beforeEach(() => {
  currentState = 'active';
  listener = null;
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    get: () => currentState,
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(
    ((_type: string, handler: (next: AppStateStatus) => void) => {
      listener = handler;
      return { remove: jest.fn() };
    }) as never,
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

function setAppState(next: AppStateStatus) {
  currentState = next;
  act(() => {
    listener?.(next);
  });
}

describe('useSessionLifecycle', () => {
  it('starts foregrounded with isBackgrounded false', () => {
    const { result } = renderHook(() => useSessionLifecycle());
    expect(result.current.isBackgrounded).toBe(false);
  });

  it('fires onPause and flags backgrounded when the app backgrounds (or phone locks)', () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    const { result } = renderHook(() =>
      useSessionLifecycle({ onPause, onResume }),
    );

    setAppState('background'); // app switcher / home
    expect(result.current.isBackgrounded).toBe(true);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();

    setAppState('active'); // return to foreground
    expect(result.current.isBackgrounded).toBe(false);
    expect(onResume).toHaveBeenCalledTimes(1);

    setAppState('inactive'); // phone lock / control centre (iOS), notification shade
    expect(result.current.isBackgrounded).toBe(true);
    expect(onPause).toHaveBeenCalledTimes(2);
  });

  it('initialises backgrounded when mounted while the app is already away', () => {
    currentState = 'background';
    const { result } = renderHook(() => useSessionLifecycle());
    // Must not start live just because the screen mounted in the background
    // (e.g. opened from a notification) — the next change event will surface it.
    expect(result.current.isBackgrounded).toBe(true);
  });

  it('rapid app switching fires pause/resume once per transition, in order', () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    renderHook(() => useSessionLifecycle({ onPause, onResume }));

    setAppState('background');
    setAppState('active');
    setAppState('background');
    setAppState('active');
    setAppState('background');

    expect(onPause).toHaveBeenCalledTimes(3);
    expect(onResume).toHaveBeenCalledTimes(2);
  });

  it('uses the latest callbacks without re-subscribing', () => {
    const first = jest.fn();
    const second = jest.fn();
    const addEventListener = AppState.addEventListener as jest.Mock;
    // Clear any calls accumulated by earlier tests sharing the mocked listener.
    addEventListener.mockClear();
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useSessionLifecycle({ onPause: cb }),
      { initialProps: { cb: first } },
    );
    expect(addEventListener).toHaveBeenCalledTimes(1);

    rerender({ cb: second });
    expect(addEventListener).toHaveBeenCalledTimes(1);

    setAppState('background');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
