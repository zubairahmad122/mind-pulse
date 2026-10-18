import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { BACKGROUND, PALETTE } from '@/constants/designSystem';

/**
 * Soft nebula glow rendered as an SVG radial gradient so it has NO hard edges
 * or seams — a soft violet glow over the dark indigo base, strongest behind
 * the header and fading out down the screen.
 */
function Nebula() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="nebulaViolet" cx="30%" cy="0%" r="60%">
          <Stop offset="0%" stopColor={PALETTE.violet} stopOpacity={0.2} />
          <Stop offset="50%" stopColor={PALETTE.indigo} stopOpacity={0.06} />
          <Stop offset="100%" stopColor={PALETTE.indigo} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Full-bleed rect filled by the radial — the radial falloff is the only
          visible edge, so there is never a rectangular seam. */}
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebulaViolet)" />
    </Svg>
  );
}

/**
 * Static — was a continuously-running Reanimated "breathing" opacity/scale
 * loop, mounted on every screen via ScreenShell. That's a perpetual repaint
 * of a full-screen SVG gradient with no ability to ever stop, which competes
 * with scroll for GPU/compositor time. The loop was decorative (subtle
 * opacity/scale drift), so it's dropped in favor of a fixed, mid-cycle look
 * — same visual composition, zero ongoing render cost.
 */
export default function AnimatedBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Frozen global background (spec section 2) — identical on every screen. */}
      <LinearGradient
        colors={BACKGROUND.overlay}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Single smooth radial nebula glow (no hard edges, no stars). */}
      <Nebula />
    </View>
  );
}
