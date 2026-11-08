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
    title: 'Eyes tired from screens?',
    desc: 'A guided 2-minute eye reset, then gentle break reminders while you work.',
    accent: '#4DE1C1',
    category: 'EYE STRAIN RELIEF',
  },
];
