import { useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import type { BreathingMusicId } from '@/constants/breathingMusic';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Particle type definitions ───────────────────────────────────────────────

type ParticleKind = 'rain' | 'leaves' | 'embers' | 'stars' | 'bubbles' | 'dust';

interface ParticleTypeConfig {
  kind: ParticleKind;
  count: number;
  color: string;
  secondaryColor: string;
  symbol: string;       // emoji or unicode symbol
  speedRange: [number, number]; // [min, max] in px/s
  sizeRange: [number, number];
  wind: number;         // horizontal drift
  fadeIn: boolean;
  rotate: boolean;
}

const PARTICLE_TYPES: Record<ParticleKind, ParticleTypeConfig> = {
  rain: {
    kind: 'rain',
    count: 30,
    color: 'rgba(100, 181, 246, 0.6)',
    secondaryColor: 'rgba(79, 195, 247, 0.3)',
    symbol: '💧',
    speedRange: [180, 380],
    sizeRange: [10, 18],
    wind: 8,
    fadeIn: false,
    rotate: false,
  },
  bubbles: {
    kind: 'bubbles',
    count: 20,
    color: 'rgba(79, 195, 247, 0.4)',
    secondaryColor: 'rgba(179, 229, 252, 0.2)',
    symbol: '○',
    speedRange: [30, 80],
    sizeRange: [12, 28],
    wind: -5,
    fadeIn: true,
    rotate: false,
  },
  leaves: {
    kind: 'leaves',
    count: 18,
    color: 'rgba(76, 175, 80, 0.5)',
    secondaryColor: 'rgba(139, 195, 74, 0.3)',
    symbol: '🍃',
    speedRange: [40, 110],
    sizeRange: [18, 28],
    wind: 12,
    fadeIn: true,
    rotate: true,
  },
  embers: {
    kind: 'embers',
    count: 22,
    color: 'rgba(255, 112, 67, 0.6)',
    secondaryColor: 'rgba(255, 193, 7, 0.3)',
    symbol: '✦',
    speedRange: [30, 90],
    sizeRange: [8, 18],
    wind: -3,
    fadeIn: true,
    rotate: false,
  },
  stars: {
    kind: 'stars',
    count: 25,
    color: 'rgba(179, 157, 219, 0.5)',
    secondaryColor: 'rgba(255, 255, 255, 0.3)',
    symbol: '✨',
    speedRange: [15, 50],
    sizeRange: [10, 22],
    wind: 2,
    fadeIn: true,
    rotate: false,
  },
  dust: {
    kind: 'dust',
    count: 20,
    color: 'rgba(161, 136, 127, 0.3)',
    secondaryColor: 'rgba(188, 170, 164, 0.2)',
    symbol: '·',
    speedRange: [10, 35],
    sizeRange: [6, 14],
    wind: 4,
    fadeIn: true,
    rotate: false,
  },
};

const MUSIC_TO_PARTICLE: Record<BreathingMusicId, ParticleKind | 'none'> = {
  'none': 'none',
  'ocean': 'bubbles',
  'forest': 'leaves',
  'fire': 'embers',
  'rain': 'rain',
  'brown-noise': 'dust',
};

// ─── Single Particle ─────────────────────────────────────────────────────────

interface ParticleData {
  id: number;
  xStart: number;
  animY: RNAnimated.Value;
  animX: RNAnimated.Value;
  animO: RNAnimated.Value;
  animR: RNAnimated.Value;
  size: number;
  config: ParticleTypeConfig;
}

// ─── Particle Component (renders a single particle) ──────────────────────────

function ParticleItem({ data }: { data: ParticleData }) {
  const animStyle = {
    transform: [
      { translateY: data.animY },
      { translateX: data.animX },
      ...(data.config.rotate
        ? [{ rotate: data.animR.interpolate({
            inputRange: [0, 360],
            outputRange: ['0deg', '360deg'],
          }) }]
        : []),
    ],
    opacity: data.animO,
  };

  const isRain = data.config.kind === 'rain';

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: data.xStart,
          width: isRain ? 2 : data.size,
          height: isRain ? data.size * 0.6 : data.size,
          borderRadius: isRain ? 0 : data.size / 2,
          backgroundColor: isRain ? data.config.color : undefined,
        },
        animStyle,
      ]}
    >
      {!isRain && (
        <RNAnimated.Text
          style={[
            styles.particleSymbol,
            {
              fontSize: data.size * 0.85,
              color: data.config.color,
              textShadowColor: data.config.secondaryColor,
              textShadowRadius: 6,
            },
          ]}
        >
          {data.config.symbol}
        </RNAnimated.Text>
      )}
    </RNAnimated.View>
  );
}

