import { Image } from 'react-native';
import { MinimalHeroFrame } from './MinimalHeroFrame';

export function MindHero() {
  return (
    <MinimalHeroFrame accent="#6C63FF">
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={{ width: 176, height: 176 }}
        resizeMode="contain"
      />
    </MinimalHeroFrame>
  );
}
