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
import { ROUTES } from '@/constants';
import { useStreakSync } from '@/hooks/useStreakSync';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useEveningReminderSync } from '@/hooks/useEveningReminderSync';
import { useSurpriseBadgeSync } from '@/hooks/useSurpriseBadgeSync';
import { useWellnessCloudSync } from '@/hooks/useWellnessCloudSync';
import { useAuth } from '@/context/AuthContext';
import { recordEyeBreakReminderEvent } from '@/services/eyeBreakReminderEvents';

export default function AppStackLayout() {
  const router = useRouter();
  const { user } = useAuth();

  useStreakSync();
  useDailyCheckIn();
  useEveningReminderSync();
  useSurpriseBadgeSync();
  useWellnessCloudSync();

  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    import('expo-notifications')
      .then(N => {
        sub = N.addNotificationResponseReceivedListener(response => {
          const id = response.notification.request.identifier;
          if (id.startsWith(EYE_BREAK_NOTIF_PREFIX)) {
            if (response.actionIdentifier === EYE_BREAK_SNOOZE_ACTION) {
              void scheduleEyeBreakSnooze();
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
