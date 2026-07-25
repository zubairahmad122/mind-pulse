import { useRouter , Stack } from 'expo-router';
import { useEffect } from 'react';
import { BACKGROUND } from '@/constants/designSystem';
import { AlarmOverlayProvider } from '@/context/AlarmOverlayContext';
import { SleepProvider } from '@/context/SleepContext';
import { EYE_BREAK_NOTIF_PREFIX } from '@/services/eyeBreakNotification';
import { ROUTES } from '@/constants';
import { useStreakSync } from '@/hooks/useStreakSync';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useEveningReminderSync } from '@/hooks/useEveningReminderSync';
import { useSurpriseBadgeSync } from '@/hooks/useSurpriseBadgeSync';
import { useWellnessCloudSync } from '@/hooks/useWellnessCloudSync';

export default function AppStackLayout() {
  const router = useRouter();

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
            router.push(ROUTES.appEyeBreak as never);
          }
        });
      })
      .catch(() => undefined);

    return () => {
      sub?.remove();
    };
  }, []);

  return (
    <AlarmOverlayProvider>
      <SleepProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: BACKGROUND.base } }} />
      </SleepProvider>
    </AlarmOverlayProvider>
  );
}
