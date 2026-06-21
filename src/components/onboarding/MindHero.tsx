import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useGlobalFrame } from '@/hooks/useAnimationFrame';

// ── Subtle Orbit Rings ───────────────────────────────────────────────────────

function OrbitRings({ frame }: { frame: number }) {
  const slowAngle = (frame * 0.15) % 360;
  return (
    <View>
      <Svg width={280} height={280} viewBox="0 0 280 280">
        <Circle cx={140} cy={140} r={130} fill="none" stroke="rgba(96,165,250,0.06)" strokeWidth={1} />
        <Circle cx={140} cy={140} r={100} fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth={1} strokeDasharray="2 8"
          transform={`rotate(${slowAngle}, 140, 140)`} />
      </Svg>
    </View>
  );
}

// ── Pulse Line ────────────────────────────────────────────────────────────────

const PULSE_PATH = 'M0 45 L68 45 L82 45 L92 20 L102 70 L114 6 L126 84 L138 45 L154 45 L240 45';

function PulseLine({ frame }: { frame: number }) {
  // Dash pattern repeats every 370 units (50 dash + 320 gap) — wrap the
  // offset at the same period so the loop never stutters/jumps.
  const dashOffset = ((frame * 12) % 370) * -1;
  const glowPulse = 0.55 + Math.sin(frame * 0.05) * 0.2;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={240} height={90} viewBox="0 0 240 90">
        {/* Soft glow halo — wide, low-opacity, breathing */}
        <Path d={PULSE_PATH}
          fill="none" stroke="#60a5fa" strokeWidth={11}
          strokeLinecap="round" strokeLinejoin="round" opacity={glowPulse * 0.16} />
        <Path d={PULSE_PATH}
          fill="none" stroke="#60a5fa" strokeWidth={6}
          strokeLinecap="round" strokeLinejoin="round" opacity={glowPulse * 0.28} />
        {/* Base line */}
        <Path d={PULSE_PATH}
          fill="none" stroke="rgba(96,165,250,0.3)" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        {/* Animated bright sweep */}
        <Path d={PULSE_PATH}
          fill="none" stroke="#bae6fd" strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="50 320" strokeDashoffset={dashOffset} opacity={0.9} />
      </Svg>
    </View>
  );
}

// ── Lighting Glow — expanding concentric rings ────────────────────────────────

function MindGlow({ frame }: { frame: number }) {
  const ring1 = ((frame * 1.0) % 150);
  const ring2 = ((frame * 1.0 + 50) % 150);
  const ring3 = ((frame * 1.0 + 100) % 150);
  const opacity1 = ring1 < 130 ? 1 - ring1 / 130 : 0;
  const opacity2 = ring2 < 130 ? 1 - ring2 / 130 : 0;
  const opacity3 = ring3 < 130 ? 1 - ring3 / 130 : 0;

  return (
    <View style={{ width: 260, height: 260 }}>
      <View style={{ position: 'absolute', left: -130, top: -130 }}>
        <Svg width={260} height={260} viewBox="0 0 260 260">
          <Circle
            cx={130} cy={130} r={20 + ring1 * 0.5}
            fill="none" stroke="rgba(96,165,250,0.2)"
            strokeWidth={1.5} opacity={opacity1 * 0.5}
          />
          <Circle
            cx={130} cy={130} r={20 + ring2 * 0.5}
            fill="none" stroke="rgba(147,197,253,0.15)"
            strokeWidth={1.2} opacity={opacity2 * 0.4}
          />
          <Circle
            cx={130} cy={130} r={20 + ring3 * 0.5}
            fill="none" stroke="rgba(96,165,250,0.1)"
            strokeWidth={1} opacity={opacity3 * 0.3}
          />
        </Svg>
      </View>
    </View>
  );
}

// ── Floating Thought Particles ────────────────────────────────────────────────

const THOUGHT_DOTS = [
  { x: 16, y: 14, s: 3, delay: 0 },
  { x: 80, y: 10, s: 2, delay: 0.5 },
  { x: 84, y: 42, s: 2.5, delay: 0.2 },
  { x: 10, y: 50, s: 1.8, delay: 0.8 },
  { x: 88, y: 55, s: 2, delay: 0.3 },
  { x: 22, y: 22, s: 2.2, delay: 0.6 },
  { x: 72, y: 20, s: 1.5, delay: 0.1 },
  { x: 42, y: 8, s: 2, delay: 0.4 },
];

function ThoughtDots({ frame }: { frame: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {THOUGHT_DOTS.map((d, i) => {
        const yOffset = Math.sin((frame * 0.025 + d.delay) * 1.5) * 7;
        const opacity = 0.12 + Math.sin(frame * 0.04 + d.delay * 3) * 0.06;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${d.x}%`, top: `${d.y}%`,
              width: d.s * 3, height: d.s * 3,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ translateY: yOffset }],
              opacity: Math.max(0.04, opacity),
            }}
          >
            <View style={{
              width: d.s, height: d.s, borderRadius: d.s / 2,
              backgroundColor: '#93c5fd',
              shadowColor: '#60a5fa',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 3,
              elevation: 2,
            }} />
          </View>
        );
      })}
    </View>
  );
}

// ── MindHero ──────────────────────────────────────────────────────────────────

export function MindHero() {
  const frame = useGlobalFrame();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ThoughtDots frame={frame} />

      {/* Orbit rings — centered full-screen */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <OrbitRings frame={frame} />
      </View>

      {/* Lighting glow — expanding concentric rings */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <MindGlow frame={frame} />
      </View>

      <View style={{ alignItems: 'center', gap: 20 }}>
        <PulseLine frame={frame} />
      </View>
    </View>
  );
}
