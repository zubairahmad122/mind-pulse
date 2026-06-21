import { Fragment } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { useGlobalFrame } from '@/hooks/useAnimationFrame';

const FRAME = 280;
const DISPLAY_SIZE = 190;
const SCALE = DISPLAY_SIZE / FRAME;
const CX = 140;
const CY = 140;

// ── Corner scan brackets — viewfinder-style L marks ───────────────────────────

const BRACKET = { inset: 16, arm: 26 };

function ScanBrackets() {
  const { inset: i, arm: a } = BRACKET;
  const corners = [
    { x: i, y: i, dx: 1, dy: 1 },
    { x: FRAME - i, y: i, dx: -1, dy: 1 },
    { x: i, y: FRAME - i, dx: 1, dy: -1 },
    { x: FRAME - i, y: FRAME - i, dx: -1, dy: -1 },
  ];
  return (
    <Svg width={DISPLAY_SIZE} height={DISPLAY_SIZE} viewBox={`0 0 ${FRAME} ${FRAME}`} style={{ position: 'absolute' }}>
      {corners.map((c, idx) => (
        <Fragment key={idx}>
          <Line x1={c.x} y1={c.y} x2={c.x + a * c.dx} y2={c.y} stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
          <Line x1={c.x} y1={c.y} x2={c.x} y2={c.y + a * c.dy} stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
        </Fragment>
      ))}
    </Svg>
  );
}

// ── Gauge ticks — small dashes along the left/right "equator" ────────────────

const GAUGE_Y = [65, 100, 135, 170, 205];

function GaugeTicks() {
  return (
    <Svg width={DISPLAY_SIZE} height={DISPLAY_SIZE} viewBox={`0 0 ${FRAME} ${FRAME}`} style={{ position: 'absolute' }}>
      {GAUGE_Y.map((y, i) => {
        const tilt = (y - CY) * 0.25;
        return (
          <Fragment key={i}>
            <Line
              x1={BRACKET.inset - 5} y1={y} x2={BRACKET.inset + 5} y2={y}
              stroke="rgba(34,211,238,0.45)" strokeWidth={1.5} strokeLinecap="round"
              transform={`rotate(${tilt} ${BRACKET.inset} ${y})`}
            />
            <Line
              x1={FRAME - BRACKET.inset - 5} y1={y} x2={FRAME - BRACKET.inset + 5} y2={y}
              stroke="rgba(34,211,238,0.45)" strokeWidth={1.5} strokeLinecap="round"
              transform={`rotate(${-tilt} ${FRAME - BRACKET.inset} ${y})`}
            />
          </Fragment>
        );
      })}
    </Svg>
  );
}

// ── Eye outline + crosshair reticle + iris lens ───────────────────────────────

const EYE_LEFT = 44;
const EYE_RIGHT = 236;
const EYE_TOP = 88;
const EYE_BOTTOM = 192;
const EYE_PATH = `M${EYE_LEFT},${CY} Q${CX},${EYE_TOP} ${EYE_RIGHT},${CY} Q${CX},${EYE_BOTTOM} ${EYE_LEFT},${CY} Z`;

