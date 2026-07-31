import { Moon } from 'lucide-react-native';
import { MinimalHeroFrame } from './MinimalHeroFrame';

export function SleepHero() {
  return (
    <MinimalHeroFrame accent="#a78bfa">
      <Moon
        color="#C4B5FD"
        fill="rgba(167,139,250,0.08)"
        size={116}
        strokeWidth={1.35}
      />
    </MinimalHeroFrame>
  );
}
