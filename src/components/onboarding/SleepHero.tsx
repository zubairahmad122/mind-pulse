import { useGlobalFrame } from "@/hooks/useAnimationFrame";
import { Image, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// ── Subtle Night Sky ──────────────────────────────────────────────────────────

function NightSky() {
  return (
    <Svg
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 375 600"
    >
      <Defs>
        <RadialGradient id="skyGlow" cx="50%" cy="35%" r="75%">
          <Stop offset="0%" stopColor="#1e1438" />
          <Stop offset="60%" stopColor="#0d0a1a" />
          <Stop offset="100%" stopColor="#06040e" />
        </RadialGradient>
      </Defs>
      <Circle cx="50%" cy="35%" r="75%" fill="url(#skyGlow)" />
    </Svg>
  );
}

// ── Stars ─────────────────────────────────────────────────────────────────────

const STARS = [
  // Distant scattered
  { x: 0.12, y: 0.1, s: 2.5 },
  { x: 0.78, y: 0.06, s: 2 },
  { x: 0.88, y: 0.38, s: 1.5 },
  { x: 0.08, y: 0.45, s: 1.8 },
  { x: 0.92, y: 0.15, s: 2 },
  { x: 0.22, y: 0.55, s: 1.3 },
  { x: 0.8, y: 0.55, s: 1.2 },
  { x: 0.48, y: 0.06, s: 2 },
  // Around moon (center area ~0.35–0.65)
  { x: 0.35, y: 0.28, s: 1.8 },
  { x: 0.62, y: 0.26, s: 1.5 },
  { x: 0.42, y: 0.48, s: 1.8 },
  { x: 0.6, y: 0.46, s: 1.5 },
  { x: 0.3, y: 0.38, s: 1.2 },
  { x: 0.68, y: 0.36, s: 1.3 },
  { x: 0.38, y: 0.18, s: 1.6 },
  { x: 0.55, y: 0.18, s: 1.4 },
  { x: 0.34, y: 0.56, s: 1.2 },
  { x: 0.58, y: 0.56, s: 1.1 },
];

function Stars({ frame }: { frame: number }) {
  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {STARS.map((s, i) => {
        const phase = (frame + i * 11) % 50;
        const visible = phase < 25;
        const sv =
          0.65 + (visible ? (phase / 25) * 0.35 : ((50 - phase) / 25) * 0.35);
        const op = visible ? 0.85 : 0.12;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              width: s.s * 2.5,
              height: s.s * 2.5,
              alignItems: "center",
              justifyContent: "center",
              opacity: op,
              transform: [{ scale: sv }],
            }}
          >
            <View
              style={{
                width: s.s,
                height: s.s,
                borderRadius: s.s / 2,
                backgroundColor: "#d8ccf5",
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

// ── Glow backdrop — radial gradient matching the artwork's own purple glow ───

function GlowBackdrop({ frame }: { frame: number }) {
  const t = (Math.sin(frame * 0.045) + 1) / 2;
  const opacity = 0.5 + t * 0.5;
  const scale = 0.96 + t * 0.08;
  return (
    <View
      style={{
        position: "absolute",
        width: 380,
        height: 380,
        transform: [{ scale }],
        opacity,
      }}
    >
      <Svg width={380} height={380} viewBox="0 0 380 380">
        <Defs>
          <RadialGradient id="sleepGlowBg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#a78bfa" stopOpacity={0.36} />
            <Stop offset="55%" stopColor="#a78bfa" stopOpacity={0.13} />
            <Stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={190} cy={190} r={190} fill="url(#sleepGlowBg)" />
      </Svg>
    </View>
  );
}

// ── Outer glow rings — faint rotating ring outlines for depth ────────────────

function OuterRings({ frame }: { frame: number }) {
  const angle = (frame * 0.2) % 360;
  const pulseT = (Math.sin(frame * 0.03) + 1) / 2;
  return (
    <View
      style={{
        position: "absolute",
        width: 410,
        height: 410,
        transform: [{ rotate: `${angle}deg` }],
        opacity: 0.5 + pulseT * 0.3,
      }}
    >
      <Svg width={410} height={410} viewBox="0 0 410 410">
        <Circle
          cx={205}
          cy={205}
          r={204}
          fill="none"
          stroke="rgba(167,139,250,0.12)"
          strokeWidth={1}
        />
        <Circle
          cx={205}
          cy={205}
          r={178}
          fill="none"
          stroke="rgba(167,139,250,0.08)"
          strokeWidth={1}
          strokeDasharray="2 9"
        />
      </Svg>
    </View>
  );
}

// ── Volumetric light beams — slow-rotating tapered shafts ────────────────────

const SLEEP_BEAM_ANGLES = [0, 90, 180, 270];

function LightBeams({ frame }: { frame: number }) {
  const groupAngle = (-frame * 0.06) % 360;
  return (
    <View
      style={{
        position: "absolute",
        width: 300,
        height: 300,
        transform: [{ rotate: `${groupAngle}deg` }],
      }}
    >
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <Defs>
          <LinearGradient id="sleepBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {SLEEP_BEAM_ANGLES.map((deg, i) => {
          const shimmer = 0.5 + 0.5 * Math.sin(frame * 0.03 + i * 1.6);
          return (
            <Path
              key={i}
              d="M150,150 L141,10 L159,10 Z"
              fill="url(#sleepBeamGrad)"
              opacity={shimmer * 0.5}
              transform={`rotate(${deg} 150 150)`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

export { NightSky };

// ── SleepHero ─────────────────────────────────────────────────────────────────
// Static artwork (assets/images/onboarding/sleep-hero.png, already includes
// the moon, stars and "z"s) with a matching glow backdrop and a gentle
// float + breathe motion, instead of the procedural SVG moon illustration.

export function SleepHero() {
  const frame = useGlobalFrame();
  const t = (Math.sin(frame * 0.03) + 1) / 2;
  const translateY = -t * 8;
  const scale = 0.98 + t * 0.04;

  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <Stars frame={frame} />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 40,
        }}
      >
        <OuterRings frame={frame} />
        <LightBeams frame={frame} />
        <GlowBackdrop frame={frame} />
        <View style={{ transform: [{ translateY }, { scale }] }}>
          <Image
            source={require("@/assets/images/onboarding/sleep-hero.png")}
            style={{ width: 520, height: 650 }}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}
