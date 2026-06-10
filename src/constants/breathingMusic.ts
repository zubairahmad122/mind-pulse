import type { IoniconName } from './navigation';

export type BreathingMusicId = 'none' | 'ocean' | 'forest' | 'rain' | 'fire' | 'brown-noise';

export const BREATHING_MUSIC: Array<{
  id: BreathingMusicId;
  label: string;
  icon: IoniconName;
  color: string;
  url: string;
}> = [
  {
    id:    'none',
    label: 'Silent',
    icon:  'volume-mute-outline',
    color: '#6b7280',
    url:   '',
  },
  {
    id:    'ocean',
    label: 'Ocean',
    icon:  'water-outline',
    color: '#4FC3F7',
    url:   require('@/assets/sounds/releax/helkimer-ocean-ambient-chillout-music-258921.mp3'),
  },
  {
    id:    'forest',
    label: 'Forest',
    icon:  'leaf-outline',
    color: '#4CAF50',
    url:   require('@/assets/sounds/releax/forest.mp3'),
  },
  {
    id:    'rain',
    label: 'Rain',
    icon:  'rainy-outline',
    color: '#64B5F6',
    url:   require('@/assets/sounds/releax/rain.mp3'),
  },
  {
    id:    'fire',
    label: 'Fireplace',
    icon:  'flame',
    color: '#FF7043',
    url:   require('@/assets/sounds/releax/fire.mp3'),
  },
  {
    id:    'brown-noise',
    label: 'Brown Noise',
    icon:  'disc-outline',
    color: '#A1887F',
    url:   require('@/assets/sounds/releax/brown-noise.mp3'),
  },
];
