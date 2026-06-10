import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { EMOTIONAL_STATES, type EmotionalState } from '@/constants/emotionalStates';
import { getSessionById, getRecommendedSession } from '@/constants/relaxSessions';
import { colors } from '@/constants/colors';
import { useRelaxContext } from '@/context/RelaxContext';

export default function RelaxCompletion() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);
  const [rated, setRated] = useState(false);

  // Celebration animations
  const heroScale = useSharedValue(0.5);
  const heroOpacity = useSharedValue(0);
  const statsSlide = useSharedValue(-50);
  const statsOpacity = useSharedValue(0);
  const emotionSlide = useSharedValue(-50);
  const emotionOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate hero section
    heroScale.value = withSpring(1, { damping: 8, mass: 1 });
    heroOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });

    // Animate stats section
    setTimeout(() => {
      statsSlide.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
      statsOpacity.value = withTiming(1, { duration: 500 });
    }, 200);

    // Animate emotion section
    setTimeout(() => {
      emotionSlide.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
      emotionOpacity.value = withTiming(1, { duration: 500 });
    }, 400);

    // Haptic feedback on load
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [heroScale, heroOpacity, statsSlide, statsOpacity, emotionSlide, emotionOpacity]);

  const session = getSessionById(sessionId || '');
  const { completedSessions, completeSession } = useRelaxContext();

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={{ color: colors.text.primary }}>Session not found</Text>
      </SafeAreaView>
    );
  }

  const handleSelectEmotion = (emotion: EmotionalState) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion);
  };

  const handleRate = (rating: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRated(true);
    completeSession(selectedEmotion, rating);
  };

  const handleHome = () => {
    router.back();
  };

  const nextSession = selectedEmotion ? getRecommendedSession(selectedEmotion) : null;
  const thisWeekSessions = completedSessions.filter(
    (s: any) => s.completedAt > Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;

  const heroAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  const statsAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsSlide.value }],
    opacity: statsOpacity.value,
  }));

  const emotionAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emotionSlide.value }],
    opacity: emotionOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* ─── Celebration Hero Section ─────────────────────── */}
        <Animated.View style={[styles.heroSection, heroAnimStyle]}>
          <View style={[styles.celebrationGlow, { backgroundColor: session.color + '15' }]} />

          <Ionicons name="checkmark-circle" size={80} color={session.color} />

          <Text style={styles.celebrationText}>Well Done!</Text>
          <Text style={[styles.sessionTitle, { color: session.color }]}>{session.title}</Text>
          <Text style={styles.sessionDuration}>
            {Math.ceil(session.durationSeconds / 60)} minutes of peace
          </Text>
        </Animated.View>

        {/* ─── Progress Stats ──────────────────────────────── */}
        <Animated.View style={[styles.statsSection, statsAnimStyle]}>
          <View style={[styles.statBox, { borderLeftColor: session.color }]}>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{thisWeekSessions}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <Ionicons name="checkmark-done" size={24} color={session.color} opacity={0.6} />
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#4FC3F7' }]}>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{completedSessions.length}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <Ionicons name="flame" size={24} color="#4FC3F7" opacity={0.6} />
          </View>
        </Animated.View>

        {/* ─── Emotion Feedback ──────────────────────────── */}
        <Animated.View style={[styles.feedbackSection, emotionAnimStyle]}>
          <Text style={styles.sectionTitle}>How are you feeling now?</Text>

          <View style={styles.emotionGrid}>
            {EMOTIONAL_STATES.map(emotion => {
              const isSelected = selectedEmotion === emotion.state;
              return (
                <TouchableOpacity
                  key={emotion.state}
                  onPress={() => handleSelectEmotion(emotion.state)}
                  style={[
                    styles.emotionCard,
                    isSelected && {
                      backgroundColor: emotion.color + '20',
                      borderColor: emotion.color,
                      borderWidth: 2,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text
                    style={[
                      styles.emotionName,
                      isSelected && { color: emotion.color, fontWeight: '700' },
                    ]}
                  >
                    {emotion.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ─── Rating Section ───────────────────────────── */}
        {selectedEmotion && !rated && (
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Rate your session</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(rating => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => handleRate(rating)}
                  style={styles.starButton}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="star"
                    size={36}
                    color={rating <= 3 ? '#FFC107' : rating <= 4 ? '#FF9800' : '#4FC3F7'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── Next Session ─────────────────────────────── */}
        {rated && nextSession && nextSession.id !== sessionId && (
          <View style={styles.nextSection}>
            <Text style={styles.sectionTitle}>Continue your journey</Text>

            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: '/(app)/relax/player',
                  params: { sessionId: nextSession.id },
                } as never);
              }}
              style={[styles.nextCard, { borderColor: nextSession.color + '40' }]}
              activeOpacity={0.85}
            >
              <View style={[styles.nextCardGlow, { backgroundColor: nextSession.color + '10' }]} />

              <Text style={styles.nextEmoji}>{nextSession.emoji}</Text>

              <View style={styles.nextInfo}>
                <Text style={[styles.nextTitle, { color: nextSession.color }]}>
                  {nextSession.title}
                </Text>
                <Text style={styles.nextDesc}>{nextSession.useCase}</Text>
              </View>

              <Ionicons name="arrow-forward" size={20} color={nextSession.color} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Actions ──────────────────────────────────── */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            onPress={handleHome}
            style={[styles.primaryBtn, { backgroundColor: session.color + '20', borderColor: session.color }]}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={18} color={session.color} />
            <Text style={[styles.primaryBtnText, { color: session.color }]}>Back to Home</Text>
          </TouchableOpacity>
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

  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 30,
    position: 'relative',
  },

  celebrationGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: 0,
    zIndex: -1,
    opacity: 0.3,
  },

  celebrationText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -1,
    marginTop: 12,
  },

  sessionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },

  sessionDuration: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    gap: 12,
    marginBottom: 32,
  },

  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  statContent: {
    flex: 1,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },

  statLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
    fontWeight: '600',
  },

  // Emotion feedback
  feedbackSection: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },

  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },

  emotionCard: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  emotionEmoji: {
    fontSize: 32,
  },

  emotionName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Rating
  ratingSection: {
    marginBottom: 32,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
  },

  starButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Next session
  nextSection: {
    marginBottom: 32,
  },

  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    marginTop: 16,
    position: 'relative',
    overflow: 'hidden',
  },

  nextCardGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },

  nextEmoji: {
    fontSize: 40,
  },

  nextInfo: {
    flex: 1,
  },

  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  nextDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Actions
  actionSection: {
    gap: 12,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    gap: 8,
  },

  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  spacer: {
    height: 20,
  },
});
