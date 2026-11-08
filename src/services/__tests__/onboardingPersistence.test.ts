import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackOnboardingDone } from '@/services/analytics';
import { hasCompletedOnboarding, markOnboardingComplete } from '../onboardingPersistence';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/analytics', () => ({
  trackOnboardingDone: jest.fn(),
}));

describe('markOnboardingComplete', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('saves completion and sends onboarding_done once, however often it is called', async () => {
    await markOnboardingComplete();
    await markOnboardingComplete();

    expect(await hasCompletedOnboarding()).toBe(true);
    expect(trackOnboardingDone).toHaveBeenCalledTimes(1);
  });

  it('does not send onboarding_done for someone who already finished it', async () => {
    await AsyncStorage.setItem('@mindpulse/onboarding-complete', '1');

    await markOnboardingComplete();

    expect(trackOnboardingDone).not.toHaveBeenCalled();
  });
});
