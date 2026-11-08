import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ASKED_KEY = '@mindpulse/store-review-last-asked';
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Requests the Play in-app review sheet at most once every 60 days. Play can
 * still decide not to show it. Returns true when a request was made.
 */
export async function maybeRequestStoreReview(): Promise<boolean> {
  try {
    const lastAsked = Number(await AsyncStorage.getItem(LAST_ASKED_KEY)) || 0;
    if (Date.now() - lastAsked < COOLDOWN_MS) return false;

    // Lazy: a dev build made before this native module was added must still run.
    const StoreReview = await import('expo-store-review');
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return false;

    await AsyncStorage.setItem(LAST_ASKED_KEY, String(Date.now()));
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
