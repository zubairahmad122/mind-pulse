export type OnboardingSlide = {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  category: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: 'mind',
    title: 'Your Mind\nHas a Pulse',
    desc: 'Track sleep, focus, stress and mental wellness in one intelligent platform.',
    accent: '#3b82f6',
    category: 'MIND PULSE',
  },
  {
    icon: 'sleep',
    title: 'Sleep Smarter,\nRecover Deeper',
    desc: 'Understand your sleep cycles and wake up fully restored every morning.',
    accent: '#a78bfa',
    category: 'DEEP REST',
  },
  {
    icon: 'eyes',
    title: 'Your Eyes\nNeed a Break',
    desc: 'Track screen time, detect eye-strain patterns and protect your long-term vision health.',
    accent: '#22d3ee',
    category: 'EYE WELLNESS',
  },
];
