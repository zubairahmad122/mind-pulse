import type { LucideIcon } from 'lucide-react-native';
import { Bell, BellRing, Sunrise, Waves, Wind, Music, CloudMoon, Star } from 'lucide-react-native';

export interface AlarmRingtoneOption {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Filename or resource identifier */
  soundFile: string;
  /** Demo URL for ringtone preview */
  previewUrl: string;
  color: string;
}

export interface VibrationPatternOption {
  id: string;
  label: string;
  description: string;
  /** Pattern of [on, off, on, off, ...] in ms */
  pattern: number[];
}

export const ALARM_RINGTONES: AlarmRingtoneOption[] = [
  {
    id: 'gentle-awake',
    label: 'Gentle Awake',
    subtitle: 'Soft rising tones',
    icon: Bell,
    soundFile: 'alarm_gentle.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    color: '#4FC3F7',
  },
  {
    id: 'sunrise-chime',
    label: 'Sunrise Chime',
    subtitle: 'Peaceful bells',
    icon: Sunrise,
    soundFile: 'alarm_sunrise.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    color: '#FF9800',
  },
  {
    id: 'ocean-drift',
    label: 'Ocean Drift',
    subtitle: 'Wave ambience',
    icon: Waves,
    soundFile: 'alarm_ocean.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    color: '#26C6DA',
  },
  {
    id: 'forest-birds',
    label: 'Forest Birds',
    subtitle: 'Nature melody',
    icon: Wind,
    soundFile: 'alarm_forest.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    color: '#66BB6A',
  },
  {
    id: 'deep-tone',
    label: 'Deep Tone',
    subtitle: 'Firm classic alarm',
    icon: BellRing,
    soundFile: 'alarm.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    color: '#FF5252',
  },
  {
    id: 'lullaby-soft',
    label: 'Lullaby Soft',
    subtitle: 'Melodic lullaby',
    icon: Music,
    soundFile: 'alarm_lullaby.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    color: '#CE93D8',
  },
  {
    id: 'night-stars',
    label: 'Night Stars',
    subtitle: 'Dreamy piano',
    icon: Star,
    soundFile: 'alarm_stars.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    color: '#7B61FF',
  },
  {
    id: 'zen-gong',
    label: 'Zen Gong',
    subtitle: 'Deep resonance',
    icon: CloudMoon,
    soundFile: 'alarm_zen.wav',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    color: '#80CBC4',
  },
];

export const VIBRATION_PATTERNS: VibrationPatternOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Even pulses',
    pattern: [400, 200, 400, 200],
  },
  {
    id: 'gentle',
    label: 'Gentle',
    description: 'Soft, light taps',
    pattern: [200, 600, 200, 600],
  },
  {
    id: 'gradual',
    label: 'Gradual',
    description: 'Slowly intensifying',
    pattern: [300, 300, 500, 300, 700, 400],
  },
  {
    id: 'rapid',
    label: 'Rapid Fire',
    description: 'Quick consecutive pulses',
    pattern: [100, 100, 100, 100, 100, 200],
  },
  {
    id: 'heartbeat',
    label: 'Heartbeat',
    description: 'Rhythmic thump-thump',
    pattern: [200, 100, 200, 600, 200, 100, 200, 600],
  },
  {
    id: 'none',
    label: 'None',
    description: 'Sound only, no vibration',
    pattern: [],
  },
];

export const SNOOZE_DURATIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
] as const;

export const SMART_ALARM_WINDOWS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
] as const;

export const DEFAULT_ALARM_SETTINGS = {
  ringtoneId: 'gentle-awake',
  vibrationPatternId: 'standard',
  snoozeDuration: 10,
  smartAlarmWindow: 30,
  alarmVolume: 0.8,
  alarmLabel: 'Wake up',
} as const;
