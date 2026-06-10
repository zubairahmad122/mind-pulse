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

interface BalancedSessionControlsProps {
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
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const SLIDER_HEIGHT = 160;
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
    <View style={styles.volumeContainer}>
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
          <Ionicons name={icon} size={14} color="white" />
        </View>
      </View>

      <Text style={[styles.volumeLabel, { color }]}>{label}</Text>
      <Text style={[styles.volumeValue, { color }]}>{Math.round(value * 100)}</Text>
    </View>
  );
}

// ─── Sound Button Grid (3x2) ───────────────────────────────────────
function SoundButtonGrid({
  selectedId,
  onSelect,
  position,
}: {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  position: 'left' | 'right';
}) {
  // Split sounds: left 3, right 3
  const soundsToShow = position === 'left'
    ? BREATHING_MUSIC.slice(0, 3)
    : BREATHING_MUSIC.slice(3, 6);

  return (
    <View style={styles.soundGrid}>
      {soundsToShow.map((music) => {
        const isSelected = selectedId === music.id;

        return (
          <TouchableOpacity
            key={music.id}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelect(music.id);
            }}
            style={[
              styles.soundGridButton,
              {
                backgroundColor: isSelected ? music.color + '30' : 'rgba(255,255,255,0.05)',
                borderColor: isSelected ? music.color + '60' : 'rgba(255,255,255,0.1)',
                borderWidth: isSelected ? 2 : 1.5,
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={music.icon as any}
              size={isSelected ? 18 : 14}
              color={isSelected ? music.color : 'rgba(255,255,255,0.3)'}
            />
            <Text
              style={[
                styles.soundGridLabel,
                {
                  color: isSelected ? music.color : 'rgba(255,255,255,0.25)',
                  fontWeight: isSelected ? '700' : '600',
                  fontSize: isSelected ? 7 : 6,
                },
              ]}
            >
              {music.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────
export const BalancedSessionControls = memo(function BalancedSessionControls({
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  onStop,
  selectedId,
  onSelect,
  accentColor,
}: BalancedSessionControlsProps) {
  return (
    <View style={styles.wrapper}>
      {/* Far Left: Voice Volume Slider */}
      <VolumeControl
        label="VOICE"
        icon="volume-medium"
        value={voiceVolume}
        onChange={onVoiceVolumeChange}
        color={accentColor}
      />

      {/* Left Side: Sound Buttons (3 grid) */}
      <SoundButtonGrid
        selectedId={selectedId}
        onSelect={onSelect}
        position="left"
      />

      {/* Center: Empty space for orb */}
      <View style={styles.centerSpace} />

      {/* Right Side: Sound Buttons (3 grid) */}
      <SoundButtonGrid
        selectedId={selectedId}
        onSelect={onSelect}
        position="right"
      />

      {/* Far Right: Music Volume Slider */}
      <VolumeControl
        label="MUSIC"
        icon="musical-notes"
        value={ambientVolume}
        onChange={onAmbientVolumeChange}
        color="#4FC3F7"
      />

      {/* Stop Button (Overlay - top center) */}
      <TouchableOpacity
        onPress={onStop}
        style={[
          styles.stopButtonOverlay,
          {
            backgroundColor: accentColor + '28',
            borderColor: accentColor,
          },
        ]}
      >
        <Ionicons name="stop" size={16} color={accentColor} />
      </TouchableOpacity>
    </View>
  );
});

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 20,
    gap: 8,
    position: 'relative',
  },

  // Volume slider
  volumeContainer: {
    alignItems: 'center',
    gap: 8,
    flex: 0,
  },

  volumeSlider: {
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
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
    borderRadius: 20,
  },

  volumeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 20,
    opacity: 0.35,
  },

  volumeThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowOpacity: 0.4,
    elevation: 4,
  },

  volumeLabel: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  volumeValue: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Sound button grid
  soundGrid: {
    gap: 6,
    flex: 0,
  },

  soundGridButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.2,
    elevation: 2,
  },

  soundGridLabel: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    lineHeight: 8,
  },

  // Center space for orb
  centerSpace: {
    flex: 1,
  },

  // Stop button (overlay on top)
  stopButtonOverlay: {
    position: 'absolute',
    top: 16,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowOpacity: 0.3,
    elevation: 5,
  },
});
