import { useRouter , Stack } from 'expo-router';
import { useEffect } from 'react';
import { BACKGROUND } from '@/constants/designSystem';
import { AlarmOverlayProvider } from '@/context/AlarmOverlayContext';
import { SleepProvider } from '@/context/SleepContext';
import {
  EYE_BREAK_NOTIF_PREFIX,
  EYE_BREAK_SNOOZE_ACTION,
  scheduleEyeBreakSnooze,
} from '@/services/eyeBreakNotification';
import {
  COMPANION_NOTIF_PREFIX,
  COMPANION_SNOOZE_ACTION,
  scheduleCompanionSnooze,
} from '@/services/desktopCompanion';
import {
  isEveningReminderNotificationId,
} from '@/services/eveningReminder';
import { ROUTES } from '@/constants';
import { useActivitySync } from '@/hooks/useActivity';
import { useStreakSync } from '@/hooks/useStreakSync';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useEveningReminderSync } from '@/hooks/useEveningReminderSync';
import { useSmartResetReminderSync } from '@/hooks/useSmartResetReminderSync';
import { useScreenTimeAlertSync } from '@/hooks/useScreenTimeAlertSync';
import { useDailyUsageAlertSync } from '@/hooks/useDailyUsageAlertSync';
import { useFocusDndSync } from '@/hooks/useFocusDndSync';
import { useDigitalSunsetSync } from '@/hooks/useDigitalSunsetSync';
import { useSurpriseBadgeSync } from '@/hooks/useSurpriseBadgeSync';
import { useWellnessCloudSync } from '@/hooks/useWellnessCloudSync';
import { useAuth } from '@/context/AuthContext';
import { recordEyeBreakReminderEvent } from '@/services/eyeBreakReminderEvents';
import { DIGITAL_SUNSET_NOTIFICATION_PREFIX, markDigitalSunsetOpened } from '@/services/digitalSunset';
import {
  trackDailyReminderOpened,
  trackReminderSnoozed,
  trackUsageAlertOpened,
} from '@/services/analytics';
import {
  HIGH_DAILY_USAGE_NOTIF_PREFIX,
  LONG_SESSION_USAGE_NOTIF_PREFIX,
} from '@/services/excessiveUsageAlerts';

export default function AppStackLayout() {
  const router = useRouter();
  const { user } = useAuth();

  useActivitySync();
  useStreakSync();
  useDailyCheckIn();
  useEveningReminderSync();
  useSmartResetReminderSync();
  useScreenTimeAlertSync();
  useDailyUsageAlertSync();
  useFocusDndSync();
  useDigitalSunsetSync();
  useSurpriseBadgeSync();
  useWellnessCloudSync();

  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    import('expo-notifications')
      .then(N => {
        sub = N.addNotificationResponseReceivedListener(response => {
          const id = response.notification.request.identifier;
          const data = response.notification.request.content.data as
            | { kind?: string; route?: string; breakSeconds?: number; test?: boolean }
            | undefined;

          if (isEveningReminderNotificationId(id) || data?.kind === 'evening-reminder') {
            trackDailyReminderOpened(data?.test ? 'test' : 'notification');
            router.push({
              pathname: ROUTES.appEyeBreak,
              params: { source: 'evening-reminder', notificationId: id },
            } as never);
            return;
          }

          if (id.startsWith(EYE_BREAK_NOTIF_PREFIX)) {
            if (response.actionIdentifier === EYE_BREAK_SNOOZE_ACTION) {
              void scheduleEyeBreakSnooze();
              trackReminderSnoozed('eye_break');
              void recordEyeBreakReminderEvent(user?.uid, {
                type: 'snoozed',
                occurredAt: Date.now(),
                notificationId: id,
              });
              return;
            }
            void recordEyeBreakReminderEvent(user?.uid, {
              type: 'opened',
              occurredAt: Date.now(),
              notificationId: id,
            });
            router.push({
              pathname: ROUTES.appEyeBreak,
              params: { source: 'reminder', notificationId: id },
            } as never);
            return;
          }
          if (id.startsWith(COMPANION_NOTIF_PREFIX)) {
            if (response.actionIdentifier === COMPANION_SNOOZE_ACTION) {
              void scheduleCompanionSnooze(user?.uid);
              trackReminderSnoozed('companion');
              return;
            }
            router.push({
              pathname: ROUTES.appEyeBreak,
              params: { duration: String(data?.breakSeconds ?? 20) },
            } as never);
            return;
          }
          if (id.startsWith(LONG_SESSION_USAGE_NOTIF_PREFIX)) {
            trackUsageAlertOpened('long_session');
            router.push(ROUTES.appEyeBreak as never);
            return;
          }
          if (id.startsWith(HIGH_DAILY_USAGE_NOTIF_PREFIX)) {
            trackUsageAlertOpened('high_daily');
            router.push(ROUTES.appScreenBalance as never);
            return;
          }
          if (id.startsWith(DIGITAL_SUNSET_NOTIFICATION_PREFIX)) {
            void markDigitalSunsetOpened(user?.uid);
            router.push(ROUTES.appDigitalSunset as never);
          }
        });
      })
      .catch(() => undefined);

    return () => {
      sub?.remove();
    };
  }, [router, user?.uid]);

  return (
    <AlarmOverlayProvider>
      <SleepProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: BACKGROUND.base } }} />
      </SleepProvider>
    </AlarmOverlayProvider>
  );
}
