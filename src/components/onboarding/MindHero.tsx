import { Image } from 'react-native';
import { MinimalHeroFrame } from './MinimalHeroFrame';

export function MindHero() {
  return (
    <MinimalHeroFrame accent="#3b82f6">
      <Image
        source={require('@/assets/expo.icon/Assets/mind-pulse-playstore.png')}
        style={{ width: 176, height: 176 }}
        resizeMode="contain"
      />
    </MinimalHeroFrame>
  );
}
