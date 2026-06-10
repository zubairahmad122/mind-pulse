import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getSessionsByCategory,
  type SessionCategory,
  RELAX_SESSIONS,
} from '@/constants/relaxSessions';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export default function RelaxLibrary() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: SessionCategory }>();

  const categoryNames: Record<SessionCategory, string> = {
    breathe: 'Breathing',
    release: 'Release & Tension',
    ground: 'Grounding',
    sleep: 'Sleep',
  };

  const sessions = category ? getSessionsByCategory(category) : RELAX_SESSIONS;
  const title = category ? categoryNames[category] : 'All Sessions';

  const handleStartSession = (sessionId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(app)/relax/player',
      params: { sessionId },
    } as never);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Sessions List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sessionsList}>
          {sessions.map((session, index) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => handleStartSession(session.id)}
              style={[styles.sessionCard, index === sessions.length - 1 && styles.lastCard]}
              activeOpacity={0.85}
            >
              <View style={styles.sessionCardContent}>
                <Text style={styles.sessionEmoji}>{session.emoji}</Text>

                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionDescription} numberOfLines={2}>
                    {session.description}
                  </Text>
                  <View style={styles.sessionMeta}>
                    <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                    <Text style={styles.sessionDuration}>
                      {Math.ceil(session.durationSeconds / 60)} min
                    </Text>
                    <Text style={styles.sessionDot}>·</Text>
                    <Text style={styles.sessionDifficulty}>{session.difficulty}</Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color={session.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    ...typography.headingSmall,
    color: colors.text.primary,
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  sessionsList: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },

  sessionCard: {
    backgroundColor: '#16113a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: spacing.md,
  },

  lastCard: {
    marginBottom: spacing.lg,
  },

  sessionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  sessionEmoji: {
    fontSize: 32,
    marginRight: spacing.xs,
  },

  sessionInfo: {
    flex: 1,
    gap: spacing.xs,
  },

  sessionTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '700',
  },

  sessionDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16,
  },

  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  sessionDuration: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },

  sessionDot: {
    color: colors.text.tertiary,
    fontSize: 10,
  },

  sessionDifficulty: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
    textTransform: 'capitalize',
  },

  spacer: {
    height: spacing.xl,
  },
});
