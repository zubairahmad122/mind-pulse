export type OnboardingSlide = {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  category: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: 'focus',
    title: 'Focus On What Matters',
    desc: 'Start a focus timer and keep distracting apps away — then take a real, guided break when it ends.',
    accent: '#7B5CFF',
    category: 'FOCUS',
  },
  {
    icon: 'eyes',
    title: 'Protect Your Eyes',
    desc: 'Build healthier screen habits with guided exercises and smart reminders.',
    accent: '#4DE1C1',
    category: 'EYE WELLNESS',
  },
  {
    icon: 'sleep',
    title: 'Sleep Better Every Night',
    desc: 'Create relaxing bedtime routines and wake up refreshed.',
    accent: '#A48BFF',
    category: 'DEEP REST',
  },
  {
    icon: 'mind',
    title: 'Relax in Just Minutes',
    desc: 'Guided breathing sessions to ease tension and restore calm.',
    accent: '#6C63FF',
    category: 'INNER CALM',
  },
];
