import {
  digitalSunsetEyeResetRoute,
  digitalSunsetOfflineRoute,
  digitalSunsetSleepRoute,
  digitalSunsetWindDownRoute,
} from '../digitalSunsetRoutes';
import { ROUTES } from '@/constants/routes';

describe('Digital Sunset routes', () => {
  it('routes Go Offline to the existing Offline flow with 15 min preselected', () => {
    expect(digitalSunsetOfflineRoute()).toEqual({
      pathname: ROUTES.appOfflineReset,
      params: { minutes: '15' },
    });
  });

  it('routes Wind Down to the existing Bedtime Relaxation session', () => {
    expect(digitalSunsetWindDownRoute()).toEqual({
      pathname: ROUTES.appRelaxPlayer,
      params: { sessionId: 'sleep-drop' },
    });
  });

  it('routes Eye Reset to the existing CVS/Eye Reset flow', () => {
    expect(digitalSunsetEyeResetRoute()).toBe(ROUTES.appCvsProtocol);
  });

  it('routes Sleep to the existing Sleep tab flow', () => {
    expect(digitalSunsetSleepRoute()).toEqual({
      pathname: ROUTES.appSleep,
      params: { tab: 'tonight' },
    });
  });
});
