export {
  createStartingSkillProfile,
  interpretRecentPerformance,
  personalBestClassKey,
  recordMissionAttempt,
  selectNextMission,
  stepDirectionFor,
  type RecordMissionAttemptResult,
  type SchulteDifficultyStep,
  type SchultePerformanceCase,
  type SelectNextMissionInput,
  type SelectNextMissionResult,
} from './missionDirector';

export { buildDirectorChallenge, type DirectorChallengeConfig, type SchulteNumberParity } from './challengeBuilder';

export {
  canAccessSchulteLevel,
  getSchulteLevelDefinition,
  getSchulteLevelEnvelope,
  resolveSchulteLevelAccess,
  SCHULTE_FREE_LEVEL_MAX,
  type SchulteLevelAccessResult,
  type SchulteLevelAccessState,
  type SchulteLevelDefinition,
  type SchulteLevelEnvelope,
} from './levels';

export {
  applySchulteLevelProgress,
  calculateSchulteLevelProgress,
  createStartingLevelState,
  type SchulteLevelState,
} from './levelProgress';

export {
  resolveNextSchulteLevelMission,
  type ResolveLevelMissionInput,
  type ResolveLevelMissionResult,
} from './levelMission';

export {
  averageVectorComplexity,
  changedDirectorDimensions,
  clampDirectorLadderIndex,
  controlOrientedVector,
  DIRECTOR_LADDER,
  DIRECTOR_LADDER_MAX_INDEX,
  DIRECTOR_LADDER_MIN_INDEX,
  directorVectorAt,
} from './ladder';

export { calculateAdaptiveTimeLimit, missionBandFor } from './timer';
export { calculateFamilyMastery } from './mastery';
export { calculateOverallRating, ratingBandFor } from './rating';
export { calculateNoveltyScore, shouldRejectCandidate, type SchulteNoveltyMeta } from './novelty';
export { buildPersonalMissionSeed } from './seed';
export { layoutRectBoard } from './board';

export {
  SCHULTE_DEFAULT_NUMBER_RANGE,
  SCHULTE_DIRECTOR_DIMENSIONS,
  SCHULTE_RATING_BANDS,
  type SchulteDirectorDimension,
  type SchulteDirectorVector,
  type SchulteFamilyMastery,
  type SchulteMissionAttempt,
  type SchulteMissionBand,
  type SchulteMissionResult,
  type SchultePersonalBestEntry,
  type SchultePlayerSkillProfile,
  type SchulteNumberRangeConfig,
} from './types';
