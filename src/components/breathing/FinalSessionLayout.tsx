/**
 * FinalSessionLayout
 * Matches user screenshot layout:
 * - Top: Pause Button + Timer
 * - Middle: Voice Slider | Orb Space | Music Slider
 * - Bottom: Scrollable Sound Grid
 */

import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useRef } from 'react';
import {
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface FinalSessionLayoutProps {
  voiceVolume: number;
  ambientVolume: number;
  onVoiceVolumeChange: (v: number) => void;
  onAmbientVolumeChange: (v: number) => void;
  onStop: () => void;
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  accentColor: string;
  elapsedSeconds: number;
  sessionDuration: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Volume Slider ───────────────────────────────────────
function VolumeSlider({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
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
    <View
      style={[styles.volumeSlider, { height: SLIDER_HEIGHT }]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.volumeTrack, { backgroundColor: color + '15' }]} />
      <View
        style={[
          styles.volumeFill,
          {
            height: `${value * 100}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

export const FinalSessionLayout = memo(function FinalSessionLayout({
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  onStop,
  selectedId,
  onSelect,
  accentColor,
  elapsedSeconds,
  sessionDuration,
}: FinalSessionLayoutProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={styles.wrapper}>
      {/* ─── TOP: Pause Button + Timer ─────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onStop}
          style={[
            styles.pauseButton,
            {
              backgroundColor: accentColor + '20',
              borderColor: accentColor,
            },
          ]}
        >
          <View style={[styles.pauseIcon, { backgroundColor: accentColor }]} />
        </TouchableOpacity>

        <Text style={[styles.timer, { color: accentColor }]}>
          {(() => {
            // elapsedSeconds is in seconds, sessionDuration is in seconds
            const elapsed = Math.floor(elapsedSeconds);
            const elapsedMin = Math.floor(elapsed / 60);
            const elapsedSec = String(elapsed % 60).padStart(2, '0');
            const totalMin = Math.floor(sessionDuration / 60);
            const totalSec = String(sessionDuration % 60).padStart(2, '0');
            return `${elapsedMin}:${elapsedSec} / ${totalMin}:${totalSec}`;
          })()}
        </Text>
      </View>

      {/* ─── MIDDLE: Voice Slider | Orb Space | Music Slider ─── */}
      <View style={styles.middleRow}>
        {/* Voice Slider */}
        <View style={styles.sliderColumn}>
          <Text style={[styles.label, { color: accentColor }]}>VOICE</Text>
          <VolumeSlider
            value={voiceVolume}
            onChange={onVoiceVolumeChange}
            color={accentColor}
          />
          <Text style={[styles.value, { color: accentColor }]}>
            {Math.round(voiceVolume * 100)}
          </Text>
        </View>

        {/* Orb Space (220px) */}
        <View style={styles.orbSpace} />

        {/* Music Slider */}
        <View style={styles.sliderColumn}>
          <Text style={[styles.label, { color: '#4FC3F7' }]}>MUSIC</Text>
          <VolumeSlider
            value={ambientVolume}
            onChange={onAmbientVolumeChange}
            color="#4FC3F7"
          />
          <Text style={[styles.value, { color: '#4FC3F7' }]}>
            {Math.round(ambientVolume * 100)}
          </Text>
        </View>
      </View>

      {/* ─── BOTTOM: Scrollable Sound Grid ──────────── */}
      <View style={styles.bottomContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.soundGridContent}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
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
                  styles.soundCard,
                  {
                    backgroundColor: isSelected ? music.color + '25' : 'rgba(255,255,255,0.05)',
                    borderColor: isSelected ? music.color + '50' : 'rgba(255,255,255,0.1)',
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={music.icon as any}
                  size={isSelected ? 16 : 13}
                  color={isSelected ? music.color : 'rgba(255,255,255,0.35)'}
                />
                <Text
                  style={[
                    styles.soundLabel,
                    {
                      color: isSelected ? music.color : 'rgba(255,255,255,0.3)',
                      fontWeight: isSelected ? '700' : '500',
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
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingBottom: 12,
  },

  // Top bar: Pause + Timer
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
    height: 50,
  },

  pauseButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    shadowOpacity: 0.4,
    elevation: 6,
  },

  pauseIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },

  timer: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Middle: Sliders + Orb
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: 8,
    marginTop:0,
    minHeight: 240,
  },

  sliderColumn: {
    alignItems: 'center',
    gap: 3,
    flex: 0,
  },

  label: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  volumeSlider: {
    width: 48,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  volumeTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },

  volumeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 24,
    opacity: 0.5,
  },

  value: {
    fontSize: 10,
    fontWeight: '700',
  },

  orbSpace: {
    flex: 0,
    width: 200,
    height: 200,
  },

  // Bottom: Sound Grid (Scrollable)
  bottomContainer: {
    height: 120,
    marginTop: 12,
    paddingBottom: 8,
  },

  soundGridContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 8,
  },

  soundCard: {
    width: 85,
    height: 85,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.3,
    elevation: 5,
  },

  soundLabel: {
    fontSize: 7,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 8,
  },
});
