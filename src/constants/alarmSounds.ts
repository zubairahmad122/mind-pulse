import type { LucideIcon } from 'lucide-react-native';
import {
  Music,
  Music2,
  Bell,
  BellRing,
  Sunrise,
  Zap,
  Siren,
  AlertCircle,
  Wind,
  AlarmClock,
  Radio,
  CloudMoon,
  Phone,
  Waves,
} from 'lucide-react-native';

export interface AlarmRingtoneOption {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Local MP3 filename (bundled in assets/sounds/alarms/) */
  soundFile: string;
  /** Fallback remote URL (used when local asset is unavailable) */
  remoteUrl: string;
  color: string;
}

export interface VibrationPatternOption {
  id: string;
  label: string;
  description: string;
  /** Pattern of [on, off, on, off, ...] in ms */
  pattern: number[];
}

/**
 * Map ringtone IDs to local bundled audio assets via Expo's require().
 * Returns the module ID that `createAudioPlayer` can consume directly.
 */
export function getRingtoneRequire(ringtoneId: string): number {
  const map: Record<string, number> = {
    'marimba-pulse': require('@/assets/sounds/alarms/marimba-pulse.mp3'),
    'gentle-chime': require('@/assets/sounds/alarms/gentle-chime.mp3'),
    'peaceful-morning': require('@/assets/sounds/alarms/peaceful-morning.mp3'),
    'energy-pulse': require('@/assets/sounds/alarms/energy-pulse.mp3'),
    'classic-siren': require('@/assets/sounds/alarms/classic-siren.mp3'),
    'sharp-alert': require('@/assets/sounds/alarms/sharp-alert.mp3'),
    'wind-chime': require('@/assets/sounds/alarms/wind-chime.mp3'),
    'urgent-alarm': require('@/assets/sounds/alarms/urgent-alarm.mp3'),
    'digital-pulse': require('@/assets/sounds/alarms/digital-pulse.mp3'),
    'night-bells': require('@/assets/sounds/alarms/night-bells.mp3'),
    'morning-alarm': require('@/assets/sounds/alarms/morning-alarm.mp3'),
    'classic-ring': require('@/assets/sounds/alarms/classic-ring.mp3'),
    'marimba-melody': require('@/assets/sounds/alarms/marimba-melody.mp3'),
    'soft-ringtone': require('@/assets/sounds/alarms/soft-ringtone.mp3'),
  };
  return map[ringtoneId] ?? map['morning-alarm'];
}

export const ALARM_RINGTONES: AlarmRingtoneOption[] = [
  {
    id: 'morning-alarm',
    label: 'Morning Alarm',
    subtitle: 'Classic wake-up tone',
    icon: AlarmClock,
    soundFile: 'morning-alarm.mp3',
    remoteUrl: '',
    color: '#FF9800',
  },
  {
    id: 'gentle-chime',
    label: 'Gentle Chime',
    subtitle: 'Soft car-chime tone',
    icon: Bell,
    soundFile: 'gentle-chime.mp3',
    remoteUrl: '',
    color: '#4FC3F7',
  },
  {
    id: 'peaceful-morning',
    label: 'Peaceful Morning',
    subtitle: 'Calm, gentle melody',
    icon: Sunrise,
    soundFile: 'peaceful-morning.mp3',
    remoteUrl: '',
    color: '#FFB74D',
  },
  {
    id: 'wind-chime',
    label: 'Wind Chime',
    subtitle: 'Light, airy bells',
    icon: Wind,
    soundFile: 'wind-chime.mp3',
    remoteUrl: '',
    color: '#66BB6A',
  },
  {
    id: 'night-bells',
    label: 'Night Bells',
    subtitle: 'Dreamy bell loop',
    icon: CloudMoon,
    soundFile: 'night-bells.mp3',
    remoteUrl: '',
    color: '#a78bfa',
  },
  {
    id: 'soft-ringtone',
    label: 'Soft Ringtone',
    subtitle: 'Smooth, mellow tone',
    icon: Waves,
    soundFile: 'soft-ringtone.mp3',
    remoteUrl: '',
    color: '#26C6DA',
  },
  {
    id: 'classic-ring',
    label: 'Classic Ring',
    subtitle: 'Traditional phone ring',
    icon: Phone,
    soundFile: 'classic-ring.mp3',
    remoteUrl: '',
    color: '#80CBC4',
  },
  {
    id: 'marimba-melody',
    label: 'Marimba Melody',
    subtitle: 'Warm percussive tune',
    icon: Music2,
    soundFile: 'marimba-melody.mp3',
    remoteUrl: '',
    color: '#CE93D8',
  },
  {
    id: 'marimba-pulse',
    label: 'Marimba Pulse',
    subtitle: 'Short rhythmic loop',
    icon: Music,
    soundFile: 'marimba-pulse.mp3',
    remoteUrl: '',
    color: '#BA68C8',
  },
  {
    id: 'digital-pulse',
    label: 'Digital Pulse',
    subtitle: 'Electronic beep loop',
    icon: Radio,
    soundFile: 'digital-pulse.mp3',
    remoteUrl: '',
    color: '#42A5F5',
  },
  {
    id: 'energy-pulse',
    label: 'Energy Pulse',
    subtitle: 'Bright sci-fi burst',
    icon: Zap,
    soundFile: 'energy-pulse.mp3',
    remoteUrl: '',
    color: '#FFD54F',
  },
  {
    id: 'sharp-alert',
    label: 'Sharp Alert',
    subtitle: 'Short, attention-grabbing',
    icon: AlertCircle,
    soundFile: 'sharp-alert.mp3',
    remoteUrl: '',
    color: '#FF7043',
  },
  {
    id: 'urgent-alarm',
    label: 'Urgent Alarm',
    subtitle: 'Loud emergency tone',
    icon: BellRing,
    soundFile: 'urgent-alarm.mp3',
    remoteUrl: '',
    color: '#EF5350',
  },
  {
    id: 'classic-siren',
    label: 'Classic Siren',
    subtitle: 'Heavy-duty wake call',
    icon: Siren,
    soundFile: 'classic-siren.mp3',
    remoteUrl: '',
    color: '#FF5252',
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
  ringtoneId: 'morning-alarm',
  vibrationPatternId: 'standard',
  snoozeDuration: 10,
  smartAlarmWindow: 30,
  alarmVolume: 0.8,
  alarmLabel: 'Wake up',
} as const;
