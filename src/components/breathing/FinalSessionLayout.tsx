/**
 * FinalSessionLayout
 * Matches user screenshot layout:
 * - Top: Pause Button + Timer
 * - Middle: Voice Slider | Orb Space | Music Slider
 * - Bottom: Scrollable Sound Grid
 */

import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import { Mic, MicOff, Music, Pause, Play, VolumeX } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { memo, useRef } from 'react';
import {
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
  voiceMuted: boolean;
  musicMuted: boolean;
  onToggleVoiceMute: () => void;
  onToggleMusicMute: () => void;
  onStop: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  accentColor: string;
  elapsedSeconds: number;
  sessionDuration: number;
}

// Everything on a muted channel (icon, slider, value) drops to this grey.
const MUTED_COLOR = 'rgba(255,255,255,0.35)';

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
  voiceMuted,
  musicMuted,
  onToggleVoiceMute,
  onToggleMusicMute,
  isPaused,
  onTogglePause,
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
          onPress={onTogglePause}
          accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
          style={[
            styles.pauseButton,
            {
              backgroundColor: accentColor + '20',
              borderColor: accentColor,
            },
          ]}
        >
          {isPaused ? (
            <Play size={18} color={accentColor} fill={accentColor} />
          ) : (
            <Pause size={18} color={accentColor} fill={accentColor} />
          )}
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
        {/* Voice Slider — tap the mic to mute/unmute the guide voice */}
        <View style={styles.sliderColumn}>
          <TouchableOpacity
            onPress={onToggleVoiceMute}
            accessibilityLabel={voiceMuted ? 'Unmute voice' : 'Mute voice'}
            hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
            style={styles.muteBtn}
          >
            {voiceMuted ? (
              <MicOff size={16} color={MUTED_COLOR} strokeWidth={2} />
            ) : (
              <Mic size={16} color={accentColor} strokeWidth={2} />
            )}
          </TouchableOpacity>
          <VolumeSlider
            value={voiceMuted ? 0 : voiceVolume}
            onChange={onVoiceVolumeChange}
            color={voiceMuted ? MUTED_COLOR : accentColor}
          />
          <Text style={[styles.value, { color: voiceMuted ? MUTED_COLOR : accentColor }]}>
            {voiceMuted ? 0 : Math.round(voiceVolume * 100)}
          </Text>
        </View>

        {/* Orb Space (220px) */}
        <View style={styles.orbSpace} />

        {/* Music Slider — tap the note to mute/unmute the ambient music */}
        <View style={styles.sliderColumn}>
          <TouchableOpacity
            onPress={onToggleMusicMute}
            accessibilityLabel={musicMuted ? 'Unmute music' : 'Mute music'}
            hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
            style={styles.muteBtn}
          >
            {musicMuted ? (
              <VolumeX size={16} color={MUTED_COLOR} strokeWidth={2} />
            ) : (
              <Music size={16} color={accentColor} strokeWidth={2} />
            )}
          </TouchableOpacity>
          <VolumeSlider
            value={musicMuted ? 0 : ambientVolume}
            onChange={onAmbientVolumeChange}
            color={musicMuted ? MUTED_COLOR : accentColor}
          />
          <Text style={[styles.value, { color: musicMuted ? MUTED_COLOR : accentColor }]}>
            {musicMuted ? 0 : Math.round(ambientVolume * 100)}
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
            const SoundIcon = music.icon;

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
                {/* music.icon is a lucide component — render it directly. */}
                <SoundIcon
                  size={isSelected ? 17 : 15}
                  color={isSelected ? music.color : 'rgba(255,255,255,0.45)'}
                  strokeWidth={2}
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

  muteBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
