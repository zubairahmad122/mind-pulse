import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { getFocusDndPreference, setFocusDndPreference } from '@/services/focusDndPreference';
import { hasDndAccess, openDndAccessSettings } from '@/services/screenUsageService';
import { syncFocusDnd } from '@/services/focusDndSync';

const EXPLAINER =
  "Well Mode can silence ordinary notifications on your whole phone while you're focusing — calls, alarms, and anyone you've starred as a priority contact still get through.\n\nAndroid will open a list of every app — scroll down, find \"Well Mode\", and turn it on. There's no faster way Android allows for this specific permission; every app that offers this works the same way.";

const SETTINGS_UNAVAILABLE =
  "Couldn't open Do Not Disturb access automatically on this device.\n\nYou can still grant it yourself: Settings → Notifications → \"Do Not Disturb access\" (or \"Special app access\") → Well Mode → Allow.";

/**
 * Settings toggle for "silence notifications during Focus" — mirrors
 * useEveningReminderSetting's shape: the actual system access is only ever
 * requested from this explicit toggle, never silently. Unlike a normal
 * runtime permission, Do Not Disturb access has no quick request dialog —
 * turning it on sends the user away to Android Settings, a completely
 * separate app, so there's no in-app navigation event when they come back;
 * this listens to `AppState` directly rather than relying on the screen's
 * own focus (which only fires on in-app navigation, not an OS-level
 * app-switch back from Settings).
 *
 * Also tracks *intent*, not just access: tapping "on" before access is
 * granted doesn't persist anything yet (there's nothing valid to persist).
 * If access is then granted in Settings and the user returns, the pending
 * "I tapped on" intent is what actually flips the preference on — without
 * it, returning from Settings would show `granted: true` but the toggle
 * would still read "off", since nothing ever told it the user wanted "on".
 */
export function useFocusDndSetting(uid?: string) {
  const [enabled, setEnabled] = useState(false);
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const pendingEnableRef = useRef(false);

  const applyPendingEnable = useCallback(
    async (nowGranted: boolean) => {
      if (!nowGranted || !pendingEnableRef.current) return;
      pendingEnableRef.current = false;
      setEnabled(true);
      await setFocusDndPreference(uid, true);
      void syncFocusDnd(uid);
    },
    [uid],
  );

  const refresh = useCallback(async () => {
    const [preference, access] = await Promise.all([getFocusDndPreference(uid), hasDndAccess()]);
    setGranted(access);
    if (pendingEnableRef.current && access) {
      await applyPendingEnable(access);
    } else {
      setEnabled(preference);
    }
    setLoading(false);
  }, [applyPendingEnable, uid]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getFocusDndPreference(uid), hasDndAccess()]).then(([preference, access]) => {
      if (cancelled) return;
      setEnabled(preference);
      setGranted(access);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // The actual trigger for "did the user come back from Settings": an
  // OS-level app foreground, not a React Navigation focus event.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (next && !granted) {
        pendingEnableRef.current = true;
        Alert.alert('Silence Notifications', EXPLAINER, [
          { text: 'Not now', style: 'cancel', onPress: () => { pendingEnableRef.current = false; } },
          {
            text: 'Continue to Settings',
            onPress: () => {
              void (async () => {
                const opened = await openDndAccessSettings();
                // Never let the tap be a silent no-op — either the Settings
                // screen opens, or the user sees exactly why it didn't and
                // what to do instead.
                if (!opened) {
                  pendingEnableRef.current = false;
                  Alert.alert('Settings Unavailable', SETTINGS_UNAVAILABLE);
                }
              })();
            },
          },
        ]);
        return; // preference stays off until access is confirmed granted (see refresh/applyPendingEnable above)
      }
      pendingEnableRef.current = false;
      setEnabled(next);
      await setFocusDndPreference(uid, next);
      void syncFocusDnd(uid); // applies immediately if a focus session is active right now
    },
    [granted, uid],
  );

  return { enabled, granted, loading, toggle, refresh };
}
