import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Check, ChevronRight, Star } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { HeroCard } from '@/components/ui/HeroCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StaggerItem } from '@/components/ui/StaggerItem';

import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS, SPACING, SURFACE_TINT, TYPOGRAPHY } from '@/constants/designSystem';
import { EMOTION_ICONS, EMOTIONAL_STATES, type EmotionalState } from '@/constants/emotionalStates';
import {
  CATEGORY_COLOR,
  formatSessionDuration,
  getRecommendedSession,
  getSessionById,
  getSessionRoute,
} from '@/constants/relaxSessions';
import { ROUTES } from '@/constants/routes';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/context/AuthContext';
import { useRelaxContext } from '@/context/RelaxContext';
import { useAudioGuide } from '@/hooks/useAudioGuide';
import { useSessionCompleteMonetization } from '@/services/ads/useSessionCompleteMonetization';
import { recordResetCompleted } from '@/services/screenBalancePersistence';

/** The Relax pillar's single accent — same as the Relax tab and player. */
const RELAX_ACCENT = PILLAR_COLORS.relax;
const STAR_COLOR = '#FFC83D';
const CATEGORY_LABEL = { breathe: 'Breathe', release: 'Release', ground: 'Ground', sleep: 'Wind Down' } as const;

/** Success badge — a soft ring that springs in, then the check fades up. */
function SuccessBadge() {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    check.value = withDelay(220, withTiming(1, { duration: 280 }));
  }, [scale, opacity, check]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: 0.7 + check.value * 0.3 }] }));

  return (
    <Animated.View style={[styles.badgeRing, ringStyle]}>
      <View style={styles.badgeCore}>
        <Animated.View style={checkStyle}>
          <Check size={30} color={RELAX_ACCENT} strokeWidth={2.6} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function RelaxCompletion() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);
  const [rating, setRating] = useState(0);

  // The closing narration from the session is still playing when we arrive —
  // let it finish here, and stop it only when the user leaves this screen.
  const { stop: stopVoice } = useAudioGuide();
  useEffect(() => () => stopVoice(), [stopVoice]);

  const { maybeShow } = useSessionCompleteMonetization();
  useEffect(() => {
    void maybeShow();
  }, [maybeShow]);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const session = getSessionById(sessionId || '');
  const { completedSessions, completeSession, updateLastCompletion } = useRelaxContext();
  const { user } = useAuth();
  const [weekStart] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Record the completion as soon as this screen opens, so the stats are
  // correct immediately. Mood + rating get attached to this record afterwards.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    completeSession(null);
    if (sessionId === 'box-breathing') {
      void recordResetCompleted(user?.uid ?? undefined, 'breathe');
    }
  }, [completeSession, sessionId, user?.uid]);

  if (!session) {
    return (
      <ScreenShell ambient={<AmbientBackground subtle />}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Session not found</Text>
        </View>
      </ScreenShell>
    );
  }

  const handleSelectEmotion = (emotion: EmotionalState) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion);
    // Save the mood on its own too — previously it was only kept if a rating followed.
    updateLastCompletion(emotion, rating);
  };

  const handleRate = (value: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRating(value);
    updateLastCompletion(selectedEmotion, value);
  };

  // Always land on the main Relax tab — not wherever the session happened to
  // be launched from (Home, Daily Challenge, Digital Sunset). dismissTo pops
  // back to the existing tabs screen and selects Relax, or replaces with it
  // when there's nothing to pop to (deep link).
  const handleBackToRelax = () => {
    router.dismissTo(ROUTES.appRelax as never);
  };

  const thisWeek = completedSessions.filter(s => s.completedAt > weekStart);
  const weekMinutes = Math.round(
    thisWeek.reduce((sum, r) => sum + (getSessionById(r.sessionId)?.durationSeconds ?? 0), 0) / 60,
  );
  const nextSession = selectedEmotion ? getRecommendedSession(selectedEmotion) : null;
  const showNext = !!nextSession && nextSession.id !== sessionId;
  const categoryColor = CATEGORY_COLOR[session.category];
  const SessionIcon = session.icon;

  return (
    <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
      <View style={styles.page}>
        {/* ── Header — success badge + what was completed ── */}
        <StaggerItem index={0}>
          <View style={styles.header}>
            <SuccessBadge />
            <Text style={styles.eyebrow}>SESSION COMPLETE</Text>
            <Text style={styles.title}>Well done</Text>
            <Text style={styles.subtitle}>You took a few minutes just for yourself.</Text>
          </View>
        </StaggerItem>

        {/* ── Hero — the session + this week's real totals ── */}
        <StaggerItem index={1}>
          <HeroCard>
            <View style={styles.heroInner}>
              <View style={styles.heroTitleRow}>
                <View style={[styles.heroIcon, { borderColor: categoryColor + '40', backgroundColor: categoryColor + '18' }]}>
                  {SessionIcon ? (
                    <SessionIcon size={17} color={categoryColor} strokeWidth={2} />
                  ) : (
                    <Text style={styles.heroEmoji}>{session.emoji}</Text>
                  )}
                </View>
                <View style={styles.heroTitleText}>
                  <Text style={styles.heroTitle} numberOfLines={1}>{session.title}</Text>
                  <Text style={styles.heroMeta}>
                    {formatSessionDuration(session.durationSeconds)} · {CATEGORY_LABEL[session.category]}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <Stat value={String(thisWeek.length)} label="This week" />
                <View style={styles.statDivider} />
                <Stat value={`${weekMinutes} min`} label="Calm time" />
                <View style={styles.statDivider} />
                <Stat value={String(completedSessions.length)} label="All time" />
              </View>
            </View>
          </HeroCard>
        </StaggerItem>

        {/* ── Mood after — same picker as the Relax tab ── */}
        <StaggerItem index={2}>
          <SectionLabel accent={RELAX_ACCENT}>HOW DO YOU FEEL NOW?</SectionLabel>
          <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.card}>
            <View style={styles.moodRow}>
              {EMOTIONAL_STATES.map(emotion => {
                const Icon = EMOTION_ICONS[emotion.state];
                const selected = selectedEmotion === emotion.state;
                return (
                  <Pressable
                    key={emotion.state}
                    onPress={() => handleSelectEmotion(emotion.state)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={emotion.label}
                    style={styles.moodCell}
                  >
                    <View
                      style={[
                        styles.moodIcon,
                        selected && { backgroundColor: emotion.color + '1f', borderColor: emotion.color },
                      ]}
                    >
                      <Icon size={20} color={selected ? emotion.color : colors.text.tertiary} strokeWidth={1.9} />
                    </View>
                    <Text
                      style={[styles.moodLabel, selected && { color: emotion.color }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {emotion.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        </StaggerItem>

        {/* ── Rating — optional, editable ── */}
        <StaggerItem index={3}>
          <SectionLabel accent={RELAX_ACCENT}>RATE THIS SESSION</SectionLabel>
          <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.card}>
            <View style={styles.ratingInner}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(value => {
                  const filled = value <= rating;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => handleRate(value)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                      style={styles.starButton}
                    >
                      <Star
                        size={30}
                        color={filled ? STAR_COLOR : 'rgba(255,255,255,0.28)'}
                        fill={filled ? STAR_COLOR : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.ratingHint}>
                {rating > 0 ? 'Thanks — this helps us suggest better sessions.' : 'Tap a star to rate'}
              </Text>
            </View>
          </GlassCard>
        </StaggerItem>

        {/* ── Up next — appears once a mood is picked ── */}
        {showNext && nextSession && (
          <StaggerItem index={0}>
            <SectionLabel accent={RELAX_ACCENT}>UP NEXT</SectionLabel>
            <TouchableOpacity
              activeOpacity={0.85}
              // replace, not push: ending the next session must not land back
              // on this stale completion screen.
              onPress={() => router.replace(getSessionRoute(nextSession.id) as never)}
            >
              <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.card}>
                <View style={styles.nextRow}>
                  <View
                    style={[
                      styles.nextIcon,
                      {
                        borderColor: CATEGORY_COLOR[nextSession.category] + '40',
                        backgroundColor: CATEGORY_COLOR[nextSession.category] + '18',
                      },
                    ]}
                  >
                    {nextSession.icon ? (
                      (() => {
                        const NextIcon = nextSession.icon!;
                        return <NextIcon size={20} color={CATEGORY_COLOR[nextSession.category]} strokeWidth={2} />;
                      })()
                    ) : (
                      <Text style={styles.heroEmoji}>{nextSession.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.nextInfo}>
                    <Text style={styles.nextTitle} numberOfLines={1}>{nextSession.title}</Text>
                    <Text style={styles.nextMeta} numberOfLines={1}>
                      {formatSessionDuration(nextSession.durationSeconds)} · {CATEGORY_LABEL[nextSession.category]}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={RELAX_ACCENT} strokeWidth={2.4} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </StaggerItem>
        )}

        <View style={styles.actions}>
          <GradientCTA
            label="Back to Relax"
            icon={<ArrowRight size={17} color="#03212C" strokeWidth={2.5} />}
            textColor="#03212C"
            onPress={handleBackToRelax}
          />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: SPACING.screenTop,
    paddingBottom: spacing.md,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    color: colors.text.primary,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.section - 8,
  },
  badgeRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RELAX_ACCENT + '14',
    borderWidth: 1,
    borderColor: RELAX_ACCENT + '33',
  },
  badgeCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RELAX_ACCENT + '1f',
    borderWidth: 1.5,
    borderColor: RELAX_ACCENT + '66',
  },
  eyebrow: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.lg,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: colors.text.primary,
    marginTop: 6,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: TYPOGRAPHY.subtitle.color,
    marginTop: 4,
    textAlign: 'center',
  },

  // Hero
  heroInner: {
    padding: 18,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroEmoji: {
    fontSize: 17,
  },
  heroTitleText: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 19,
    color: colors.text.primary,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.55)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.55)',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Shared card
  card: {
    borderRadius: RADIUS.card,
  },

  // Mood
  moodRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  moodCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  moodIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  moodLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.55)',
  },

  // Rating
  ratingInner: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  starButton: {
    padding: 2,
  },
  ratingHint: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // Up next
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 70,
  },
  nextIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nextInfo: {
    flex: 1,
    gap: 2,
  },
  nextTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.text.primary,
  },
  nextMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(245,247,251,0.55)',
  },

  actions: {
    marginTop: SPACING.section,
  },
});
