import { Moon, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react-native';

export type Greeting = { text: string; icon: LucideIcon; period: 'Night' | 'Morning' | 'Afternoon' | 'Evening' };

/**
 * Time-of-day greeting + icon, so the hero doesn't feel identical morning
 * and night. `name` is optional — when there's no signup name to address the
 * user by, this returns the plain time greeting ("Good Evening") rather than
 * ever falling back to the app's own brand name in the name's place.
 */
export function useGreeting(name?: string): Greeting {
  const hour = new Date().getHours();
  const [period, icon] =
    hour < 6 ? ['Night', Moon] as const :
    hour < 12 ? ['Morning', Sunrise] as const :
    hour < 17 ? ['Afternoon', Sun] as const :
    hour < 21 ? ['Evening', Sunset] as const :
    ['Night', Moon] as const;
  const text = name ? `Good ${period}, ${name}` : `Good ${period}`;
  return { text, icon, period };
}
