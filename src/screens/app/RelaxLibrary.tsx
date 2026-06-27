import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { colors } from '@/constants/colors';
import {
  getSessionsByCategory,
  type SessionCategory,
  RELAX_SESSIONS,
} from '@/constants/relaxSessions';
import { spacing } from '@/constants/spacing';

const CATEGORY_NAMES: Record<SessionCategory, string> = {
  breathe: 'Breathing',
  release: 'Release & Tension',
  ground: 'Grounding',
  sleep: 'Sleep',
};

export default function RelaxLibrary() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: SessionCategory }>();

  const sessions = category ? getSessionsByCategory(category) : RELAX_SESSIONS;
  const title = category ? CATEGORY_NAMES[category] : 'All Sessions';

  const handleStartSession = (sessionId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(app)/relax/player',
      params: { sessionId },
    } as never);
  };

  return (
    <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <View style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
              <ChevronLeft size={22} color={colors.text.secondary} strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
          </View>

          {/* Sessions list */}
          <View style={styles.list}>
            {sessions.map(session => {
              const card = (
                <TouchableOpacity
                  onPress={() => handleStartSession(session.id)}
                  activeOpacity={0.85}
                >
                  <GlassCard simple noPadding style={[styles.sessionCard, { borderColor: session.color + '28' }]}>
                    <LinearGradient
                      colors={[session.color + '12', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.sessionRow}>
                      <View style={[styles.sessionIcon, { borderColor: session.color + '38' }]}>
                        <LinearGradient
                          colors={[session.color + '28', session.color + '10']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        {session.icon ? (
                          (() => {
                            const SessIcon = session.icon!;
                            return <SessIcon size={24} color={session.color} strokeWidth={1.9} />;
                          })()
                        ) : (
                          <Text style={styles.sessionEmoji}>{session.emoji}</Text>
                        )}
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>
                          {session.title}
                        </Text>
                        <Text style={styles.sessionDesc} numberOfLines={2}>
                          {session.description}
                        </Text>
                        <View style={styles.metaRow}>
                          <Clock size={11} color={colors.text.tertiary} strokeWidth={2} />
                          <Text style={styles.metaText}>
                            {Math.ceil(session.durationSeconds / 60)} min
                          </Text>
                          <View style={styles.metaDot} />
                          <Text style={[styles.metaText, styles.capitalize]}>{session.difficulty}</Text>
                        </View>
                      </View>
                      <View style={[styles.arrow, { backgroundColor: session.color + '18', borderColor: session.color + '30' }]}>
                        <ChevronRight size={17} color={session.color} strokeWidth={2.3} />
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );

              return session.featureId ? (
                <PaywallGate key={session.id} featureId={session.featureId}>
                  {card}
                </PaywallGate>
              ) : (
                <View key={session.id}>{card}</View>
              );
            })}
          </View>
        </View>
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: spacing.xs,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  list: {
    gap: 10,
  },
  sessionCard: {
    borderWidth: 1,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 80,
  },
  sessionIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  sessionEmoji: {
    fontSize: 26,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f6f8fc',
    letterSpacing: 0.15,
  },
  sessionDesc: {
    fontSize: 12.5,
    color: 'rgba(245,247,251,0.5)',
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  metaDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: colors.text.tertiary,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
});
