export type OnboardingSlide = {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  category: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: 'eyes',
    title: 'Protect Your Eyes',
    desc: 'Build healthier screen habits with guided exercises and smart reminders.',
    accent: '#22d3ee',
    category: 'EYE WELLNESS',
  },
  {
    icon: 'sleep',
    title: 'Sleep Better Every Night',
    desc: 'Create relaxing bedtime routines and wake up refreshed.',
    accent: '#a78bfa',
    category: 'DEEP REST',
  },
  {
    icon: 'mind',
    title: 'Relax in Just Minutes',
    desc: 'Guided breathing sessions to ease tension and restore calm.',
    accent: '#3b82f6',
    category: 'MIND PULSE',
  },
];
