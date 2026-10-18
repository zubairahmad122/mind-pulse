import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether the user has opted into silencing system-wide notifications
 * during Focus sessions — separate from whether Android's "Do Not Disturb
 * access" has actually been granted (see `hasDndAccess` in
 * `screenUsageService.ts`). Both must be true before DND is actually
 * toggled; see `focusDndSync.ts`.
 */
const KEY_PREFIX = '@mindpulse/focus-dnd-enabled:';

function key(uid?: string): string {
  return `${KEY_PREFIX}${uid ?? 'guest'}`;
}

export async function getFocusDndPreference(uid?: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(uid))) === 'true';
  } catch {
    return false;
  }
}

export async function setFocusDndPreference(uid: string | undefined, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key(uid), enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}
