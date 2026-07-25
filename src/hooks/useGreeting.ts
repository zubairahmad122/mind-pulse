export type Greeting = { text: string; emoji: string; period: 'Night' | 'Morning' | 'Afternoon' | 'Evening' };

/** Time-of-day greeting + emoji, so the hero doesn't feel identical morning and night. */
export function useGreeting(name: string): Greeting {
  const hour = new Date().getHours();
  const [period, emoji] =
    hour < 6 ? ['Night', '😴'] as const :
    hour < 12 ? ['Morning', '☀️'] as const :
    hour < 17 ? ['Afternoon', '🌿'] as const :
    hour < 21 ? ['Evening', '🌙'] as const :
    ['Night', '😴'] as const;
  return { text: `Good ${period}, ${name}`, emoji, period };
}
