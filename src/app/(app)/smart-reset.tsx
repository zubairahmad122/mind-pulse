import { Redirect, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import type { ResetType } from '@/services/screenBalancePersistence';

export default function SmartResetRedirect() {
  const params = useLocalSearchParams<{
    recommendedReset?: ResetType;
    notificationId?: string;
  }>();

  return (
    <Redirect
      href={{
        pathname: ROUTES.appHome,
        params: {
          smartReset: '1',
          recommendedReset: params.recommendedReset,
          notificationId: params.notificationId,
        },
      } as never}
    />
  );
}
