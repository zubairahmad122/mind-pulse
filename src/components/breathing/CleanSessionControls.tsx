import { memo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';

interface CleanSessionControlsProps {
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

// ─── Bottom Sound Menu (Horizontal Scrollable) ─────────────────────
function BottomSoundMenu({
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
  return (
    <View style={styles.bottomMenuContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.soundScrollContent}
      >
        {/* Stop Button (always visible, on left) */}
        <TouchableOpacity
          onPress={onStop}
          style={[
            styles.bottomSoundButton,
            {
              backgroundColor: accentColor + '28',
              borderColor: accentColor,
            },
          ]}
        >
          <Ionicons name="stop" size={20} color={accentColor} />
          <Text style={[styles.bottomSoundLabel, { color: accentColor }]}>Stop</Text>
        </TouchableOpacity>

        {/* Sound Buttons */}
        {BREATHING_MUSIC.map((music) => {
          const isSelected = selectedId === music.id;

          return (
            <TouchableOpacity
              key={music.id}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(music.id);
              }}
              style={[
                styles.bottomSoundButton,
                {
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
              <Text
                style={[
                  styles.bottomSoundLabel,
                  {
                    color: isSelected ? music.color : 'rgba(255,255,255,0.3)',
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {music.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────
export const CleanSessionControls = memo(function CleanSessionControls({
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  onStop,
  selectedId,
  onSelect,
  accentColor,
}: CleanSessionControlsProps) {
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

      {/* Center: Empty (for orb) */}
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

      {/* Bottom: Sound Menu (Horizontal Scrollable) */}
      <BottomSoundMenu
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
    paddingBottom: 0,
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

  // Bottom sound menu
  bottomMenuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  soundScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  bottomSoundButton: {
    width: 70,
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.2,
    elevation: 3,
  },

  bottomSoundLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 2,
  },
});
