import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenShell } from '@/components/layout/ScreenShell';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, CheckCircle2, CheckCheck, Flame, Home, Star } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import { EMOTIONAL_STATES, type EmotionalState } from '@/constants/emotionalStates';
import { getSessionById, getRecommendedSession, getSessionRoute } from '@/constants/relaxSessions';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { spacing } from '@/constants/spacing';
import { useRelaxContext } from '@/context/RelaxContext';
import { useAudioGuide } from '@/hooks/useAudioGuide';

// Same accent as the Relax tab / session player — one color for the feature.
// Was a stale green (#34D399) predating the frozen spec's blue Relax accent.
const RELAX_ACCENT = PILLAR_COLORS.relax;

// Emotion grid: 3 columns. Card widths are computed in pixels from the
// measured grid width — percentage widths + gap wrapped to a broken
// 2-column layout on narrow screens.
const EMOTION_GAP = 10;
const EMOTION_COLUMNS = 3;

export default function RelaxCompletion() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);
  const [rated, setRated] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  // The closing narration from the session is still playing when we arrive —
  // let it finish here, and stop it only when the user leaves this screen.
  const { stop: stopVoice } = useAudioGuide();
  useEffect(() => {
    return () => stopVoice();
  }, [stopVoice]);

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
  const { completedSessions, completeSession, updateLastCompletion } = useRelaxContext();
  const [weekStart] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);

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

  // Record the completion as soon as this screen opens, so the stats above are
  // correct immediately. Mood + rating get attached to this record afterwards.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    completeSession(null);
  }, [completeSession]);

  if (!session) {
    return (
      <ScreenShell ambient={<AmbientBackground subtle />}>
        <View style={styles.notFound}>
          <Text style={{ color: colors.text.primary }}>Session not found</Text>
        </View>
      </ScreenShell>
    );
  }

  const handleSelectEmotion = (emotion: EmotionalState) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion);
  };

  const handleRate = (rating: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRated(true);
    updateLastCompletion(selectedEmotion, rating);
  };

  const handleHome = () => {
    // Pop back to where the session was launched from; if there's nothing
    // beneath (deep link), honor the button's label and go Home.
    if (router.canGoBack()) router.back();
    else router.replace(ROUTES.appHome as never);
  };

  const nextSession = selectedEmotion ? getRecommendedSession(selectedEmotion) : null;
  const thisWeekSessions = completedSessions.filter(
    (s: any) => s.completedAt > weekStart
  ).length;

  return (
    <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
      <View style={styles.page}>
        {/* ─── Celebration Hero Section ─────────────────────── */}
        <Animated.View style={[styles.heroSection, heroAnimStyle]}>
          <View style={[styles.celebrationGlow, { backgroundColor: RELAX_ACCENT + '20' }]} />

          <View style={[styles.heroIcon, { borderColor: RELAX_ACCENT + '40', shadowColor: RELAX_ACCENT }]}>
            <LinearGradient
              colors={[RELAX_ACCENT + '30', RELAX_ACCENT + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <CheckCircle2 size={52} color={RELAX_ACCENT} strokeWidth={1.8} />
          </View>

          <Text style={styles.celebrationText}>Well Done!</Text>
          <Text style={[styles.sessionTitle, { color: RELAX_ACCENT }]}>{session.title}</Text>
          <Text style={styles.sessionDuration}>
            {Math.round(session.durationSeconds / 60)} minutes of peace
          </Text>
        </Animated.View>

        {/* ─── Progress Stats ──────────────────────────────── */}
        <Animated.View style={[styles.statsSection, statsAnimStyle]}>
          <GlassCard style={styles.statCell}>
            <View style={[styles.statIcon, { borderColor: RELAX_ACCENT + '38' }]}>
              <LinearGradient
                colors={[RELAX_ACCENT + '28', RELAX_ACCENT + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <CheckCheck size={18} color={RELAX_ACCENT} />
            </View>
            <Text style={styles.statNumber}>{thisWeekSessions}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </GlassCard>

          <GlassCard style={styles.statCell}>
            <View style={[styles.statIcon, { borderColor: RELAX_ACCENT + '38' }]}>
              <LinearGradient
                colors={[RELAX_ACCENT + '28', RELAX_ACCENT + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Flame size={18} color={RELAX_ACCENT} />
            </View>
            <Text style={styles.statNumber}>{completedSessions.length}</Text>
            <Text style={styles.statLabel}>Total sessions</Text>
          </GlassCard>
        </Animated.View>

        {/* ─── Emotion Feedback ──────────────────────────── */}
        <Animated.View style={[styles.feedbackSection, emotionAnimStyle]}>
          <Text style={styles.sectionTitle}>How are you feeling now?</Text>

          <View
            style={styles.emotionGrid}
            onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
          >
            {EMOTIONAL_STATES.map(emotion => {
              const isSelected = selectedEmotion === emotion.state;
              const cardWidth = gridWidth
                ? Math.floor((gridWidth - EMOTION_GAP * (EMOTION_COLUMNS - 1)) / EMOTION_COLUMNS)
                : undefined;
              return (
                <TouchableOpacity
                  key={emotion.state}
                  onPress={() => handleSelectEmotion(emotion.state)}
                  style={[
                    styles.emotionCard,
                    cardWidth != null && { width: cardWidth },
                    isSelected && {
                      backgroundColor: emotion.color + '1f',
                      borderColor: emotion.color,
                      shadowColor: emotion.color,
                      shadowOpacity: 0.35,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text
                    style={[
                      styles.emotionName,
                      isSelected && { color: emotion.color, fontWeight: '800' },
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
              {[1, 2, 3, 4, 5].map(rating => {
                const starColors = ['#fbbf24', '#fbbf24', '#f59e0b', '#f97316', '#ea580c'];
                const color = starColors[rating - 1];
                return (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => handleRate(rating)}
                    style={[styles.starButton, { borderColor: color + '40', backgroundColor: color + '14' }]}
                    activeOpacity={0.8}
                  >
                    <Star size={30} color={color} fill={color} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Next Session ─────────────────────────────── */}
        {rated && nextSession && nextSession.id !== sessionId && (
          <View style={styles.nextSection}>
            <Text style={styles.sectionTitle}>Continue your journey</Text>

            <TouchableOpacity
              onPress={() => {
                // replace, not push: ending the next session must not land
                // back on this stale "Well Done" screen.
                router.replace(getSessionRoute(nextSession.id) as never);
              }}
              activeOpacity={0.85}
            >
              <GlassCard simple noPadding style={[styles.nextCard, { borderColor: nextSession.color + '40' }]}>
                <LinearGradient
                  colors={[nextSession.color + '14', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.nextRow}>
                  <View style={[styles.nextIcon, { borderColor: nextSession.color + '40' }]}>
                    <LinearGradient
                      colors={[nextSession.color + '30', nextSession.color + '12']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {nextSession.icon ? (
                      (() => {
                        const NextIcon = nextSession.icon!;
                        return <NextIcon size={24} color={nextSession.color} strokeWidth={1.9} />;
                      })()
                    ) : (
                      <Text style={styles.nextEmoji}>{nextSession.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.nextInfo}>
                    <Text style={[styles.nextTitle, { color: nextSession.color }]}>
                      {nextSession.title}
                    </Text>
                    <Text style={styles.nextDesc} numberOfLines={2}>
                      {nextSession.useCase}
                    </Text>
                  </View>
                  <View style={[styles.nextArrow, { backgroundColor: nextSession.color + '18', borderColor: nextSession.color + '30' }]}>
                    <ArrowRight size={17} color={nextSession.color} strokeWidth={2.3} />
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Actions ──────────────────────────────────── */}
        <View style={styles.actionSection}>
          <GradientCTA
            label="BACK TO HOME"
            icon={<Home size={18} color="#fff" />}
            onPress={handleHome}
            colors={[RELAX_ACCENT, RELAX_ACCENT + 'cc']}
            glowColor={RELAX_ACCENT + '88'}
            letterSpacing={1.5}
          />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    position: 'relative',
  },

  celebrationGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: 0,
    zIndex: -1,
    opacity: 0.4,
  },

  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },

  celebrationText: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -1,
    marginTop: 18,
  },

  sessionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },

  sessionDuration: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.xl,
  },

  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },

  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },

  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },

  // Emotion feedback
  feedbackSection: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },

  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: EMOTION_GAP,
    // Full rows fill edge-to-edge; the 2-card last row sits centered.
    justifyContent: 'center',
  },

  emotionCard: {
    width: '30%', // pre-measure fallback; replaced by the computed pixel width
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    // Content-sized with even padding — the old square aspectRatio left the
    // label pressed against the bottom edge with dead space above the emoji.
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 10,
  },

  emotionEmoji: {
    fontSize: 30,
  },

  emotionName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  // Rating
  ratingSection: {
    marginBottom: spacing.xl,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: spacing.xs,
  },

  starButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Next session
  nextSection: {
    marginBottom: spacing.xl,
  },

  nextCard: {
    borderWidth: 1,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 76,
  },
  nextIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  nextEmoji: {
    fontSize: 26,
  },
  nextInfo: {
    flex: 1,
    gap: 2,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  nextDesc: {
    fontSize: 12.5,
    color: 'rgba(245,247,251,0.5)',
    lineHeight: 17,
    marginTop: 1,
  },
  nextArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  // Actions
  actionSection: {
    gap: 12,
  },
});
