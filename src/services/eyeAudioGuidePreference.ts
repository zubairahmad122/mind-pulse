import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@mindpulse/eye-audio-guide-enabled';

/** Default: spoken eye guidance (20-20-20 break + Eye Reset) is ON. */
const DEFAULT = true;

export async function loadEyeAudioGuideEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return DEFAULT;
    return raw !== 'false';
  } catch {
    return DEFAULT;
  }
}

export async function saveEyeAudioGuideEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(enabled));
  } catch {
    // Preference can still proceed for the current app session.
  }
}
