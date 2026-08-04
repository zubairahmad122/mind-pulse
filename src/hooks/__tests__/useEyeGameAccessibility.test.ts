import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEyeGameAccessibility } from '../useEyeGameAccessibility';

// jest.mock calls are hoisted above imports by the Babel transform, so the
// hook import above already sees the mocked AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useEyeGameAccessibility', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults everything off', () => {
    const { result } = renderHook(() => useEyeGameAccessibility());
    expect(result.current.largeTarget).toBe(false);
    expect(result.current.highContrast).toBe(false);
    expect(result.current.reducedMotion).toBe(false);
  });

  it('updates and persists a single preference without affecting the others', async () => {
    const { result } = renderHook(() => useEyeGameAccessibility());

    act(() => result.current.setLargeTarget(true));
    await waitFor(() => expect(result.current.largeTarget).toBe(true));
    expect(result.current.highContrast).toBe(false);
    expect(result.current.reducedMotion).toBe(false);

    // Persists the full merged prefs object (matching useGameFeedbackPrefs'
    // established pattern), not just the changed key.
    const stored = JSON.parse((await AsyncStorage.getItem('@mindpulse/eye-game-accessibility-prefs'))!);
    expect(stored).toEqual({ largeTarget: true, highContrast: false, reducedMotion: false });
  });

  it('reloads persisted prefs on a fresh mount', async () => {
    const first = renderHook(() => useEyeGameAccessibility());
    act(() => {
      first.result.current.setHighContrast(true);
      first.result.current.setReducedMotion(true);
    });
    await waitFor(() => expect(first.result.current.highContrast).toBe(true));

    const second = renderHook(() => useEyeGameAccessibility());
    await waitFor(() => expect(second.result.current.highContrast).toBe(true));
    expect(second.result.current.reducedMotion).toBe(true);
    expect(second.result.current.largeTarget).toBe(false);
  });

  it('uses a storage key independent of sound/haptics prefs', async () => {
    const { result } = renderHook(() => useEyeGameAccessibility());
    act(() => result.current.setLargeTarget(true));
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('@mindpulse/game-feedback-prefs');
      expect(raw).toBeNull();
    });
  });
});
