import { ROUTES } from '@/constants/routes';

export function digitalSunsetOfflineRoute() {
  return {
    pathname: ROUTES.appOfflineReset,
    params: { minutes: '15' },
  } as const;
}

export function digitalSunsetWindDownRoute() {
  return {
    pathname: ROUTES.appRelaxPlayer,
    params: { sessionId: 'sleep-drop' },
  } as const;
}

export function digitalSunsetEyeResetRoute() {
  return ROUTES.appCvsProtocol;
}

export function digitalSunsetSleepRoute() {
  return {
    pathname: ROUTES.appSleep,
    params: { tab: 'tonight' },
  } as const;
}
