import { AudioCategory, AudioMood, AudioTrack } from '@/types/audio.types';

export const AUDIO_MOODS: { id: AudioMood; label: string; emoji: string }[] = [
  { id: 'stressed', label: 'Stressed', emoji: '😰' },
  { id: 'sad', label: 'Sad', emoji: '😔' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😴' },
  { id: 'calm', label: 'Calm', emoji: '😌' },
];

export const AUDIO_CATEGORIES: { id: AudioCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'meditation', label: 'Meditation' },
  { id: 'stress_relief', label: 'Stress Relief' },
  { id: 'depression_help', label: 'Depression Help' },
  { id: 'breathing', label: 'Breathing' },
];

/** Demo streams — replace with Firebase Storage URLs in production. */
export const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: '1',
    title: 'Deep Night Drift',
    description: 'Soft ambient tones for falling asleep',
    category: 'sleep',
    duration: 600,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isPremium: false,
    moodTags: ['sleepy', 'calm'],
  },
  {
    id: '2',
    title: 'Ocean Breath',
    description: 'Guided breathing with wave sounds',
    category: 'breathing',
    duration: 480,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isPremium: false,
    moodTags: ['stressed', 'calm'],
  },
  {
    id: '3',
    title: 'Mindful Reset',
    description: 'Short meditation to clear mental clutter',
    category: 'meditation',
    duration: 720,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    isPremium: true,
    moodTags: ['stressed', 'sad'],
  },
  {
    id: '4',
    title: 'Gentle Hope',
    description: 'Uplifting tones for low moods',
    category: 'depression_help',
    duration: 540,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    isPremium: true,
    moodTags: ['sad'],
  },
  {
    id: '5',
    title: 'Tension Release',
    description: 'Progressive relaxation for stress',
    category: 'stress_relief',
    duration: 660,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    isPremium: false,
    moodTags: ['stressed'],
  },
];
