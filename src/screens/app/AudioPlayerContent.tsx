import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { AudioTrack } from '@/types/audio.types';
import { formatDurationSeconds } from '@/utils/formatTime';

const SLEEP_TIMER_MS = 15 * 60 * 1000;

type Props = {
  track: AudioTrack;
};

export default function AudioPlayerContent({ track }: Props) {
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sleepTimerOn, setSleepTimerOn] = useState(false);

  const player = useAudioPlayer(track.url, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
    return () => {
      try { player.pause(); } catch { /* already released after unmount */ }
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [player]);

  const elapsed = Math.floor(status.currentTime ?? 0);
  const total =
    status.duration && status.duration > 0
      ? Math.floor(status.duration)
      : track.duration;
  const progress = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  const isPlaying = status.playing;
  const isBuffering = status.isBuffering;

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      Alert.alert('Playback error', 'Could not play this track. Check your connection.');
    }
  };

  const toggleSleepTimer = () => {
    if (sleepTimerOn) {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
      setSleepTimerOn(false);
      return;
    }
    setSleepTimerOn(true);
    sleepTimerRef.current = setTimeout(() => {
      player.pause();
      setSleepTimerOn(false);
      Alert.alert('Sleep timer', 'Playback stopped. Sweet dreams.');
    }, SLEEP_TIMER_MS);
    Alert.alert('Sleep timer', 'Audio will stop in 15 minutes.');
  };

  const playerContent = (
    <View style={styles.center}>
      <GlassCard style={styles.art}>
        {isBuffering && !isPlaying ? (
          <ActivityIndicator color={colors.accent.purple} size="large" />
        ) : (
          <Text style={styles.artEmoji}>🎧</Text>
        )}
      </GlassCard>
      <Text style={styles.trackTitle}>{track.title}</Text>
      <Text style={styles.trackSub}>{track.description}</Text>
      <Text style={styles.time}>
        {formatDurationSeconds(elapsed)} / {formatDurationSeconds(total)}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.controls}>
        <PrimaryButton
          label={isPlaying ? 'Pause' : 'Play'}
          onPress={togglePlay}
          style={styles.playBtn}
        />
        <OutlineButton
          label={sleepTimerOn ? 'Cancel sleep timer' : 'Sleep timer · 15 min'}
          onPress={toggleSleepTimer}
        />
      </View>
    </View>
  );

  return (
    <ScreenShell scroll={false} safeBottom>
      <ScreenHeader title={track.title} showBack />
      {track.featureId ? (
        <PaywallGate featureId={track.featureId}>{playerContent}</PaywallGate>
      ) : (
        playerContent
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  art: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artEmoji: { fontSize: 72 },
  trackTitle: { ...typography.headingMedium, color: colors.text.primary, textAlign: 'center' },
  trackSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  time: { ...typography.body, color: colors.text.secondary, marginTop: spacing.sm },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.purpleLight,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent.purple },
  controls: { width: '100%', gap: spacing.md, marginTop: spacing.lg },
  playBtn: { marginBottom: spacing.sm },
});