// ─── ParticleField (parent container) ────────────────────────────────────────

interface ParticleFieldProps {
  musicId: BreathingMusicId;
  isActive: boolean;   // only animate when breathing is running
}

export function ParticleField({ musicId, isActive }: ParticleFieldProps) {
  const kind = MUSIC_TO_PARTICLE[musicId] ?? 'none';
  const config = kind !== 'none' ? PARTICLE_TYPES[kind] : null;

  if (!config || !isActive) return null;

  // Key forces remount on music change so particles reset
  const mountKey = musicId + '-active';
  return <ParticleFieldInner key={mountKey} config={config} />;
}

function ParticleFieldInner({ config }: { config: ParticleTypeConfig }) {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const particles = useMemo(() => {
    const items: ParticleData[] = [];
    for (let i = 0; i < config.count; i++) {
      // Stagger initial positions so they don't all start at top
      const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
      const xStart = Math.random() * (SCREEN_W + 40) - 20;
      const animY = new RNAnimated.Value(-size - Math.random() * SCREEN_H * 0.8);
      const animX = new RNAnimated.Value(0);
      const animO = new RNAnimated.Value(config.fadeIn ? 0 : 0.5 + Math.random() * 0.4);
      const animR = new RNAnimated.Value(Math.random() * 360);

      items.push({ id: i, xStart, animY, animX, animO, animR, size, config });
    }
    return items;
  }, [config]);

  // Start all animations
  useEffect(() => {
    const screenW = SCREEN_W;
    const screenH = SCREEN_H;

    particles.forEach(p => {
      const duration = (screenH / (config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]))) * 1000;

      RNAnimated.parallel([
        RNAnimated.timing(p.animY, {
          toValue: screenH + p.size,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        RNAnimated.timing(p.animX, {
          toValue: config.wind * (screenH / config.speedRange[0]),
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        ...(config.fadeIn
          ? [
              RNAnimated.sequence([
                RNAnimated.timing(p.animO, {
                  toValue: 0.6 + Math.random() * 0.3,
                  duration: duration * 0.2,
                  easing: Easing.ease,
                  useNativeDriver: true,
                }),
                RNAnimated.timing(p.animO, {
                  toValue: 0,
                  duration: duration * 0.8,
                  easing: Easing.ease,
                  useNativeDriver: true,
                }),
              ]),
            ]
          : []),
        ...(config.rotate
          ? [
              RNAnimated.timing(p.animR, {
                toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
                duration,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
            ]
          : []),
      ]).start(() => {
        if (!isMounted.current) return;
        // Reset position and loop
        p.animY.setValue(-p.size);
        p.animX.setValue(0);
        p.animR.setValue(0);
        const restartDelay = 200 + Math.random() * 1500;
        setTimeout(() => {
          if (!isMounted.current) return;
          const newDuration = (screenH / (config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]))) * 1000;
          RNAnimated.parallel([
            RNAnimated.timing(p.animY, {
              toValue: screenH + p.size,
              duration: newDuration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            RNAnimated.timing(p.animX, {
              toValue: config.wind * (screenH / config.speedRange[0]),
              duration: newDuration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            ...(config.fadeIn
              ? [
                  RNAnimated.sequence([
                    RNAnimated.timing(p.animO, {
                      toValue: 0.6 + Math.random() * 0.3,
                      duration: newDuration * 0.2,
                      easing: Easing.ease,
                      useNativeDriver: true,
                    }),
                    RNAnimated.timing(p.animO, {
                      toValue: 0,
                      duration: newDuration * 0.8,
                      easing: Easing.ease,
                      useNativeDriver: true,
                    }),
                  ]),
                ]
              : []),
            ...(config.rotate
              ? [
                  RNAnimated.timing(p.animR, {
                    toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
                    duration: newDuration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                  }),
                ]
              : []),
          ]).start();
        }, restartDelay);
      });
    });

    return () => {
      // Cleanup all running animations
      particles.forEach(p => {
        p.animY.stopAnimation();
        p.animX.stopAnimation();
        p.animO.stopAnimation();
        p.animR.stopAnimation();
      });
    };
  }, [particles, config]);

  return (
    <RNAnimated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map(p => (
        <ParticleItem key={p.id} data={p} />
      ))}
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleSymbol: {
    textAlign: 'center',
  },
});
