import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameId } from '@/services/gameRecords';
import {
  calculateEyeGameLevel,
  xpForGameRating,
  type EyeGameLevelProgress,
  type GameRating,
} from '@/utils/eyeGameProgress';

export interface EyeGameProgressRecord {
  totalXp: number;
  roundsCompleted: number;
  lastPlayedAt: number | null;
}

export interface EyeGameReward {
  xpAwarded: number;
  leveledUp: boolean;
  before: EyeGameLevelProgress;
  after: EyeGameLevelProgress;
}

const EMPTY_PROGRESS: EyeGameProgressRecord = {
  totalXp: 0,
  roundsCompleted: 0,
  lastPlayedAt: null,
};

function progressKey(uid?: string): string {
  return `@mindpulse/eye-game-progress:${uid ?? 'guest'}`;
}

export async function loadEyeGameProgress(
  uid?: string,
): Promise<EyeGameProgressRecord> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(uid));
    return raw ? (JSON.parse(raw) as EyeGameProgressRecord) : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function awardEyeGameXp(
  uid: string | undefined,
  _gameId: GameId,
  rating: GameRating,
): Promise<EyeGameReward> {
  const current = await loadEyeGameProgress(uid);
  const xpAwarded = xpForGameRating(rating);
  const next: EyeGameProgressRecord = {
    totalXp: current.totalXp + xpAwarded,
    roundsCompleted: current.roundsCompleted + 1,
    lastPlayedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(progressKey(uid), JSON.stringify(next));
  } catch {
    // Return the in-memory reward so the completed round still feels responsive.
  }

  const before = calculateEyeGameLevel(current.totalXp);
  const after = calculateEyeGameLevel(next.totalXp);
  return {
    xpAwarded,
    leveledUp: after.level > before.level,
    before,
    after,
  };
}
