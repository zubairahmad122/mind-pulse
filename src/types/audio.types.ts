import type { FeatureId } from '@/constants/entitlements';

export type AudioCategory =
  | 'sleep'
  | 'meditation'
  | 'stress_relief'
  | 'depression_help'
  | 'breathing';

export type AudioMood = 'stressed' | 'sad' | 'sleepy' | 'calm';

export interface AudioTrack {
  id: string;
  title: string;
  description: string;
  category: AudioCategory;
  duration: number;
  url: string;
  /** Entitlement gating this track. Omit for free, ungated tracks. */
  featureId?: FeatureId;
  moodTags: string[];
}