function EyeScanner({ frame }: { frame: number }) {
  const irisGlow = 0.75 + Math.sin(frame * 0.055) * 0.15;

  // Scan sweep — travels vertically through the iris band, fading at the ends.
  const sweepT = (Math.sin(frame * 0.04) + 1) / 2;
  const sweepY = 112 + sweepT * 56;
  const sweepOpacity = 0.15 + 0.45 * Math.sin(sweepT * Math.PI);

  return (
    <Svg width={DISPLAY_SIZE} height={DISPLAY_SIZE} viewBox={`0 0 ${FRAME} ${FRAME}`} style={{ position: 'absolute' }}>
      <Defs>
        <RadialGradient id="irisGrad" cx="38%" cy="32%" r="75%">
          <Stop offset="0%" stopColor="#a5f3fc" />
          <Stop offset="35%" stopColor="#22d3ee" />
          <Stop offset="70%" stopColor="#0e7490" />
          <Stop offset="100%" stopColor="#031b1f" />
        </RadialGradient>
      </Defs>

      {/* Crosshair reticle */}
      <Line x1={CX} y1={50} x2={CX} y2={230} stroke="rgba(34,211,238,0.3)" strokeWidth={1} />
      <Line x1={24} y1={CY} x2={256} y2={CY} stroke="rgba(34,211,238,0.3)" strokeWidth={1} />
      <Line x1={CX - 8} y1={EYE_TOP} x2={CX + 8} y2={EYE_TOP} stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={CX - 8} y1={EYE_BOTTOM} x2={CX + 8} y2={EYE_BOTTOM} stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" />

      {/* Eye outline — glow pass + crisp line */}
      <Path d={EYE_PATH} fill="none" stroke="#22d3ee" strokeWidth={6} opacity={0.15} />
      <Path d={EYE_PATH} fill="none" stroke="#22d3ee" strokeWidth={1.8} opacity={0.9} />

      {/* Scan sweep */}
      <Line x1={70} y1={sweepY} x2={210} y2={sweepY} stroke="#a5f3fc" strokeWidth={1.5} opacity={sweepOpacity} />

      {/* Iris */}
      <Circle cx={CX} cy={CY} r={34} fill="url(#irisGrad)" />
      <Circle cx={CX} cy={CY} r={14} fill="#020617" />
      <Circle cx={CX} cy={CY} r={31} fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth={0.5} />
      <Circle cx={CX} cy={CY} r={23} fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth={0.4} />
      <Circle cx={CX} cy={CY} r={34} fill="none" stroke={`rgba(34,211,238,${irisGlow * 0.12})`} strokeWidth={3} />

      {/* Highlight reflections */}
      <Ellipse cx={CX - 13} cy={CY - 11} rx={6} ry={4.5} fill="rgba(255,255,255,0.3)" transform={`rotate(-15 ${CX - 13} ${CY - 11})`} />
      <Ellipse cx={CX - 15} cy={CY - 13} rx={2.5} ry={2} fill="rgba(255,255,255,0.45)" transform={`rotate(-15 ${CX - 15} ${CY - 13})`} />
      <Ellipse cx={CX + 16} cy={CY + 13} rx={2.5} ry={2} fill="rgba(255,255,255,0.08)" transform={`rotate(-15 ${CX + 16} ${CY + 13})`} />
    </Svg>
  );
}

// ── Floating Data Dots ────────────────────────────────────────────────────────

const DATA_DOTS = [
  { x: 18, y: 12, s: 3, delay: 0 },
  { x: 76, y: 8, s: 2, delay: 1 },
  { x: 82, y: 38, s: 2.5, delay: 0.6 },
  { x: 12, y: 48, s: 2, delay: 0.3 },
  { x: 85, y: 58, s: 1.8, delay: 0.9 },
  { x: 20, y: 18, s: 2, delay: 0.5 },
  { x: 68, y: 16, s: 1.5, delay: 0.2 },
];

function DataDots({ frame }: { frame: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {DATA_DOTS.map((d, i) => {
        const yOffset = Math.sin((frame * 0.025 + d.delay) * 1.8) * 6;
        const opacity = 0.12 + Math.sin(frame * 0.05 + d.delay * 3) * 0.08;
        const glow = d.s * 3;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${d.x}%`, top: `${d.y}%`,
              width: glow, height: glow,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ translateY: yOffset }],
              opacity: Math.max(0.04, opacity),
            }}
          >
            <View style={{
              width: d.s, height: d.s, borderRadius: d.s / 2,
              backgroundColor: '#22d3ee',
              shadowColor: '#22d3ee',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
              elevation: 2,
            }} />
          </View>
        );
      })}
    </View>
  );
}

// ── EyeHero ───────────────────────────────────────────────────────────────────

export function EyeHero() {
  const frame = useGlobalFrame();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <DataDots frame={frame} />

      <View style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <ScanBrackets />
        <GaugeTicks />
        <EyeScanner frame={frame} />

        <Text style={{
          position: 'absolute', left: -6, top: CY * SCALE - 6,
          fontSize: 9, fontWeight: '600', letterSpacing: 1.5,
          color: 'rgba(165,243,252,0.55)',
        }}>
          SCAN
        </Text>
        <Text style={{
          position: 'absolute', right: -8, top: CY * SCALE - 6,
          fontSize: 9, fontWeight: '600', letterSpacing: 0.8,
          color: '#5eead4',
        }}>
          98.2%
        </Text>
      </View>

      {/* Label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <View style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: '#5eead4',
          opacity: 0.5 + Math.sin(frame * 0.12) * 0.25,
        }} />
        <Text style={{
          fontSize: 8, fontWeight: '600', letterSpacing: 2.5,
          color: 'rgba(94,234,212,0.5)',
        }}>
          EYE HEALTH MONITOR
        </Text>
      </View>
    </View>
  );
}
