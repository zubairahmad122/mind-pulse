import { Image, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { useGlobalFrame } from '@/hooks/useAnimationFrame';

const IMAGE_W = 895;
const IMAGE_H = 834;

// ── Glow backdrop — radial gradient matching the artwork's own blue glow ─────

function GlowBackdrop({ frame }: { frame: number }) {
  const t = (Math.sin(frame * 0.045) + 1) / 2;
  const opacity = 0.5 + t * 0.5;
  const scale = 0.96 + t * 0.08;
  return (
    <View style={{ position: 'absolute', width: 380, height: 380, transform: [{ scale }], opacity }}>
      <Svg width={380} height={380} viewBox="0 0 380 380">
        <Defs>
          <RadialGradient id="mindGlowBg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#3b82f6" stopOpacity={0.38} />
            <Stop offset="55%" stopColor="#3b82f6" stopOpacity={0.14} />
            <Stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={190} cy={190} r={190} fill="url(#mindGlowBg)" />
      </Svg>
    </View>
  );
}

// ── Outer glow rings — faint rotating ring outlines for depth ────────────────

function OuterRings({ frame }: { frame: number }) {
  const angle = (frame * 0.2) % 360;
  const pulseT = (Math.sin(frame * 0.03) + 1) / 2;
  return (
    <View style={{ position: 'absolute', width: 410, height: 410, transform: [{ rotate: `${angle}deg` }], opacity: 0.5 + pulseT * 0.3 }}>
      <Svg width={410} height={410} viewBox="0 0 410 410">
        <Circle cx={205} cy={205} r={204} fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth={1} />
        <Circle cx={205} cy={205} r={178} fill="none" stroke="rgba(96,165,250,0.08)" strokeWidth={1} strokeDasharray="2 9" />
      </Svg>
    </View>
  );
}

// ── Volumetric light beams — slow-rotating tapered shafts ────────────────────

const BEAM_ANGLES = [0, 60, 120, 180, 240, 300];

function LightBeams({ frame }: { frame: number }) {
  const groupAngle = (frame * 0.08) % 360;
  return (
    <View style={{ position: 'absolute', width: 320, height: 320, transform: [{ rotate: `${groupAngle}deg` }] }}>
      <Svg width={320} height={320} viewBox="0 0 320 320">
        <Defs>
          <LinearGradient id="mindBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#60a5fa" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {BEAM_ANGLES.map((deg, i) => {
          const shimmer = 0.5 + 0.5 * Math.sin(frame * 0.035 + i * 1.3);
          return (
            <Path
              key={i}
              d="M160,160 L149,8 L171,8 Z"
              fill="url(#mindBeamGrad)"
              opacity={shimmer * 0.55}
              transform={`rotate(${deg} 160 160)`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

// ── Soft floating particles ────────────────────────────────────────────────────

const SOFT_PARTICLES = [
  { x: 12, y: 16, s: 2.5, delay: 0 },
  { x: 88, y: 12, s: 2, delay: 9 },
  { x: 92, y: 48, s: 1.8, delay: 18 },
  { x: 6, y: 56, s: 2.2, delay: 27 },
  { x: 94, y: 76, s: 1.6, delay: 36 },
  { x: 16, y: 86, s: 2, delay: 45 },
];

function SoftParticles({ frame }: { frame: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {SOFT_PARTICLES.map((p, i) => {
        const t = (Math.sin((frame - p.delay) * 0.04) + 1) / 2;
        const translateY = -t * 9;
        const opacity = 0.15 + t * 0.35;
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: p.s, height: p.s, borderRadius: p.s / 2,
              backgroundColor: '#93c5fd',
              shadowColor: '#60a5fa', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: p.s * 2.5,
              transform: [{ translateY }], opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ── MindHero ──────────────────────────────────────────────────────────────────
// Static artwork (assets/images/onboarding/mind-hero.png) with outer rings,
// volumetric beams, soft particles and a matching glow backdrop, plus a
// gentle float + breathe motion.

export function MindHero() {
  const frame = useGlobalFrame();
  const t = (Math.sin(frame * 0.03) + 1) / 2;
  const translateY = -t * 8;
  const scale = 0.98 + t * 0.04;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <OuterRings frame={frame} />
      <LightBeams frame={frame} />
      <GlowBackdrop frame={frame} />
      <SoftParticles frame={frame} />
      <View style={{ transform: [{ translateY }, { scale }] }}>
        <Image
          source={require('@/assets/images/onboarding/mind-hero.png')}
          style={{ width: 320, height: Math.round(320 * (IMAGE_H / IMAGE_W)) }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
