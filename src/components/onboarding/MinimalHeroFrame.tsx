import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  accent: string;
  children: ReactNode;
};

export function MinimalHeroFrame({ accent, children }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 260 260"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="minimalHeroGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.2} />
              <Stop offset="48%" stopColor={accent} stopOpacity={0.07} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="260" height="260" fill="url(#minimalHeroGlow)" />
        </Svg>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
