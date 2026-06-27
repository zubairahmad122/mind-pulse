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
    title: 'Your Eyes Blink\n66% Less at Screens',
    desc: 'Digital eye strain affects millions. Our guided exercises protect your vision in just 2 minutes a day.',
    accent: '#22d3ee',
    category: 'EYE WELLNESS',
  },
  {
    icon: 'sleep',
    title: '70% Sleep Better\nWith a Routine',
    desc: 'Track your sleep cycles, set smart alarms, and wake up fully restored every morning.',
    accent: '#a78bfa',
    category: 'DEEP REST',
  },
  {
    icon: 'mind',
    title: '2 Minutes of Breathing\nReduces Stress 40%',
    desc: 'Guided relaxation, meditation, and journaling — your complete mental wellness toolkit.',
    accent: '#3b82f6',
    category: 'MIND PULSE',
  },
];
