import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DEFAULT_ALARM_SETTINGS } from '@/constants/alarmSounds';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const STORAGE_KEY = '@mindpulse/alarm-settings';

describe('useAlarmSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps selected ringtone in sync across mounted consumers', async () => {
    const first = renderHook(() => useAlarmSettings());
    const second = renderHook(() => useAlarmSettings());

    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    expect(first.result.current.selectedRingtone).toBe(DEFAULT_ALARM_SETTINGS.ringtoneId);
    expect(second.result.current.selectedRingtone).toBe(DEFAULT_ALARM_SETTINGS.ringtoneId);

    act(() => {
      second.result.current.setSelectedRingtone('wind-chime');
    });

    expect(first.result.current.selectedRingtone).toBe('wind-chime');
    expect(second.result.current.selectedRingtone).toBe('wind-chime');

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
      expect(stored.selectedRingtone).toBe('wind-chime');
    });
  });
});
