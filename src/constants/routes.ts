/** Expo Router hrefs — single source for navigation strings */
export const ROUTES = {
  welcome: '/',
  appHome: '/(app)/(tabs)/home',
  appSleep: '/(app)/(tabs)/sleep',
  appSleepTracker: '/(app)/sleep-tracker',
  appRelax: '/(app)/(tabs)/relax',
  // The Mind hub — repurposed from the old "Eye Games" screen; lives on the
  // `challenges` tab route (bottom-nav label is "Mind", see navigation.ts).
  appMind: '/(app)/(tabs)/challenges',
  appReport: '/(app)/(tabs)/report',
  appRecovery: '/(app)/(tabs)/recovery',
  appEyeRelax: '/(app)/(tabs)/eye-relax',
  // Streaks/achievements screen — moved off the bottom tab bar (Mind took
  // its slot) onto a hidden tab, reachable the same way as before via this
  // route constant.
  appChallenges: '/(app)/(tabs)/streaks',
  appProfile: '/(app)/(tabs)/profile',
  appHistory: '/(app)/history',
  appAchievements: '/(app)/achievements',
  appEditProfile: '/(app)/edit-profile',
  appPremium: '/(app)/premium',
  appAudioPlayer: '/(app)/audio-player',
  // Breathing entry points open the Relax player (the one real breathing
  // engine) — the old standalone Box Breathing / Calm Wave screens are gone.
  appBoxBreathing: '/(app)/relax/player?sessionId=box-breathing',
  appBodyScan: '/(app)/stress/body-scan',
  appJournal: '/(app)/stress/journal',
  appEyeGame: (id: string) => `/(app)/eye-game/${id}` as const,
  appEyeGames: '/(app)/eye-games',
  appEyeExercises: '/(app)/eye-exercises',
  appCvsProtocol: '/(app)/cvs-protocol',
  appSchulteNexus: '/(app)/schulte-nexus',
  appMills: '/(app)/mills',
  appMillsSetup: '/(app)/mills/setup',
  appMillsMatch: '/(app)/mills/match',
  appMillsRules: '/(app)/mills/rules',
  appMillsResults: '/(app)/mills/results',
  appEyeBreak: '/(app)/eye-break',
  // Screen Balance MVP — Move and Go Offline resets.
  appMoveReset: '/(app)/move-reset',
  appOfflineReset: '/(app)/offline-reset',
  appOfflineSession: '/(app)/offline-session',
  appScreenBalance: '/(app)/screen-balance',
  appGrounding: '/(app)/stress/grounding',
  appCalmWave: '/(app)/relax/player?sessionId=calm-flow',
  appTensionRelease: '/(app)/stress/tension-release',
  appBreathe:        '/(app)/stress/breathe',
  appAlarmSettings:  '/(app)/alarm-settings',
  appRelaxPlayer:    '/(app)/relax/player',
  appRelaxLibrary:   '/(app)/relax/library',
  appRelaxCompletion: '/(app)/relax/completion',
  authOnboarding: '/(auth)/onboarding',
  authAgeInput: '/(auth)/age-input',
  authSignIn: '/(auth)/sign-in',
  authCreateAccount: '/(auth)/create-account',
  authForgotPassword: '/(auth)/forgot-password',
} as const;
