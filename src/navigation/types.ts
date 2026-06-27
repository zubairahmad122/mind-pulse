// ──────────────────────────────────────────────────────────────────────────────
// Navigation types — TypeScript types for all screen params
// ──────────────────────────────────────────────────────────────────────────────

import type { NavigatorScreenParams } from '@react-navigation/native';

// ── Root Stack ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Paywall: { source: 'onboarding' | 'session_limit' | 'settings' };
  FullReport: { reportType: 'sleep' | 'eye' | 'wellness' };
  AccountSettings: undefined;
};

// ── Main Tabs ───────────────────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  Sleep: NavigatorScreenParams<SleepStackParamList>;
  Relax: undefined;
  Eye: undefined;
  Profile: undefined;
};

// ── Sleep Stack (nested inside Sleep tab) ────────────────────────────────────

export type SleepStackParamList = {
  SleepMain: undefined;
  AlarmSettings: undefined;
  AlarmSound: undefined;
};

// ── Screen names as const (for use with navigation.navigate) ────────────────

export const SCREENS = {
  ROOT_ONBOARDING: 'Onboarding' as const,
  MAIN_TABS: 'MainTabs' as const,
  PAYWALL: 'Paywall' as const,
  FULL_REPORT: 'FullReport' as const,
  ACCOUNT_SETTINGS: 'AccountSettings' as const,

  TAB_HOME: 'Home' as const,
  TAB_SLEEP: 'Sleep' as const,
  TAB_RELAX: 'Relax' as const,
  TAB_EYE: 'Eye' as const,
  TAB_PROFILE: 'Profile' as const,

  SLEEP_MAIN: 'SleepMain' as const,
  SLEEP_ALARM_SETTINGS: 'AlarmSettings' as const,
  SLEEP_ALARM_SOUND: 'AlarmSound' as const,
} as const;

// ── Deep linking ────────────────────────────────────────────────────────────

export const DEEP_LINKS = {
  SLEEP_TONIGHT: 'mindpulse://sleep/tonight',
  EYE_EXERCISE: 'mindpulse://eye/exercise',
  PAYWALL: 'mindpulse://paywall',
} as const;
