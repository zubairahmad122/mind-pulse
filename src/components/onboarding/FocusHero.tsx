import { Timer } from 'lucide-react-native';
import { MinimalHeroFrame } from './MinimalHeroFrame';

/** Violet matches PILLAR_COLORS.mind — the exact accent Focus already uses
 * elsewhere in the app (Home's Featured card, the first-run feature guide),
 * so onboarding doesn't introduce a fifth, unrelated color for the same feature. */
export function FocusHero() {
  return (
    <MinimalHeroFrame accent="#7B5CFF">
      <Timer color="#C4A2FF" size={118} strokeWidth={1.35} />
    </MinimalHeroFrame>
  );
}
