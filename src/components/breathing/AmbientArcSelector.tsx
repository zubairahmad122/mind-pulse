import { memo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { BreathingMusicId } from '@/constants/breathingMusic';



// ─── Sound items ────────────────────────────────────────────────────────────

interface ArcItem {
  id: BreathingMusicId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const SOUND_ITEMS: ArcItem[] = [
  { id: 'none',        label: 'Silent',   icon: 'volume-mute-outline',  color: '#6b7280' },
  { id: 'ocean',       label: 'Ocean',    icon: 'water-outline',        color: '#4FC3F7' },
  { id: 'forest',      label: 'Forest',   icon: 'leaf-outline',         color: '#4CAF50' },
  { id: 'rain',        label: 'Rain',     icon: 'rainy-outline',        color: '#64B5F6' },
  { id: 'fire',        label: 'Fire',     icon: 'flame',                color: '#FF7043' },
  { id: 'brown-noise', label: 'Brown',    icon: 'disc-outline',         color: '#A1887F' },
];

// ─── Volume slider sub-component ────────────────────────────────────────────

function VolumeSlider({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (v: number) => void;
}) {
  const barActiveWidth = useSharedValue(value);
  const thumbScale = useSharedValue(1);

  useEffect(() => {
    barActiveWidth.value = withTiming(value, { duration: 200 });
  }, [value]);

  const handleDecrement = () => {
    thumbScale.value = withSequence(
      withTiming(1.1, { duration: 80 }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) })
    );
    onChange(Math.max(0, +(value - 0.1).toFixed(1)));
  };

  const handleIncrement = () => {
    thumbScale.value = withSequence(
      withTiming(1.1, { duration: 80 }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) })
    );
    onChange(Math.min(1, +(value + 0.1).toFixed(1)));
  };

  const activeStyle = useAnimatedStyle(() => ({
    width: `${barActiveWidth.value * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  return (
    <View style={vs.container}>
      <View style={vs.labelRow}>
        <Ionicons name={icon} size={11} color="rgba(255,255,255,0.35)" />
        <Text style={vs.label}>{label}</Text>
      </View>

      <View style={vs.track}>
        <Animated.View style={[vs.activeTrack, activeStyle]} />
        <Animated.View
          style={[
            vs.thumb,
            { left: `${value * 100}%` },
            thumbStyle
          ]}
        />
      </View>

      <View style={vs.btnRow}>
        <TouchableOpacity
          onPress={handleDecrement}
          style={vs.btn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={vs.val}>{Math.round(value * 100)}</Text>
        <TouchableOpacity
          onPress={handleIncrement}
          style={vs.btn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  track: {
    width: '85%',
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2.5,
    overflow: 'visible',
    position: 'relative',
  },
  activeTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2.5,
  },
  thumb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    position: 'absolute',
    top: -1.5,
    marginLeft: -4,
    shadowColor: 'rgba(255,255,255,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.6,
    elevation: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  val: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

// ─── Animated sound item ────────────────────────────────────────────────────

function SoundItemButton({
  item,
  isSelected,
  onPress,
}: {
  item: ArcItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const opacitySV  = useSharedValue(isSelected ? 1 : 0.3);
  const scaleSV    = useSharedValue(isSelected ? 1 : 1);
  const dotGlow    = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    opacitySV.value = withTiming(isSelected ? 1 : 0.3, {
      duration: 350, easing: Easing.inOut(Easing.ease),
    });

    if (isSelected) {
      scaleSV.value = withSequence(
        withTiming(1.20, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) }),
      );
    } else {
      scaleSV.value = withTiming(1, {
        duration: 300, easing: Easing.inOut(Easing.ease),
      });
    }

    dotGlow.value = withTiming(isSelected ? 1 : 0, {
      duration: 400, easing: Easing.out(Easing.ease),
    });
  }, [isSelected]);

  useEffect(() => {
    return () => {
      cancelAnimation(scaleSV); cancelAnimation(opacitySV); cancelAnimation(dotGlow);
    };
  }, []);

  const itemAnim = useAnimatedStyle(() => ({
    opacity: opacitySV.value,
    transform: [{ scale: scaleSV.value }],
  }));

  const dotAnim = useAnimatedStyle(() => ({
    opacity: dotGlow.value,
    transform: [{ scaleY: dotGlow.value }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={styles.soundItem}
    >
      {/* Icon circle */}
      <Animated.View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isSelected ? item.color + '18' : 'rgba(255,255,255,0.03)',
            borderColor: isSelected ? item.color + '55' : 'rgba(255,255,255,0.06)',
            borderWidth: isSelected ? 2 : 1.5,
          },
          itemAnim,
        ]}
      >
        <Ionicons
          name={item.icon}
          size={isSelected ? 22 : 16}
          color={isSelected ? item.color : 'rgba(255,255,255,0.3)'}
        />
      </Animated.View>

      {/* Active indicator dot */}
      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: item.color },
          dotAnim,
        ]}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.soundLabel,
          {
            color: isSelected ? item.color : 'rgba(255,255,255,0.2)',
            fontWeight: isSelected ? '700' : '500',
          },
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface AmbientArcSelectorProps {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  accentColor: string;
  voiceVolume: number;
  ambientVolume: number;
  onVoiceVolumeChange: (v: number) => void;
  onAmbientVolumeChange: (v: number) => void;
  isPaused: boolean;
  onPause: () => void;
  onStop: () => void;
}

export const AmbientArcSelector = memo(function AmbientArcSelector({
  selectedId, onSelect, accentColor,
  voiceVolume, ambientVolume,
  onVoiceVolumeChange, onAmbientVolumeChange,
  isPaused, onPause, onStop,
}: AmbientArcSelectorProps) {
  return (
    <View style={styles.wrapper}>
      {/* Glass background panel */}
      <View style={styles.glassPanel} />

      {/* Sound items row */}
      <View style={styles.soundRow}>
        {SOUND_ITEMS.map(item => (
          <SoundItemButton
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onPress={() => {
              if (item.id !== selectedId) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(item.id);
              }
            }}
          />
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Controls row */}
      <View style={styles.controlsRow}>
        {/* Voice volume */}
        <VolumeSlider
          label="Voice"
          icon="volume-medium"
          value={voiceVolume}
          onChange={onVoiceVolumeChange}
        />

        {/* Center: Pause / Stop */}
        <View style={styles.centerBlock}>
          <TouchableOpacity
            onPress={onPause}
            style={[styles.pauseBtn, { borderColor: accentColor }]}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={22}
              color={accentColor}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
            <View style={styles.stopInner} />
          </TouchableOpacity>
        </View>

        {/* Ambient volume */}
        <VolumeSlider
          label="Music"
          icon="musical-notes"
          value={ambientVolume}
          onChange={onAmbientVolumeChange}
        />
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'relative',
    zIndex: 10,
    paddingBottom: Math.max(16, Dimensions.get('window').height > 800 ? 24 : 12),
  },

  glassPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: -32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 0,
  },

  soundRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 12,
  },

  soundItem: {
    width: 54,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },

  soundLabel: {
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  divider: {
    height: 1,
    marginHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },

  centerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  pauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopInner: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
