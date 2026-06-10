import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { getAudioTrackById } from '@/utils/audioTracks';

export default function AudioPlayerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const track = id ? getAudioTrackById(id) : undefined;
  const [PlayerContent, setPlayerContent] = useState<
    React.ComponentType<{ track: NonNullable<typeof track> }> | null
  >(null);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('./AudioPlayerContent')
      .then((mod) => {
        if (!cancelled) setPlayerContent(() => mod.default);
      })
      .catch(() => {
        if (!cancelled) setAudioUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!track) {
    return (
      <ScreenShell scroll={false} safeBottom>
        <ScreenHeader title="Audio" showBack />
        <View style={styles.center}>
          <Text style={styles.missing}>Track not found.</Text>
        </View>
      </ScreenShell>
    );
  }

  if (audioUnavailable) {
    return (
      <ScreenShell scroll={false} safeBottom>
        <ScreenHeader title={track.title} showBack />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Audio needs a dev build</Text>
          <Text style={styles.missing}>
            Rebuild the app so native audio is included:{'\n'}
            npx expo run:android
          </Text>
          <Text style={styles.trackMeta}>{track.title}</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!PlayerContent) {
    return (
      <ScreenShell scroll={false} safeBottom>
        <ScreenHeader title={track.title} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.purple} size="large" />
        </View>
      </ScreenShell>
    );
  }

  return <PlayerContent track={track} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  missing: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
  missingTitle: { ...typography.headingSmall, color: colors.text.primary, marginBottom: spacing.sm },
  trackMeta: { ...typography.bodyLarge, color: colors.text.primary, marginTop: spacing.lg },
});
