import { Image, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { useGlobalFrame } from '@/hooks/useAnimationFrame';

// ── Glow backdrop — radial gradient matching the artwork's own cyan glow ─────

function GlowBackdrop({ frame }: { frame: number }) {
  const t = (Math.sin(frame * 0.045) + 1) / 2;
  const opacity = 0.5 + t * 0.5;
  const scale = 0.96 + t * 0.08;
  return (
    <View style={{ position: 'absolute', width: 380, height: 380, transform: [{ scale }], opacity }}>
      <Svg width={380} height={380} viewBox="0 0 380 380">
        <Defs>
          <RadialGradient id="eyeGlowBg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#22d3ee" stopOpacity={0.36} />
            <Stop offset="55%" stopColor="#22d3ee" stopOpacity={0.13} />
            <Stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={190} cy={190} r={190} fill="url(#eyeGlowBg)" />
      </Svg>
    </View>
  );
}

// ── Outer glow rings — faint rotating ring outlines for depth ────────────────

function OuterRings({ frame }: { frame: number }) {
  const angle = (-frame * 0.2) % 360;
  const pulseT = (Math.sin(frame * 0.03) + 1) / 2;
  return (
    <View style={{ position: 'absolute', width: 410, height: 410, transform: [{ rotate: `${angle}deg` }], opacity: 0.5 + pulseT * 0.3 }}>
      <Svg width={410} height={410} viewBox="0 0 410 410">
        <Circle cx={205} cy={205} r={204} fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth={1} />
        <Circle cx={205} cy={205} r={178} fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth={1} strokeDasharray="2 9" />
      </Svg>
    </View>
  );
}

// ── Volumetric light beams — slow-rotating tapered shafts ────────────────────

const EYE_BEAM_ANGLES = [0, 72, 144, 216, 288];

function LightBeams({ frame }: { frame: number }) {
  const groupAngle = (-frame * 0.07) % 360;
  return (
    <View style={{ position: 'absolute', width: 300, height: 300, transform: [{ rotate: `${groupAngle}deg` }] }}>
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <Defs>
          <LinearGradient id="eyeBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {EYE_BEAM_ANGLES.map((deg, i) => {
          const shimmer = 0.5 + 0.5 * Math.sin(frame * 0.04 + i * 1.5);
          return (
            <Path
              key={i}
              d="M150,150 L141,10 L159,10 Z"
              fill="url(#eyeBeamGrad)"
              opacity={shimmer * 0.5}
              transform={`rotate(${deg} 150 150)`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

// ── Soft floating particles ────────────────────────────────────────────────────

const SOFT_PARTICLES = [
  { x: 16, y: 14, s: 2.5, delay: 0 },
  { x: 84, y: 10, s: 2, delay: 8 },
  { x: 88, y: 46, s: 1.8, delay: 16 },
  { x: 10, y: 52, s: 2, delay: 24 },
  { x: 90, y: 72, s: 1.6, delay: 32 },
  { x: 14, y: 80, s: 2.2, delay: 40 },
];

function SoftParticles({ frame }: { frame: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {SOFT_PARTICLES.map((p, i) => {
        const t = (Math.sin((frame - p.delay) * 0.038) + 1) / 2;
        const translateY = -t * 8;
        const opacity = 0.15 + t * 0.35;
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: p.s, height: p.s, borderRadius: p.s / 2,
              backgroundColor: '#a5f3fc',
              shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: p.s * 2.5,
              transform: [{ translateY }], opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ── EyeHero ───────────────────────────────────────────────────────────────────
// Static artwork (assets/images/onboarding/eye-hero.png) with outer rings,
// volumetric beams, soft particles and a matching glow backdrop, plus a
// gentle float + breathe motion.

export function EyeHero() {
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
          source={require('@/assets/images/onboarding/eye-hero.png')}
          style={{ width: 320, height: 320 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <View style={{
          width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#5eead4',
          shadowColor: '#5eead4', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
          opacity: 0.5 + Math.sin(frame * 0.12) * 0.4,
        }} />
        <Text style={{ fontSize: 9, fontWeight: '600', letterSpacing: 3, color: 'rgba(103,232,249,0.65)' }}>
          EYE HEALTH MONITOR
        </Text>
      </View>
    </View>
  );
}
