import { memo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';

interface SessionControlsProps {
  voiceVolume: number;
  ambientVolume: number;
  onVoiceVolumeChange: (v: number) => void;
  onAmbientVolumeChange: (v: number) => void;
  onStop: () => void;
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  accentColor: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Vertical Volume Slider ───────────────────────────────────────
function VolumeControl({
  label,
  icon,
  value,
  onChange,
  color,
  side,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (v: number) => void;
  color: string;
  side: 'left' | 'right';
}) {
  const SLIDER_HEIGHT = 200;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const y = evt.nativeEvent.locationY;
        const ratio = Math.max(0, Math.min(1, 1 - y / SLIDER_HEIGHT));
        onChange(parseFloat(ratio.toFixed(2)));
      },
    })
  ).current;

  return (
    <View style={[styles.volumeContainer, side === 'left' ? styles.volumeLeft : styles.volumeRight]}>
      <View
        style={[styles.volumeSlider, { height: SLIDER_HEIGHT }]}
        {...panResponder.panHandlers}
      >
        {/* Track background */}
        <View style={[styles.volumeTrack, { backgroundColor: color + '20' }]} />

        {/* Fill from bottom */}
        <View
          style={[
            styles.volumeFill,
            {
              height: `${value * 100}%`,
              backgroundColor: color,
            },
          ]}
        />

        {/* Thumb */}
        <View
          style={[
            styles.volumeThumb,
            {
              bottom: `${value * 100}%`,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        >
          <Ionicons name={icon} size={16} color="white" />
        </View>
      </View>

      <Text style={[styles.volumeLabel, { color }]}>{label}</Text>
      <Text style={[styles.volumeValue, { color }]}>{Math.round(value * 100)}</Text>
    </View>
  );
}

// ─── Radial Sound Menu ─────────────────────────────────────────
function RadialSoundMenu({
  selectedId,
  onSelect,
  onStop,
  accentColor,
}: {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  onStop: () => void;
  accentColor: string;
}) {
  const RADIUS = 80;
  const CENTER_X = SCREEN_WIDTH / 2;
  const CENTER_Y = 120;

  return (
    <View style={styles.radialContainer}>
      {/* Sound buttons in circle */}
      {BREATHING_MUSIC.map((music, idx) => {
        const angle = (idx / BREATHING_MUSIC.length) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER_X + RADIUS * Math.cos(angle) - 32;
        const y = CENTER_Y + RADIUS * Math.sin(angle) - 32;
        const isSelected = selectedId === music.id;

        return (
          <TouchableOpacity
            key={music.id}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelect(music.id);
            }}
            style={[
              styles.soundRadialButton,
              {
                left: x,
                top: y,
                backgroundColor: isSelected ? music.color + '40' : 'rgba(255,255,255,0.08)',
                borderColor: isSelected ? music.color : 'rgba(255,255,255,0.15)',
              },
            ]}
            activeOpacity={0.7}
          >
            {/* Ionicons name prop expects a specific icon name type, but our
                music config uses string constants that are known-safe at runtime. */}
            <Ionicons
              name={music.icon as any}
              size={isSelected ? 20 : 16}
              color={isSelected ? music.color : 'rgba(255,255,255,0.4)'}
            />
            <Text
              style={[
                styles.soundRadialLabel,
                { color: isSelected ? music.color : 'rgba(255,255,255,0.3)' },
              ]}
            >
              {music.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Center Stop Button */}
      <TouchableOpacity
        onPress={onStop}
        style={[
          styles.stopButtonCenter,
          {
            left: CENTER_X - 32,
            top: CENTER_Y - 32,
            backgroundColor: accentColor + '20',
            borderColor: accentColor,
          },
        ]}
      >
        <Ionicons name="stop" size={24} color={accentColor} />
        <Text style={[styles.stopLabel, { color: accentColor }]}>Stop</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────
export const SessionControls = memo(function SessionControls({
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  onStop,
  selectedId,
  onSelect,
  accentColor,
}: SessionControlsProps) {
  return (
    <View style={styles.wrapper}>
      {/* Left: Voice Volume */}
      <VolumeControl
        label="VOICE"
        icon="volume-medium"
        value={voiceVolume}
        onChange={onVoiceVolumeChange}
        color={accentColor}
        side="left"
      />

      {/* Center: Empty (for breathing orb in parent) */}
      <View style={styles.centerSpace} />

      {/* Right: Music Volume */}
      <VolumeControl
        label="MUSIC"
        icon="musical-notes"
        value={ambientVolume}
        onChange={onAmbientVolumeChange}
        color="#4FC3F7"
        side="right"
      />

      {/* Bottom: Radial Sound Menu */}
      <RadialSoundMenu
        selectedId={selectedId}
        onSelect={onSelect}
        onStop={onStop}
        accentColor={accentColor}
      />
    </View>
  );
});

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 60,
  },

  // Volume controls
  volumeContainer: {
    alignItems: 'center',
    gap: 8,
  },

  volumeLeft: {
    flex: 0,
  },

  volumeRight: {
    flex: 0,
  },

  volumeSlider: {
    width: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 25,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'visible',
  },

  volumeTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },

  volumeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 25,
    opacity: 0.35,
  },

  volumeThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 5,
  },

  volumeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  volumeValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  centerSpace: {
    flex: 1,
  },

  // Radial menu
  radialContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    alignItems: 'center',
  },

  soundRadialButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  soundRadialLabel: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    position: 'absolute',
    bottom: -18,
  },

  stopButtonCenter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  stopLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
