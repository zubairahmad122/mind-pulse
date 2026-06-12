import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Leaf, AlertCircle, Cloud, ZapOff, Moon, Flame, Hand, Compass, Clock, PlayCircle, ChevronRight, CheckCircle, type LucideIcon } from 'lucide-react-native';

import { ScreenShell } from '@/components/layout/ScreenShell';
import {
  EMOTIONAL_STATES,
  getEmotionOption,
  type EmotionalState,
} from '@/constants/emotionalStates';
import {
  getRecommendedSession,
  getSessionsByCategory,
  type SessionCategory,
  RELAX_SESSIONS,
} from '@/constants/relaxSessions';
import { useRelaxContext } from '@/context/RelaxContext';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/colors';

const CATEGORIES: { id: SessionCategory; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'breathe', label: 'Breathing', icon: Flame, color: '#FF9800' },
  { id: 'release', label: 'Release', icon: Hand, color: '#FF6B9D' },
  { id: 'ground', label: 'Ground', icon: Compass, color: '#4CAF50' },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: '#7B61FF' },
];

const EMOTION_ICONS: Record<EmotionalState, LucideIcon> = {
  'at-ease': Leaf,
  'tense': AlertCircle,
  'overwhelmed': Cloud,
  'drained': ZapOff,
  'sleepy': Moon,
};

