import { useGlobalFrame } from "@/hooks/useAnimationFrame";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Mask,
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

// ── Waxing Crescent (120px) ───────────────────────────────────────────────────

function CrescentMoon() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="moonFill" cx="20%" cy="62%" r="75%">
          <Stop offset="0%" stopColor="#f7f0ff" />
          <Stop offset="30%" stopColor="#e0d2f8" />
          <Stop offset="65%" stopColor="#b898e0" />
          <Stop offset="100%" stopColor="#7a5cba" />
        </RadialGradient>
        <Mask id="crescent">
          <Circle cx={60} cy={60} r={48} fill="#fff" />
          <Circle cx={76} cy={50} r={44} fill="#000" />
        </Mask>
      </Defs>
      <G mask="url(#crescent)">
        <Circle cx={60} cy={60} r={48} fill="url(#moonFill)" />
      </G>
    </Svg>
  );
}

// ── Subtle Moon Glow ──────────────────────────────────────────────────────────

function MoonGlow({ frame }: { frame: number }) {
  const pulse = 0.7 + Math.sin(frame * 0.035) * 0.15;
  return (
    <View style={{ position: "absolute", opacity: pulse }}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        <Circle cx={90} cy={90} r={70} fill="rgba(167,139,250,0.06)" />
        <Circle cx={90} cy={90} r={56} fill="rgba(167,139,250,0.08)" />
      </Svg>
    </View>
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

// ── Orbit Rings ───────────────────────────────────────────────────────────────

function OrbitRings({ frame }: { frame: number }) {
  const outerAngle = (360 - ((frame * 0.3) % 360)) % 360;
  const innerAngle = (frame * 0.8) % 360;
  return (
    <View style={{ width: 260, height: 260 }}>
      {/* Outer ring — centered via negative offset */}
      <View
        style={{
          position: "absolute",
          left: -130, top: -130,
          transform: [{ rotate: `${outerAngle}deg` }],
        }}
      >
        <Svg width={260} height={260} viewBox="0 0 260 260">
          <Circle
            cx={130}
            cy={130}
            r={124}
            fill="none"
            stroke="rgba(167,139,250,0.07)"
            strokeWidth={1}
            strokeDasharray="2 10"
          />
        </Svg>
      </View>
      {/* Inner ring + dot — centered via negative offset */}
      <View
        style={{
          position: "absolute",
          left: -110, top: -110,
          transform: [{ rotate: `${innerAngle}deg` }],
        }}
      >
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Circle
            cx={110}
            cy={110}
            r={104}
            fill="none"
            stroke="rgba(196,181,253,0.12)"
            strokeWidth={1}
          />
          <Circle cx={110} cy={6} r={3} fill="#d8ccf5" />
        </Svg>
      </View>
    </View>
  );
}

export { NightSky };

// ── SleepHero ─────────────────────────────────────────────────────────────────

export function SleepHero() {
  const frame = useGlobalFrame();
  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <Stars frame={frame} />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          alignItems: "center", justifyContent: "center",
        }}>
          <OrbitRings frame={frame} />
        </View>

        {/* Small crescent moon with subtle glow */}
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <MoonGlow frame={frame} />
          <CrescentMoon />
        </View>

      </View>

      {/* z floating particles */}
      <Text
        style={{
          position: "absolute",
          top: "14%",
          right: "22%",
          fontSize: 20,
          color: "rgba(196,181,253,0.3)",
          transform: [{ translateY: Math.sin(frame * 0.03) * 8 }],
        }}
      >
        z
      </Text>
      <Text
        style={{
          position: "absolute",
          top: "8%",
          right: "30%",
          fontSize: 14,
          color: "rgba(196,181,253,0.2)",
          transform: [{ translateY: Math.sin(frame * 0.03 + 1) * 6 }],
        }}
      >
        z
      </Text>
      <Text
        style={{
          position: "absolute",
          bottom: "35%",
          left: "14%",
          fontSize: 12,
          color: "rgba(196,181,253,0.18)",
          transform: [{ translateY: Math.sin(frame * 0.03 + 2) * 5 }],
        }}
      >
        z
      </Text>
    </View>
  );
}
