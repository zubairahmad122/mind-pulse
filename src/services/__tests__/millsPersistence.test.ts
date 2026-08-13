import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialGame, placePiece, serializeGameState } from '@/engine/core/games/mills';
import { clearMillsMatch, loadMillsMatch, saveMillsMatch } from '../millsPersistence';

jest.mock('@react-native-async-storage/async-storage', () => ({ setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn(), multiRemove: jest.fn() }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
describe('mills persistence', () => {
  beforeEach(() => jest.clearAllMocks());
  test('saves and restores a match including undo history', async () => {
    const state = placePiece(createInitialGame({}, 1), 'a7');
    storage.getItem.mockResolvedValue(serializeGameState(state));
    await expect(loadMillsMatch()).resolves.toEqual(state);
    await saveMillsMatch(state);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
  test('returns null for missing and corrupt state', async () => {
    storage.getItem.mockResolvedValue(null);
    await expect(loadMillsMatch()).resolves.toBeNull();
    storage.getItem.mockResolvedValue('{bad');
    await expect(loadMillsMatch()).resolves.toBeNull();
  });
  test('clears saved match', async () => {
    await clearMillsMatch();
    expect(storage.multiRemove).toHaveBeenCalledWith([
      '@mindpulse/mills/local-match-v2',
      '@mindpulse/mills/local-match',
    ]);
  });
});
