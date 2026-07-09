/**
 * Voice-guide arbitration rules — every case here was (or guards against)
 * a real shipped bug:
 *  - phase cues must never cut off a protected intro/closing narration
 *  - after the narration ends, cues must start playing again
 *  - a clip whose didJustFinish never fires (long Calm Flow intro) must
 *    still be detected as finished via the end-of-source watchdog
 *  - a clip paused near its end must NOT count as finished
 */
import { act, renderHook } from '@testing-library/react-native';
// jest.mock calls are hoisted above imports, so the hook import below
// already sees the mocked expo-audio / AsyncStorage.
import { useAudioGuide } from '../useAudioGuide';

type StatusListener = (status: {
  playing?: boolean;
  didJustFinish?: boolean;
  currentTime?: number;
  duration?: number;
}) => void;

let statusListener: StatusListener;

const mockPlayer = {
  addListener: jest.fn((_event: string, cb: StatusListener) => {
    statusListener = cb;
  }),
  replace: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
  play: jest.fn(),
  pause: jest.fn(),
  volume: 1,
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The hook keeps module-level singleton state (speaking/protected/started).
// stop() resets all of it, so each test starts from a neutral player —
// re-importing the module (isolateModules) would pull in a second React.
function setup() {
  const guide = renderHook(() => useAudioGuide()).result.current;
  guide.stop();
  jest.clearAllMocks();
  return guide;
}

describe('useAudioGuide arbitration', () => {
  it('skips non-interrupting cues while a protected narration speaks', () => {
    const guide = setup();
    guide.play('calm-flow/intro', 0, 1, { protect: true });
    act(() => statusListener({ playing: true }));
    expect(mockPlayer.replace).toHaveBeenCalledTimes(1);

    guide.play('breathing/breathe-in', 0, 1, { interrupt: false });
    expect(mockPlayer.replace).toHaveBeenCalledTimes(1); // skipped
  });

  it('plays cues again once the narration reports didJustFinish', () => {
    const guide = setup();
    const onDone = jest.fn();
    guide.play('calm-flow/intro', 0, 1, { protect: true, onDone });
    act(() => statusListener({ playing: true }));
    act(() => statusListener({ didJustFinish: true }));
    expect(onDone).toHaveBeenCalledTimes(1);

    guide.play('breathing/breathe-in', 0, 1, { interrupt: false });
    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
  });

  it('watchdog: treats playback stopped at end-of-source as finished', () => {
    const guide = setup();
    const onDone = jest.fn();
    guide.play('calm-flow/intro', 0, 1, { protect: true, onDone });
    act(() => statusListener({ playing: true }));
    // The Calm Flow bug: no didJustFinish ever arrived for the ~162s intro.
    act(() =>
      statusListener({
        playing: false,
        didJustFinish: false,
        currentTime: 161.5,
        duration: 161.7,
      }),
    );
    expect(onDone).toHaveBeenCalledTimes(1);

    guide.play('breathing/breathe-in', 0, 1, { interrupt: false });
    expect(mockPlayer.replace).toHaveBeenCalledTimes(2); // no longer blocked
  });

  it('watchdog does NOT fire for a clip we paused ourselves', () => {
    const guide = setup();
    const onDone = jest.fn();
    guide.play('calm-flow/intro', 0, 1, { protect: true, onDone });
    act(() => statusListener({ playing: true }));
    guide.pause();
    act(() =>
      statusListener({ playing: false, currentTime: 161.5, duration: 161.7 }),
    );
    expect(onDone).not.toHaveBeenCalled();

    guide.resume();
    expect(mockPlayer.play).toHaveBeenCalledTimes(2); // initial + resume
  });

  it('lets a cue replace a lingering unprotected cue', () => {
    const guide = setup();
    guide.play('breathing/hold', 0, 1, { interrupt: false });
    act(() => statusListener({ playing: true }));
    // "Hold" is still ringing out, but it is not protected — the next cue
    // must take over instead of being swallowed.
    guide.play('breathing/breathe-out', 0, 1, { interrupt: false });
    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
  });

  it('stop() clears protection so the next cue is never blocked', () => {
    const guide = setup();
    guide.play('calm-flow/intro', 0, 1, { protect: true });
    act(() => statusListener({ playing: true }));
    guide.stop();

    guide.play('breathing/breathe-in', 0, 1, { interrupt: false });
    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
  });

  it('stale finish events from the previous source are ignored', () => {
    const guide = setup();
    const onDone = jest.fn();
    guide.play('calm-flow/intro', 0, 1, { protect: true, onDone });
    // didJustFinish arrives BEFORE the new clip ever reported playing —
    // that's the old source's tail, not this clip finishing.
    act(() => statusListener({ didJustFinish: true }));
    expect(onDone).not.toHaveBeenCalled();
  });
});
