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
  isPremium: boolean;
  moodTags: string[];
}
