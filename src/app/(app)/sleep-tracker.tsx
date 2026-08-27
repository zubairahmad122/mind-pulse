import { Redirect, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/constants';

/** Legacy route — redirects to unified Sleep tab. */
export default function SleepTrackerRedirect() {
  const params = useLocalSearchParams<{ preset?: string }>();
  const href = params.preset
    ? `${ROUTES.appSleep}?tab=tonight&preset=${params.preset}`
    : `${ROUTES.appSleep}?tab=tonight`;

  return <Redirect href={href as never} />;
}
