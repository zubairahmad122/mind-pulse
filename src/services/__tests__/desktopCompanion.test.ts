import { companionAndroidChannelId } from '../desktopCompanion';
// The module imports AsyncStorage, whose native module is null under Jest.
// jest.mock is hoisted, so this order is safe.
jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory (matches useAudioGuide/useWellnessStore tests)
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

/**
 * The Sound toggle switches Android delivery between two channels (channels
 * are immutable once created, so the reminder is delivered on a separate
 * silent channel when sound is off). The IDs are pinned here on purpose:
 * changing them would orphan previously-created channels on installed devices.
 */
describe('desktopCompanion — Android channel selection (Sound toggle)', () => {
  it('delivers on the sound channel when soundOn is true', () => {
    expect(companionAndroidChannelId(true)).toBe('eye-companion-session-v1');
  });

  it('delivers on the silent channel when soundOn is false', () => {
    expect(companionAndroidChannelId(false)).toBe(
      'eye-companion-session-silent-v1',
    );
  });

  it('keeps the two channels distinct so the toggle actually switches', () => {
    expect(companionAndroidChannelId(true)).not.toBe(
      companionAndroidChannelId(false),
    );
  });
});
