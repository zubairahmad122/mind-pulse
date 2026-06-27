import { DEFAULT_PILLAR_THEME, GLASS_CARD } from '@/constants';
import { useGlobalFrame } from '@/hooks/useAnimationFrame';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Image, ImageSourcePropType, KeyboardAvoidingView, Platform, ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  heroImage?: ImageSourcePropType;
  heroLabel?: string;
};

// ── Outer glow rings — faint rotating ring outlines for depth ────────────────

function OuterRings({ frame }: { frame: number }) {
  const angle = (frame * 0.2) % 360;
  const pulseT = (Math.sin(frame * 0.03) + 1) / 2;
  return (
    <View style={{ position: 'absolute', width: 230, height: 230, transform: [{ rotate: `${angle}deg` }], opacity: 0.5 + pulseT * 0.3 }}>
      <Svg width={230} height={230} viewBox="0 0 230 230">
        <Circle cx={115} cy={115} r={114} fill="none" stroke="rgba(26,143,255,0.16)" strokeWidth={1} />
        <Circle cx={115} cy={115} r={98} fill="none" stroke="rgba(26,143,255,0.1)" strokeWidth={1} strokeDasharray="2 8" />
      </Svg>
    </View>
  );
}

// ── Volumetric light beams — slow-rotating tapered shafts ────────────────────

const BEAM_ANGLES = [0, 72, 144, 216, 288];

function LightBeams({ frame }: { frame: number }) {
  const groupAngle = (-frame * 0.07) % 360;
  return (
    <View style={{ position: 'absolute', width: 200, height: 200, transform: [{ rotate: `${groupAngle}deg` }] }}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <Defs>
          <SvgLinearGradient id="authBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#1A8FFF" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#1A8FFF" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {BEAM_ANGLES.map((deg, i) => {
          const shimmer = 0.5 + 0.5 * Math.sin(frame * 0.035 + i * 1.3);
          return (
            <Path
              key={i}
              d="M100,100 L93,5 L107,5 Z"
              fill="url(#authBeamGrad)"
              opacity={shimmer * 0.55}
              transform={`rotate(${deg} 100 100)`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

// ── Soft floating particles ────────────────────────────────────────────────────

const SOFT_PARTICLES = [
  { x: 8, y: 14, s: 2.4, delay: 0 },
  { x: 90, y: 10, s: 2, delay: 9 },
  { x: 94, y: 50, s: 1.8, delay: 18 },
  { x: 4, y: 58, s: 2.2, delay: 27 },
  { x: 88, y: 80, s: 1.6, delay: 36 },
];

function SoftParticles({ frame }: { frame: number }) {
  return (
    <View style={{ position: 'absolute', width: 220, height: 220 }}>
      {SOFT_PARTICLES.map((p, i) => {
        const t = (Math.sin((frame - p.delay) * 0.04) + 1) / 2;
        const translateY = -t * 8;
        const opacity = 0.15 + t * 0.35;
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: p.s, height: p.s, borderRadius: p.s / 2,
              backgroundColor: '#7EB8FF',
              shadowColor: '#1A8FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: p.s * 2.5,
              transform: [{ translateY }], opacity,
            }}
          />
        );
      })}
    </View>
  );
}

function AuthHero({ heroImage, heroLabel, accent }: { heroImage: ImageSourcePropType; heroLabel?: string; accent: string }) {
  const frame = useGlobalFrame();
  const breathe = (Math.sin(frame * 0.045) + 1) / 2;
  const glowOpacity = 0.5 + breathe * 0.5;
  const glowScale = 0.96 + breathe * 0.08;
  const floatT = (Math.sin(frame * 0.03) + 1) / 2;
  const translateY = -floatT * 6;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
        <OuterRings frame={frame} />
        <LightBeams frame={frame} />
        <SoftParticles frame={frame} />
        <View pointerEvents="none" style={{
          position: 'absolute', width: 190, height: 190, borderRadius: 95,
          backgroundColor: 'rgba(26,143,255,0.1)',
          transform: [{ scale: glowScale }], opacity: glowOpacity,
          shadowColor: accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 36, elevation: 18,
        }} />
        <View style={{ transform: [{ translateY }] }}>
          <Image source={heroImage} style={{ width: 150, height: 150 }} resizeMode="contain" />
        </View>
      </View>
      {heroLabel && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2.5, color: accent }}>
            {heroLabel}
          </Text>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />
        </View>
      )}
    </View>
  );
}

export default function AuthHeroLayout({
  children,
  showBack = true,
  onBackPress,
  sheetStyle,
  heroImage,
  heroLabel,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pillar = DEFAULT_PILLAR_THEME;

  return (
    <View style={{ flex: 1 }}>
      {/* Background gradient — matches the onboarding flow's dark navy */}
      <LinearGradient
        colors={pillar.bgGradient}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      {showBack && (
        <TouchableOpacity
          onPress={onBackPress ?? (() => router.back())}
          activeOpacity={0.7}
          style={{
            position: 'absolute', top: Math.max(insets.top, 16) + 8, left: 24, zIndex: 10,
            width: 36, height: 36, borderRadius: 18,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Sheet — scrollable form content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {heroImage && (
            <View style={{ alignItems: 'center', paddingTop: Math.max(insets.top, 16) + 56, paddingBottom: 18 }}>
              <AuthHero heroImage={heroImage} heroLabel={heroLabel} accent={pillar.accent} />
            </View>
          )}

          {/* Outer wrapper carries the glow so it isn't clipped by the card below */}
          <View style={{
            flex: 1,
            shadowColor: pillar.accent,
            ...GLASS_CARD.outerGlow,
          }}>
            <View style={[{
              flex: 1,
              borderTopLeftRadius: GLASS_CARD.borderRadius, borderTopRightRadius: GLASS_CARD.borderRadius,
              overflow: 'hidden',
              borderTopWidth: GLASS_CARD.borderTopWidth, borderColor: GLASS_CARD.borderColor,
              paddingTop: heroImage ? 24 : Math.max(insets.top, 16) + 64,
              paddingHorizontal: 24,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }, sheetStyle]}>
              {/* Frosted glass background */}
              <BlurView
                intensity={GLASS_CARD.blurIntensity}
                tint="dark"
                style={{ ...StyleSheet.absoluteFill, borderTopLeftRadius: GLASS_CARD.borderRadius, borderTopRightRadius: GLASS_CARD.borderRadius }}
              />
              <LinearGradient
                colors={pillar.cardTint}
                style={{ ...StyleSheet.absoluteFill, borderTopLeftRadius: GLASS_CARD.borderRadius, borderTopRightRadius: GLASS_CARD.borderRadius }}
              />
              {/* Top highlight line — light catching the glass edge */}
              <LinearGradient
                colors={GLASS_CARD.highlightColors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 1.5 }}
              />
              {/* Soft inner shadow — top inner glow + bottom inner darkening */}
              <LinearGradient
                colors={GLASS_CARD.innerTopColors}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: GLASS_CARD.innerTopHeight }}
                pointerEvents="none"
              />
              <LinearGradient
                colors={GLASS_CARD.innerBottomColors}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: GLASS_CARD.innerBottomHeight }}
                pointerEvents="none"
              />
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
