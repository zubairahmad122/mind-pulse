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

interface CircularSessionControlsProps {
  voiceVolume: number;
  ambientVolume: number;
  onVoiceVolumeChange: (v: number) => void;
  onAmbientVolumeChange: (v: number) => void;
  onStop: () => void;
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  accentColor: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const SLIDER_HEIGHT = 180;
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
        <View style={[styles.volumeTrack, { backgroundColor: color + '20' }]} />
        <View
          style={[
            styles.volumeFill,
            {
              height: `${value * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
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

// ─── Circular Sound Halo Around Orb ───────────────────────────────
function CircularSoundHalo({
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
  // Center of the orb on screen (vertically centered with adjustments for header)
  const CENTER_X = SCREEN_WIDTH / 2;
  const CENTER_Y = SCREEN_HEIGHT / 2 + 40; // Centered vertically
  const RADIUS = 140; // Distance from orb center to sound buttons

  return (
    <View style={styles.haloContainer}>
      {/* Sound buttons forming a circle around the orb */}
      {BREATHING_MUSIC.map((music, idx) => {
        const angle = (idx / BREATHING_MUSIC.length) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER_X + RADIUS * Math.cos(angle) - 32;
        const y = CENTER_Y + RADIUS * Math.sin(angle) - 32;
        const isSelected = selectedId === music.id;

        return (
          <View key={music.id}>
            {/* Button */}
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(music.id);
              }}
              style={[
                styles.haloButton,
                {
                  left: x,
                  top: y,
                  backgroundColor: isSelected ? music.color + '35' : 'rgba(255,255,255,0.06)',
                  borderColor: isSelected ? music.color + '70' : 'rgba(255,255,255,0.12)',
                  borderWidth: isSelected ? 2 : 1.5,
                },
              ]}
              activeOpacity={0.7}
            >
              {/* Ionicons name prop expects a specific icon name type, but our
                  music config uses string constants that are known-safe at runtime. */}
              <Ionicons
                name={music.icon as any}
                size={isSelected ? 20 : 16}
                color={isSelected ? music.color : 'rgba(255,255,255,0.35)'}
              />
            </TouchableOpacity>

            {/* Label below/around button */}
            <Text
              style={[
                styles.haloLabel,
                {
                  left: x - 10,
                  top: y + 40,
                  color: isSelected ? music.color : 'rgba(255,255,255,0.3)',
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
            >
              {music.label}
            </Text>
          </View>
        );
      })}

      {/* Center Stop Button (on top of orb, above Silent) */}
      <TouchableOpacity
        onPress={onStop}
        style={[
          styles.stopButtonCenter,
          {
            left: CENTER_X - 36,
            top: CENTER_Y - 165,
            backgroundColor: accentColor + '28',
            borderColor: accentColor,
          },
        ]}
      >
        <View style={styles.stopIconBox}>
          <Ionicons name="stop" size={20} color={accentColor} />
        </View>
        <Text style={[styles.stopLabel, { color: accentColor }]}>STOP</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────
export const CircularSessionControls = memo(function CircularSessionControls({
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  onStop,
  selectedId,
  onSelect,
  accentColor,
}: CircularSessionControlsProps) {
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

      {/* Center: Empty space (for orb + halo) */}
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

      {/* Sound halo around orb */}
      <CircularSoundHalo
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
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 40,
    position: 'relative',
  },

  // Volume controls
  volumeContainer: {
    alignItems: 'center',
    gap: 10,
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

  // Circular halo
  haloContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },

  haloButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.4,
    elevation: 5,
  },

  haloLabel: {
    position: 'absolute',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    width: 50,
  },

  stopButtonCenter: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    shadowOpacity: 0.5,
    elevation: 7,
    zIndex: 10,
  },

  stopIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  stopLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
