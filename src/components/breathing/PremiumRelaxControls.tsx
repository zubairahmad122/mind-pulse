import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef } from 'react';
import {
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

interface PremiumRelaxControlsProps {
  // Timer
  elapsedSeconds: number;
  totalSeconds: number;

  // Sounds
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;

  // Volume
  voiceVolume: number;
  ambientVolume: number;
  onVoiceVolumeChange: (v: number) => void;
  onAmbientVolumeChange: (v: number) => void;

  // Controls
  isPaused: boolean;
  onPause: () => void;
  onStop: () => void;
  isCountdown: boolean;
  countdownNum: number;
  accentColor: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Vertical Draggable Volume Slider ───────────────────────────────
function VerticalVolumeSlider({
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
      onPanResponderRelease: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  return (
    <View style={[styles.sliderContainer, side === 'left' ? styles.sliderLeft : styles.sliderRight]}>
      <Text style={[styles.sliderLabel, { color }]}>{label}</Text>

      <View
        style={[styles.sliderTrack, { height: SLIDER_HEIGHT }]}
        {...panResponder.panHandlers}
      >
        {/* Background */}
        <View style={[styles.sliderBg, { backgroundColor: color + '15' }]} />

        {/* Fill from bottom */}
        <View
          style={[
            styles.sliderFill,
            {
              height: `${value * 100}%`,
              backgroundColor: color,
            },
          ]}
        />

        {/* Thumb button */}
        <TouchableOpacity
          style={[
            styles.sliderThumb,
            {
              bottom: `${value * 100}%`,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Ionicons name={icon} size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Value */}
      <Text style={[styles.sliderValue, { color }]}>
        {Math.round(value * 100)}
      </Text>
    </View>
  );
}

// ─── Sound Selection Grid ───────────────────────────────────────────
function SoundSelectionGrid({
  selectedId,
  onSelect,
}: {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
}) {
  return (
    <View style={styles.soundGrid}>
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
              styles.soundButton,
              {
                backgroundColor: isSelected ? music.color + '30' : 'rgba(255,255,255,0.06)',
                borderColor: isSelected ? music.color + '60' : 'rgba(255,255,255,0.1)',
              },
            ]}
            activeOpacity={0.8}
          >
            {/* Ionicons name prop expects a specific icon name type, but our
                music config uses string constants that are known-safe at runtime. */}
            <Ionicons
              name={music.icon as any}
              size={isSelected ? 22 : 18}
              color={isSelected ? music.color : 'rgba(255,255,255,0.4)'}
            />
            <Text
              style={[
                styles.soundLabel,
                {
                  color: isSelected ? music.color : 'rgba(255,255,255,0.35)',
                  fontWeight: isSelected ? '700' : '600',
                  fontSize: isSelected ? 10 : 9,
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

// ─── Main Component ────────────────────────────────────────────────
export const PremiumRelaxControls = memo(function PremiumRelaxControls({
  elapsedSeconds,
  totalSeconds,
  selectedId,
  onSelect,
  voiceVolume,
  ambientVolume,
  onVoiceVolumeChange,
  onAmbientVolumeChange,
  isPaused,
  onPause,
  onStop,
  isCountdown,
  countdownNum,
  accentColor,
}: PremiumRelaxControlsProps) {
  const countdownScale = useSharedValue(1);
  const beepPlayer = useAudioPlayer(require('@/assets/sounds/effects/hit.mp3'));

  useEffect(() => {
    if (isCountdown && countdownNum === 2) {
      // Play beep sound on count 2
      try {
        beepPlayer.play();
      } catch (e) {
        console.warn('Could not play beep:', e);
      }
    }
  }, [countdownNum, isCountdown, beepPlayer]);

  useEffect(() => {
    countdownScale.value = withTiming(1, { duration: 200 });
  }, [countdownNum]);

  const countdownAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.wrapper}>
      {/* Top: Timer */}
      <View style={styles.timerSection}>
        <View style={styles.timerItem}>
          <Text style={styles.timerLabel}>ELAPSED</Text>
          <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>
        </View>
        <Text style={styles.timerSeparator}>/</Text>
        <View style={styles.timerItem}>
          <Text style={styles.timerLabel}>TOTAL</Text>
          <Text style={styles.timerValue}>{formatTime(totalSeconds)}</Text>
        </View>
      </View>

      {/* Middle: Voice Slider | Orb Space | Music Slider */}
      <View style={styles.mainRow}>
        <VerticalVolumeSlider
          label="VOICE"
          icon="volume-medium"
          value={voiceVolume}
          onChange={onVoiceVolumeChange}
          color={accentColor}
          side="left"
        />

        {/* Center Spacer for Orb */}
        <View style={styles.orbSpace} />

        <VerticalVolumeSlider
          label="MUSIC"
          icon="musical-notes"
          value={ambientVolume}
          onChange={onAmbientVolumeChange}
          color="#4FC3F7"
          side="right"
        />
      </View>

      {/* Controls: Play/Pause + Stop */}
      <View style={styles.controlsSection}>
        {isCountdown && (
          <Animated.Text
            style={[
              styles.countdownText,
              { color: accentColor },
              countdownAnimStyle,
            ]}
          >
            {countdownNum}
          </Animated.Text>
        )}

        {!isCountdown && (
          <>
            <TouchableOpacity
              onPress={onPause}
              style={[styles.playBtn, { borderColor: accentColor }]}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={28}
                color={accentColor}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Bottom: Sound Selection */}
      <View style={styles.soundSection}>
        <SoundSelectionGrid selectedId={selectedId} onSelect={onSelect} />
      </View>
    </View>
  );
});

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingTop: 18,
    paddingBottom: 28,
    shadowColor: 'rgba(124, 58, 237, 0.15)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },

  // Timer section
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  timerItem: {
    alignItems: 'center',
    gap: 2,
  },

  timerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  timerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    fontVariant: ['tabular-nums'],
  },

  timerSeparator: {
    fontSize: 18,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.15)',
  },

  // Main row: Voice | Orb | Music
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 220,
  },

  sliderContainer: {
    alignItems: 'center',
    gap: 8,
  },

  sliderLeft: {
    flex: 0,
    minWidth: 50,
  },

  sliderRight: {
    flex: 0,
    minWidth: 50,
  },

  sliderLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  sliderTrack: {
    width: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'visible',
  },

  sliderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
  },

  sliderFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 22,
    opacity: 0.4,
  },

  sliderThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 5,
  },

  sliderValue: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },

  orbSpace: {
    flex: 1,
  },

  // Controls section
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
    minHeight: 56,
  },

  countdownText: {
    fontSize: 80,
    fontWeight: '200',
    lineHeight: 80,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },

  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },

  stopBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sound selection
  soundSection: {
    paddingHorizontal: 12,
  },

  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },

  soundButton: {
    width: '30%',
    aspectRatio: 0.85,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  soundLabel: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 12,
  },
});
