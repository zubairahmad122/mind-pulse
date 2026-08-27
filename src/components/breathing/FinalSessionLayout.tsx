/**
 * FinalSessionLayout — the active-session chrome around the breathing orb
 * (the orb itself is layered on top by the screen, not by this component).
 *
 * - Top: one compact row — End · Pause · elapsed/total timer.
 * - Middle: empty flex space, reserved for the orb overlay.
 * - Bottom: a quiet "now playing" pill (tap opens the volume sheet) + a
 *   compact horizontal sound-preset strip. No permanently-visible sliders.
 */

import type { BreathingMusicId } from '@/constants/breathingMusic';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import {
  Mic,
  MicOff,
  Music,
  Pause,
  Play,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { memo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

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

function formatTimer(elapsedSeconds: number, sessionDuration: number): string {
  const elapsed = Math.floor(elapsedSeconds);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = String(elapsed % 60).padStart(2, '0');
  const totalMin = Math.floor(sessionDuration / 60);
  const totalSec = String(sessionDuration % 60).padStart(2, '0');
  return `${elapsedMin}:${elapsedSec} / ${totalMin}:${totalSec}`;
}

// ─── Horizontal volume slider — used only inside the compact sound sheet ───
function HorizontalSlider({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const width = useRef(1);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: evt => {
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / width.current));
        onChange(parseFloat(ratio.toFixed(2)));
      },
    }),
  ).current;

  return (
    <View
      style={styles.sliderTrackWrap}
      onLayout={e => { width.current = Math.max(1, e.nativeEvent.layout.width); }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.sliderTrack, { backgroundColor: color + '20' }]} />
      <View style={[styles.sliderFill, { width: `${value * 100}%`, backgroundColor: color }]} />
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
  onStop,
  isPaused,
  onTogglePause,
  selectedId,
  onSelect,
  accentColor,
  elapsedSeconds,
  sessionDuration,
}: FinalSessionLayoutProps) {
  const insets = useSafeAreaInsets();
  const [soundSheetOpen, setSoundSheetOpen] = useState(false);
  const selectedMusic = BREATHING_MUSIC.find(m => m.id === selectedId) ?? BREATHING_MUSIC[0];
  const SelectedIcon = selectedMusic.icon;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* ─── Top: End · Pause · Timer — one compact row ─────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="End session"
          style={styles.endPill}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <X size={17} color="rgba(255,255,255,0.75)" strokeWidth={2.2} />
          <Text style={styles.endLabel}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onTogglePause}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
          style={[
            styles.pausePill,
            { backgroundColor: accentColor + '22', borderColor: accentColor + '55' },
          ]}
        >
          {isPaused ? (
            <Play size={18} color={accentColor} fill={accentColor} />
          ) : (
            <Pause size={18} color={accentColor} fill={accentColor} />
          )}
        </TouchableOpacity>

        <Text style={[styles.timer, { color: accentColor }]}>
          {formatTimer(elapsedSeconds, sessionDuration)}
        </Text>
      </View>

      {/* ─── Middle: reserved for the orb, drawn above this layer ── */}
      <View style={styles.middleSpace} />

      {/* ─── Bottom: now-playing pill + compact preset strip ──────── */}
      {/* No extra safe-area padding here — the screen's SafeAreaView already reserves it. */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          onPress={() => setSoundSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open sound settings"
          style={styles.nowPlaying}
          activeOpacity={0.8}
        >
          <SelectedIcon size={14} color={selectedMusic.color} strokeWidth={2} />
          <Text style={styles.nowPlayingText} numberOfLines={1}>{selectedMusic.label}</Text>
          <View style={styles.nowPlayingDot} />
          <Volume2 size={13} color={musicMuted ? MUTED_COLOR : accentColor} strokeWidth={2} />
          <Text style={[styles.nowPlayingText, { color: musicMuted ? MUTED_COLOR : accentColor }]}>
            {musicMuted ? 0 : Math.round(ambientVolume * 100)}%
          </Text>
          <SlidersHorizontal size={12} color="rgba(255,255,255,0.35)" strokeWidth={2} />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
          decelerationRate="fast"
        >
          {BREATHING_MUSIC.map(music => {
            const isSelected = selectedId === music.id;
            const SoundIcon = music.icon;
            return (
              <TouchableOpacity
                key={music.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onSelect(music.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${music.label} sound`}
                style={[
                  styles.presetTile,
                  {
                    backgroundColor: isSelected ? music.color + '1E' : 'rgba(255,255,255,0.04)',
                    borderColor: isSelected ? music.color + '55' : 'rgba(255,255,255,0.08)',
                  },
                ]}
                activeOpacity={0.75}
              >
                <SoundIcon
                  size={isSelected ? 18 : 16}
                  color={isSelected ? music.color : 'rgba(255,255,255,0.4)'}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.presetLabel,
                    { color: isSelected ? music.color : 'rgba(255,255,255,0.35)', fontWeight: isSelected ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {music.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Compact sound sheet — voice + ambient volume, opened on demand ── */}
      <Modal
        visible={soundSheetOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSoundSheetOpen(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSoundSheetOpen(false)}>
          <Animated.View entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill} />
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 14 }]}
            onPress={e => e.stopPropagation()}
          >
            <Animated.View entering={FadeInUp.springify().damping(20).stiffness(180)} exiting={FadeOutDown.duration(160)}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Sound</Text>

              <View style={styles.sheetRow}>
                <TouchableOpacity
                  onPress={onToggleVoiceMute}
                  accessibilityRole="button"
                  accessibilityLabel={voiceMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
                  hitSlop={10}
                  style={styles.sheetIconBtn}
                >
                  {voiceMuted ? <MicOff size={18} color={MUTED_COLOR} /> : <Mic size={18} color={accentColor} />}
                </TouchableOpacity>
                <Text style={styles.sheetRowLabel}>Guidance</Text>
                <HorizontalSlider
                  value={voiceMuted ? 0 : voiceVolume}
                  onChange={onVoiceVolumeChange}
                  color={voiceMuted ? MUTED_COLOR : accentColor}
                />
                <Text style={[styles.sheetValue, { color: voiceMuted ? MUTED_COLOR : accentColor }]}>
                  {voiceMuted ? 0 : Math.round(voiceVolume * 100)}
                </Text>
              </View>

              <View style={styles.sheetRow}>
                <TouchableOpacity
                  onPress={onToggleMusicMute}
                  accessibilityRole="button"
                  accessibilityLabel={musicMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
                  hitSlop={10}
                  style={styles.sheetIconBtn}
                >
                  {musicMuted ? <VolumeX size={18} color={MUTED_COLOR} /> : <Music size={18} color={accentColor} />}
                </TouchableOpacity>
                <Text style={styles.sheetRowLabel}>Ambient</Text>
                <HorizontalSlider
                  value={musicMuted ? 0 : ambientVolume}
                  onChange={onAmbientVolumeChange}
                  color={musicMuted ? MUTED_COLOR : accentColor}
                />
                <Text style={[styles.sheetValue, { color: musicMuted ? MUTED_COLOR : accentColor }]}>
                  {musicMuted ? 0 : Math.round(ambientVolume * 100)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSoundSheetOpen(false)}
                accessibilityRole="button"
                style={[styles.sheetDone, { backgroundColor: accentColor + '20', borderColor: accentColor + '55' }]}
              >
                <Text style={[styles.sheetDoneText, { color: accentColor }]}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'column',
  },

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 12,
    height: 50,
  },
  endPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  endLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  pausePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Middle: empty — the orb is layered above this component ── */
  middleSpace: {
    flex: 1,
  },

  /* ── Bottom: now-playing pill + preset strip ── */
  bottomArea: {
    gap: 10,
    paddingBottom: 8,
  },
  nowPlaying: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nowPlayingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  nowPlayingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  presetRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  presetTile: {
    width: 66,
    height: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  presetLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  /* ── Compact sound sheet ── */
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,6,15,0.55)',
  },
  sheet: {
    backgroundColor: '#14131f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sheetIconBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    width: 68,
  },
  sheetValue: {
    fontSize: 12,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  sheetDone: {
    marginTop: 4,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── Horizontal slider (inside sheet) ── */
  sliderTrackWrap: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
});
