import { COLORS } from './colors';

export type OnboardingSlide = {
  icon: string;
  title: string;
  desc: string;
  accent: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: '👁️',
    title: 'Your Eyes Are Burning Out',
    desc: '8 hours of screen time. 200+ blinks skipped. Your eyes need more than a 20-second break — they need real therapy, games, and recovery protocols.',
    accent: COLORS.purple,
  },
  {
    icon: '😴',
    title: 'Your Sleep Is Suffering',
    desc: 'Blue light suppresses melatonin. Late-night scrolling ruins your sleep cycle. MindPulse tracks, alarms, and helps you build a wind-down routine that actually sticks.',
    accent: '#4FC3F7',
  },
  {
    icon: '🧠',
    title: 'One Score. Full Picture.',
    desc: 'Eyes + Sleep + Mind combined into one unified score. See exactly how screen life is affecting you — and fix it with guided exercises, stress relief, and daily recovery.',
    accent: COLORS.gold,
  },
];
