import type { LucideIcon } from 'lucide-react-native';
import { VolumeX, Droplets, Leaf, CloudRain, Flame, Disc } from 'lucide-react-native';

export type BreathingMusicId = 'none' | 'ocean' | 'forest' | 'rain' | 'fire' | 'brown-noise';

export const BREATHING_MUSIC: {
  id: BreathingMusicId;
  label: string;
  icon: LucideIcon;
  color: string;
  url: string;
}[] = [
  {
    id:    'none',
    label: 'Silent',
    icon:  VolumeX,
    color: '#6b7280',
    url:   '',
  },
  {
    id:    'ocean',
    label: 'Ocean',
    icon:  Droplets,
    color: '#4FC3F7',
    url:   require('@/assets/sounds/releax/helkimer-ocean-ambient-chillout-music-258921.mp3'),
  },
  {
    id:    'forest',
    label: 'Forest',
    icon:  Leaf,
    color: '#4CAF50',
    url:   require('@/assets/sounds/releax/forest.mp3'),
  },
  {
    id:    'rain',
    label: 'Rain',
    icon:  CloudRain,
    color: '#64B5F6',
    url:   require('@/assets/sounds/releax/rain.mp3'),
  },
  {
    id:    'fire',
    label: 'Fireplace',
    icon:  Flame,
    color: '#FF7043',
    url:   require('@/assets/sounds/releax/fire.mp3'),
  },
  {
    id:    'brown-noise',
    label: 'Brown Noise',
    icon:  Disc,
    color: '#A1887F',
    url:   require('@/assets/sounds/releax/brown-noise.mp3'),
  },
];
