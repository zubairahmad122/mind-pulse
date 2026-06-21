import { useRouter , Stack } from 'expo-router';
import { useEffect } from 'react';
import { AlarmOverlayProvider } from '@/context/AlarmOverlayContext';
import { SleepProvider } from '@/context/SleepContext';
import { EYE_BREAK_NOTIF_PREFIX } from '@/services/eyeBreakNotification';
import { ROUTES } from '@/constants';

export default function AppStackLayout() {
  const router = useRouter();

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
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </SleepProvider>
    </AlarmOverlayProvider>
  );
}
