import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { ScreenUsageSnapshot } from '@/types/screenUsage.types';
import { useScreenUsage } from '../useScreenUsage';

const mockSnapshot: ScreenUsageSnapshot = {
  hasPermission: true,
  screenTimeTodayMs: 90 * 60_000,
  currentSessionMs: 12 * 60_000,
  lastSessionMs: null,
  currentSessionAvailable: true,
  topAppsToday: [],
  appSwitchesLast60Min: 8,
  appSwitchingAvailable: true,
  calculatedAt: Date.now(),
};

const mockGetScreenUsageSnapshot = jest.fn(async () => mockSnapshot);
const mockOpenUsageAccessSettings = jest.fn(async () => {});
let mockSupported = true;

jest.mock('@/services/screenUsageService', () => ({
  isScreenUsageSupported: () => mockSupported,
  getScreenUsageSnapshot: (...args: unknown[]) => mockGetScreenUsageSnapshot(...(args as [])),
  openUsageAccessSettings: (...args: unknown[]) => mockOpenUsageAccessSettings(...(args as [])),
}));

let listener: ((next: AppStateStatus) => void) | null = null;

beforeEach(() => {
  mockSupported = true;
  listener = null;
  mockGetScreenUsageSnapshot.mockClear();
  mockOpenUsageAccessSettings.mockClear();
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

describe('useScreenUsage', () => {
  it('loads a snapshot on mount when supported', async () => {
    const { result } = renderHook(() => useScreenUsage());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snapshot).toEqual(mockSnapshot);
    expect(mockGetScreenUsageSnapshot).toHaveBeenCalledTimes(1);
  });

  it('never calls the native bridge on an unsupported platform', async () => {
    mockSupported = false;
    const { result } = renderHook(() => useScreenUsage());
    expect(result.current.supported).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.snapshot).toBeNull();
    expect(mockGetScreenUsageSnapshot).not.toHaveBeenCalled();
  });

  it('re-fetches when the app returns to the foreground', async () => {
    const { result } = renderHook(() => useScreenUsage());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetScreenUsageSnapshot.mockClear();

    act(() => {
      listener?.('background');
    });
    expect(mockGetScreenUsageSnapshot).not.toHaveBeenCalled();

    act(() => {
      listener?.('active');
    });
    await waitFor(() => expect(mockGetScreenUsageSnapshot).toHaveBeenCalledTimes(1));
  });

  it('requestAccess opens Usage Access settings without assuming it was granted', async () => {
    const { result } = renderHook(() => useScreenUsage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.requestAccess();
    });
    expect(mockOpenUsageAccessSettings).toHaveBeenCalledTimes(1);
    // Requesting access alone doesn't re-fetch — the AppState 'active'
    // listener (fired when the user returns from Settings) does that.
    expect(mockGetScreenUsageSnapshot).toHaveBeenCalledTimes(1);
  });
});
