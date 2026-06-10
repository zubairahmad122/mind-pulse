import { memo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';

interface RelaxControlsProps {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  voiceVolume: number;
  ambientVolume: number;
  onVoiceVolumeChange: (v: number) => void;
  onAmbientVolumeChange: (v: number) => void;
  isPaused: boolean;
  onPause: () => void;
  onStop: () => void;
  accentColor: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Vertical Volume Slider ──────────────────────────────────────────
function DraggableVolumeSlider({
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
  const SLIDER_HEIGHT = 140;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const y = evt.nativeEvent.locationY;
        const ratio = Math.max(0, Math.min(1, 1 - y / SLIDER_HEIGHT));
        onChange(parseFloat(ratio.toFixed(2)));
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  return (
    <View style={styles.volumeSliderContainer}>
      <Text style={styles.volumeLabel}>{label}</Text>
      <View
        style={[styles.slider, { height: SLIDER_HEIGHT }]}
        {...panResponder.panHandlers}
      >
        {/* Background track */}
        <View style={styles.sliderTrack} />

        {/* Active fill */}
        <View
          style={[
            styles.sliderFill,
            {
              height: `${value * 100}%`,
              backgroundColor: color,
            },
          ]}
        />

        {/* Draggable thumb */}
        <View
          style={[
            styles.sliderThumb,
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

      {/* Value display */}
      <Text style={[styles.volumeValue, { color }]}>
        {Math.round(value * 100)}
      </Text>
    </View>
  );
}

// ─── Radial Sound Menu ───────────────────────────────────────────────
function RadialSoundMenu({
  selectedId,
  onSelect,
}: {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
}) {
  const RADIUS = 70;
  const CENTER_X = SCREEN_WIDTH / 2;
  const CENTER_Y = 110;

  return (
    <View style={styles.radialMenuContainer}>
      {/* Center play indicator */}
      <View style={[styles.radialCenter, { left: CENTER_X - 28, top: CENTER_Y - 28 }]}>
        <Ionicons name="musical-note" size={28} color="#7B61FF" />
      </View>

      {/* Sound buttons in circle */}
      {BREATHING_MUSIC.map((music, idx) => {
        const angle = (idx / BREATHING_MUSIC.length) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER_X + RADIUS * Math.cos(angle) - 22;
        const y = CENTER_Y + RADIUS * Math.sin(angle) - 22;
        const isSelected = selectedId === music.id;

        return (
          <TouchableOpacity
            key={music.id}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelect(music.id);
            }}
            style={[
              styles.radialButton,
              {
                left: x,
                top: y,
                backgroundColor: isSelected ? music.color + '33' : 'rgba(255,255,255,0.05)',
                borderColor: isSelected ? music.color : 'rgba(255,255,255,0.1)',
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={music.icon as any}
              size={isSelected ? 20 : 16}
              color={isSelected ? music.color : 'rgba(255,255,255,0.4)'}
            />
            <Text
              style={[
                styles.radialLabel,
                { color: isSelected ? music.color : 'rgba(255,255,255,0.3)' },
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

// ─── Main Controls Component ─────────────────────────────────────────
export const RelaxControls = memo(function RelaxControls({
  selectedId,
  onSelect,
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  isPaused,
  onPause,
  onStop,
  accentColor,
}: RelaxControlsProps) {
  return (
    <View style={styles.wrapper}>
      {/* Top: Volume sliders */}
      <View style={styles.volumeRow}>
        <DraggableVolumeSlider
          label="Voice"
          icon="volume-medium"
          value={voiceVolume}
          onChange={onVoiceVolumeChange}
          color={accentColor}
        />

        <View style={styles.centerControls}>
          <TouchableOpacity
            onPress={onPause}
            style={[styles.pauseBtn, { borderColor: accentColor }]}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={24}
              color={accentColor}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <DraggableVolumeSlider
          label="Music"
          icon="musical-notes"
          value={ambientVolume}
          onChange={onAmbientVolumeChange}
          color="#4FC3F7"
        />
      </View>

      {/* Bottom: Radial sound menu */}
      <RadialSoundMenu selectedId={selectedId} onSelect={onSelect} />
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 20,
  },

  // Volume sliders
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 16,
  },

  volumeSliderContainer: {
    alignItems: 'center',
    gap: 8,
  },

  volumeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  slider: {
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  sliderTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },

  sliderFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 20,
    opacity: 0.3,
  },

  sliderThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
    elevation: 6,
  },

  volumeValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },

  centerControls: {
    alignItems: 'center',
    gap: 12,
  },

  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Radial menu
  radialMenuContainer: {
    width: SCREEN_WIDTH,
    height: 240,
    position: 'relative',
  },

  radialCenter: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(123,97,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(123,97,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radialButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radialLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 28,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    position: 'absolute',
    bottom: -16,
  },
});