export default function RelaxHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SessionCategory>('breathe');
  const [completedThisWeek, setCompletedThisWeek] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  const { completedSessions, setLastEmotion } = useRelaxContext();

  useEffect(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = completedSessions.filter((s: any) => s.completedAt > oneWeekAgo).length;
    setCompletedThisWeek(thisWeek);
    setTotalCompleted(completedSessions.length);
  }, [completedSessions]);

  const handleSelectEmotion = (emotion: EmotionalState) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion);
    setLastEmotion(emotion);
  };

  const handleStartSession = (sessionId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(app)/relax/player',
      params: { sessionId },
    } as never);
  };

  const recommendedSession = selectedEmotion ? getRecommendedSession(selectedEmotion) : null;
  const categorySessions = getSessionsByCategory(selectedCategory);
  const timeOfDay = getTimeOfDay();

  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good {timeOfDay}</Text>
              <Text style={styles.subtitle}>
                {selectedEmotion
                  ? `Let's help with ${getEmotionOption(selectedEmotion).label.toLowerCase()}`
                  : 'How are you feeling today?'}
              </Text>
            </View>
          </View>
        </View>

        {/* Emotional Check-In */}
        <View style={styles.emotionSection}>
          <Text style={styles.sectionLabel}>Your mood</Text>
          <View style={styles.emotionGrid}>
            {EMOTIONAL_STATES.map(emotion => {
              const isSelected = selectedEmotion === emotion.state;
              const EmotionIcon = EMOTION_ICONS[emotion.state];
              return (
                <Pressable
                  key={emotion.state}
                  onPress={() => handleSelectEmotion(emotion.state)}
                  style={[
                    styles.emotionCard,
                    isSelected && { backgroundColor: emotion.color + '18', borderColor: emotion.color, borderWidth: 1.5 },
                  ]}
                >
                  <EmotionIcon
                    size={28}
                    color={isSelected ? emotion.color : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.emotionCardText,
                      isSelected && { color: emotion.color, fontWeight: '700' },
                    ]}
                  >
                    {emotion.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recommended Session */}
        {recommendedSession && (
          <TouchableOpacity
            onPress={() => handleStartSession(recommendedSession.id)}
            style={[styles.recommendedCard, { borderColor: recommendedSession.color + '33' }]}
            activeOpacity={0.85}
          >
            <View style={styles.recommendedContent}>
              <View
                style={[
                  styles.recommendedIcon,
                  { backgroundColor: recommendedSession.color + '22' },
                ]}
              >
                <Text style={styles.recommendedEmoji}>{recommendedSession.emoji}</Text>
              </View>
              <View style={styles.recommendedInfo}>
                <Text style={styles.recommendedTag}>Recommended for you</Text>
                <Text style={styles.recommendedTitle}>{recommendedSession.title}</Text>
                <View style={styles.recommendedMeta}>
                  <Clock size={14} color={colors.text.tertiary} />
                  <Text style={styles.recommendedDuration}>
                    {Math.ceil(recommendedSession.durationSeconds / 60)} min
                  </Text>
                </View>
              </View>
              <PlayCircle size={28} color={recommendedSession.color} />
            </View>
          </TouchableOpacity>
        )}

        {/* Category Tabs */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionLabel}>Browse sessions</Text>
          <View style={styles.categoryTabs}>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              const CatIcon = cat.icon;
              const count = getSessionsByCategory(cat.id).length;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id);
                  }}
                  style={[
                    styles.categoryTab,
                    isActive && {
                      backgroundColor: cat.color + '18',
                      borderColor: cat.color,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <CatIcon
                    size={20}
                    color={isActive ? cat.color : colors.text.tertiary}
                  />
                  <View style={styles.categoryTabInfo}>
                    <Text
                      style={[
                        styles.categoryTabLabel,
                        isActive && { color: cat.color, fontWeight: '700' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryTabCount}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sessions List */}
        <View style={styles.sessionsSection}>
          {categorySessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => handleStartSession(session.id)}
              style={[
                styles.sessionItem,
                { borderLeftColor: session.color, borderLeftWidth: 3 },
              ]}
              activeOpacity={0.85}
            >
              <View style={[styles.sessionIconBox, { backgroundColor: session.color + '18' }]}>
                <Text style={styles.sessionEmoji}>{session.emoji}</Text>
              </View>
              <View style={styles.sessionItemContent}>
                <Text style={styles.sessionItemTitle}>{session.title}</Text>
                <Text style={styles.sessionItemDesc} numberOfLines={1}>
                  {session.description}
                </Text>
                <View style={styles.sessionItemMeta}>
                  <Clock size={12} color={colors.text.tertiary} />
                  <Text style={styles.sessionItemDuration}>
                    {Math.ceil(session.durationSeconds / 60)} min
                  </Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.sessionItemDifficulty}>{session.difficulty}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={session.color} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Section */}
        {totalCompleted > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionLabel}>Your progress</Text>
            <View style={styles.statsCards}>
              <View style={styles.statCard}>
                <View style={styles.statIconBox}>
                  <Flame size={20} color="#FF9800" />
                </View>
                <Text style={styles.statValue}>{completedThisWeek}</Text>
                <Text style={styles.statLabel}>This week</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconBox}>
                  <CheckCircle size={20} color="#4CAF50" />
                </View>
                <Text style={styles.statValue}>{totalCompleted}</Text>
                <Text style={styles.statLabel}>Total sessions</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenShell>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },

  headerSection: {
    marginBottom: 32,
    gap: 8,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },

  greeting: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },


  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  emotionSection: {
    marginBottom: 32,
  },

  emotionGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  emotionCard: {
    width: '18%',
    minWidth: 56,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  emotionCardText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 12,
  },

  recommendedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 32,
    minHeight: 100,
    justifyContent: 'center',
  },

  recommendedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  recommendedIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  recommendedEmoji: {
    fontSize: 32,
  },

  recommendedInfo: {
    flex: 1,
    gap: 5,
  },

  recommendedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent.blue,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  recommendedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },

  recommendedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },

  recommendedDuration: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  categorySection: {
    marginBottom: 32,
  },

  categoryTabs: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },

  categoryTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    minHeight: 80,
  },

  categoryTabInfo: {
    alignItems: 'center',
    gap: 2,
  },

  categoryTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  categoryTabCount: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  sessionsSection: {
    marginBottom: 32,
    gap: 12,
  },

  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    paddingLeft: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 3,
    minHeight: 76,
  },

  sessionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  sessionEmoji: {
    fontSize: 28,
  },

  sessionItemContent: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },

  sessionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },

  sessionItemDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 16,
  },

  sessionItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },

  sessionItemDuration: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.text.tertiary,
  },

  sessionItemDifficulty: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
    fontWeight: '500',
  },

  statsSection: {
    marginBottom: 32,
  },

  statsCards: {
    flexDirection: 'row',
    gap: 12,
  },

  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent.purple,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  spacer: {
    height: 20,
  },
});
