import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Cloud,
    Compass,
    Flame,
    Hand,
    Leaf,
    Moon,
    Play,
    X,
    ZapOff,
    type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { HeroCard } from '@/components/ui/HeroCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuickActionTile } from '@/components/ui/QuickActionTile';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StaggerItem } from '@/components/ui/StaggerItem';
import { StreakCelebrationBanner } from '@/components/ui/StreakCelebrationBanner';

import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { DURATION, FONTS, PILLAR_COLORS, RADIUS, SHADOWS, SPACING, SURFACE_TINT, TYPOGRAPHY } from '@/constants/designSystem';
import { WeeklyProgressRow } from '@/components/ui/WeeklyProgressRow';
import {
    EMOTIONAL_STATES,
    getEmotionOption,
    type EmotionalState,
} from '@/constants/emotionalStates';
import {
    CATEGORY_COLOR,
    CATEGORY_COLOR_LIGHT,
    formatSessionDuration,
    getDefaultRecommendedSession,
    getRecommendedSession,
    getSessionById,
    getSessionRoute,
    getSessionsByCategory,
    type RelaxSession,
    type SessionCategory,
} from '@/constants/relaxSessions';
import { spacing } from '@/constants/spacing';
import { useRelaxContext } from '@/context/RelaxContext';
import { recordLastFeature } from '@/components/home/ContinueJourney';
import { Shimmer } from '@/components/sleep/Skeletons';

/** The Relax pillar's single frozen accent (spec section 16: Relax = Blue). */
const RELAX_ACCENT = PILLAR_COLORS.relax;

/** Fixed accent used only on the Journey Card (icon border, track, button) so
 * the hero reads as one consistent brand block regardless of which category
 * happens to be recommended — category color stays reserved for Quick
 * Actions / Today's Goal / Session cards below it. */
const HERO_ACCENT = PILLAR_COLORS.relax;

/** A fixed weekly practice-minutes goal — shown as "X/60 min" so Weekly
 * Relax reads as progress toward a target instead of a bare raw number. */
const WEEKLY_MINUTES_GOAL = 60;

const CATEGORIES: { id: SessionCategory; label: string; icon: LucideIcon }[] = [
  { id: 'breathe', label: 'Breathe', icon: Flame },
  { id: 'release', label: 'Release', icon: Hand },
  { id: 'ground', label: 'Ground', icon: Compass },
  { id: 'sleep', label: 'Wind Down', icon: Moon },
];

/** One short (3-4 word) hint per category on the Today's Goal checklist —
 * real design copy, not a data point, so it stays terse instead of the
 * full-sentence "why" copy that read as too much text. */
const GOAL_ROW_HINT: Record<SessionCategory, string> = {
  breathe: 'Steady your breath',
  release: 'Let tension go',
  ground: 'Return to now',
  sleep: 'Ease into sleep',
};

const EMOTION_ICONS: Record<EmotionalState, LucideIcon> = {
  'at-ease': Leaf,
  'tense': AlertCircle,
  'overwhelmed': Cloud,
  'drained': ZapOff,
  'sleepy': Moon,
};

/** A single mood cell — bounces (0.95 → 1.05 → 1) on selection instead of
 * just snapping to its selected color. */
function MoodCell({
  emotion,
  isSelected,
  Icon,
  onPress,
}: {
  emotion: { state: EmotionalState; color: string; label: string };
  isSelected: boolean;
  Icon: LucideIcon;
  onPress: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} accessibilityLabel={emotion.label} style={styles.moodCell}>
      <Animated.View
        style={[
          styles.moodCellIcon,
          { transform: [{ scale }] },
          isSelected && {
            backgroundColor: emotion.color + '1f',
            borderColor: emotion.color,
          },
        ]}
      >
        <Icon
          size={19}
          color={isSelected ? emotion.color : colors.text.tertiary}
          strokeWidth={1.9}
        />
      </Animated.View>
      <Text
        style={[styles.moodCellLabel, isSelected && { color: emotion.color }]}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {emotion.label}
      </Text>
    </Pressable>
  );
}

/** Loading state while RelaxContext's history fetch settles — mirrors the
 * real layout (hero card + mood strip + a few session rows) rather than a
 * blank screen or a generic spinner. */
function RelaxSkeleton() {
  return (
    <ScreenShell pillar="relax" ambient={<AmbientBackground subtle />}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Shimmer w={90} h={30} r={8} />
        </View>
        <GlassCard noPadding style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Shimmer w={100} h={9} r={4} />
              <Shimmer w={26} h={26} r={13} />
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              <Shimmer w={160} h={19} r={4} />
              <Shimmer w={100} h={11} r={4} />
              <Shimmer w={200} h={13} r={4} />
            </View>
            <Shimmer w="100%" h={10} r={5} style={{ marginTop: 12 }} />
            <Shimmer w="100%" h={56} r={18} style={{ marginTop: 12 }} />
          </View>
        </GlassCard>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ width: 72, alignItems: 'center', gap: 6, paddingVertical: 12 }}>
              <Shimmer w={56} h={56} r={28} />
              <Shimmer w={44} h={9} r={4} />
            </View>
          ))}
        </View>
        <View style={styles.sessionList}>
          {[0, 1, 2].map(i => (
            <Shimmer key={i} h={76} r={RADIUS.card} />
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}

export default function RelaxHome() {
  const router = useRouter();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);

  useEffect(() => { void recordLastFeature('relax'); }, []);
  const [selectedCategory, setSelectedCategory] = useState<SessionCategory>('breathe');
  const [completedThisWeek, setCompletedThisWeek] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);

  const { completedSessions, setLastEmotion, currentSessionId, sessionsLoaded } = useRelaxContext();
  const [previewSession, setPreviewSession] = useState<RelaxSession | null>(null);

  useEffect(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekRecords = completedSessions.filter((s: any) => s.completedAt > oneWeekAgo);
    setCompletedThisWeek(thisWeekRecords.length);
    setTotalCompleted(completedSessions.length);
    // Real minutes, derived from each completed session's actual duration —
    // not an estimate.
    const seconds = thisWeekRecords.reduce((sum: number, r: any) => {
      const session = getSessionById(r.sessionId);
      return sum + (session?.durationSeconds ?? 0);
    }, 0);
    setWeeklyMinutes(Math.round(seconds / 60));
  }, [completedSessions]);

  const handleSelectEmotion = (emotion: EmotionalState) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion);
    setLastEmotion(emotion);
  };

  const handleStartSession = (sessionId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Narration sessions route to their dedicated guided screens.
    router.push(getSessionRoute(sessionId) as never);
  };

  const handleOpenPreview = (session: RelaxSession) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewSession(session);
  };

  // "Completed today" (not "ever completed") — matches the app's daily-reset
  // convention elsewhere (Daily Challenge, streaks) rather than a permanent
  // one-time badge.
  const todayKey = new Date().toDateString();
  const isCompletedToday = (sessionId: string) =>
    completedSessions.some((r: any) => r.sessionId === sessionId && new Date(r.completedAt).toDateString() === todayKey);

  // "Today's Goal" — a real per-category completion checklist. No point
  // values: unlike Eye's score, there's no real per-category scoring formula
  // for Relax to attach a "+N" reward to, so this stays an honest checklist
  // rather than inventing numbers.
  const categoriesDoneToday = new Set(
    completedSessions
      .filter((r: any) => new Date(r.completedAt).toDateString() === todayKey)
      .map((r: any) => getSessionById(r.sessionId)?.category)
      .filter(Boolean),
  );

  // A session is always shown up front — no waiting on the user to pick a
  // mood first. Highest priority: an abandoned in-progress session (real —
  // driven by RelaxContext's currentSessionId, not a placeholder). Otherwise
  // a mood-based pick once they've told us how they feel, falling back to a
  // time-of-day default so there's always something concrete to lead with.
  const inProgressSession = currentSessionId ? getSessionById(currentSessionId) : null;
  const heroSession = useMemo(
    () => (selectedEmotion ? getRecommendedSession(selectedEmotion) : getDefaultRecommendedSession()),
    [selectedEmotion],
  );
  const recommendedSession = inProgressSession ?? heroSession;
  const heroCompletedToday = !inProgressSession && !!recommendedSession && isCompletedToday(recommendedSession.id);
  // Real progress: same semantics as Home's hero — fraction of today's real
  // categories completed so far, not a per-session elapsed fraction (which
  // stayed at 0% until a session was already in progress).
  const heroPercent = Math.round((categoriesDoneToday.size / CATEGORIES.length) * 100);
  const categorySessions = useMemo(
    () => getSessionsByCategory(selectedCategory),
    [selectedCategory],
  );


  // Fade + slide the session list on category switch instead of an instant swap.
  const [categoryAnim] = useState(() => new Animated.Value(1));
  const isFirstCategoryRender = useRef(true);
  useEffect(() => {
    if (isFirstCategoryRender.current) {
      isFirstCategoryRender.current = false;
      return;
    }
    categoryAnim.setValue(0);
    Animated.timing(categoryAnim, { toValue: 1, duration: DURATION.normal, useNativeDriver: true }).start();
  }, [selectedCategory, categoryAnim]);

  if (!sessionsLoaded) {
    return <RelaxSkeleton />;
  }

  return (
    <ScreenShell pillar="relax" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <View style={styles.page}>
          <StreakCelebrationBanner />

          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Relax</Text>
              <Text style={styles.subtitle}>Calm your mind with guided sessions</Text>
            </View>
            <View style={styles.headerRight}>
              {totalCompleted > 0 && (
                <View style={styles.streakPill}>
                  <Flame size={13} color="#FF9800" />
                  <Text style={styles.streakText}>{weeklyMinutes} min this wk</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Hero card — same shape as Home/Eye: eyebrow row, headline,
              message, progress bar, full-width CTA — plus the mood strip
              merged into the same card instead of a separate one ───────── */}
          <StaggerItem index={0}>
          <HeroCard style={styles.heroCard}>
            <View style={styles.heroInner}>
              {recommendedSession && (
                <>
                  <View style={styles.heroHeaderRow}>
                    <Text style={styles.heroLabel}>TODAY&apos;S RELAX JOURNEY</Text>
                    <Text style={[styles.heroDifficulty, { color: HERO_ACCENT }]}>
                      {recommendedSession.difficulty}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleOpenPreview(recommendedSession)}
                    activeOpacity={0.85}
                    style={styles.heroTitleRow}
                  >
                    <View
                      style={[
                        styles.heroIcon,
                        { borderColor: HERO_ACCENT + '40', backgroundColor: HERO_ACCENT + '18' },
                      ]}
                    >
                      {recommendedSession.icon ? (
                        (() => {
                          const RecIcon = recommendedSession.icon!;
                          return <RecIcon size={17} color={HERO_ACCENT} strokeWidth={2} />;
                        })()
                      ) : (
                        <Text style={styles.heroIconEmoji}>{recommendedSession.emoji}</Text>
                      )}
                    </View>
                    <Text style={styles.heroTitleText} numberOfLines={1}>
                      {recommendedSession.title}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.heroMeta}>
                    {formatSessionDuration(recommendedSession.durationSeconds)}
                  </Text>

                  <Text style={styles.heroMessage} numberOfLines={2}>
                    {inProgressSession
                      ? 'Tap to pick back up where you left off.'
                      : heroCompletedToday
                        ? 'Completed today — tap to do it again.'
                        : selectedEmotion
                          ? getEmotionOption(selectedEmotion).description
                          : recommendedSession.description}
                  </Text>

                  <ProgressBar progress={Math.max(heroPercent / 100, 0.04)} fill={HERO_ACCENT} style={styles.trackGlow} />

                  <View style={{ marginTop: SPACING.titleGap + 10 }}>
                    <GradientCTA
                      label={inProgressSession ? 'Continue Session' : heroCompletedToday ? 'Do It Again' : 'Start Session'}
                      textColor="#03212C"
                      onPress={() => handleStartSession(recommendedSession.id)}
                    />
                  </View>
                </>
              )}

              {/* Feeling — merged into the hero instead of its own card */}
              <Text style={[styles.moodQuestion, { marginTop: spacing.lg }]}>How do you feel?</Text>
              <View style={styles.moodCompactRow}>
                {EMOTIONAL_STATES.map(emotion => (
                  <MoodCell
                    key={emotion.state}
                    emotion={emotion}
                    isSelected={selectedEmotion === emotion.state}
                    Icon={EMOTION_ICONS[emotion.state]}
                    onPress={() => handleSelectEmotion(emotion.state)}
                  />
                ))}
              </View>
            </View>
          </HeroCard>
          </StaggerItem>

          {/* ── Today's Goal — real per-category completion checklist ──── */}
          <StaggerItem index={1}>
          <GlassCard noPadding style={styles.goalCard} tint={SURFACE_TINT.card}>
            <View style={styles.goalInner}>
              <Text style={styles.goalLabel}>TODAY&apos;S GOAL</Text>
              {CATEGORIES.map(cat => {
                const done = categoriesDoneToday.has(cat.id);
                const catColor = CATEGORY_COLOR[cat.id];
                return (
                  <View key={cat.id} style={styles.goalRow}>
                    {done ? (
                      <View style={[styles.goalCircleDone, { backgroundColor: catColor + '22', borderColor: catColor }]}>
                        <CheckCircle2 size={13} color={catColor} strokeWidth={2.4} />
                      </View>
                    ) : (
                      <View style={styles.goalCircleEmpty} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalRowText, done && styles.goalRowTextDone]}>
                        {cat.label}
                      </Text>
                      <Text style={styles.goalRowSub}>{GOAL_ROW_HINT[cat.id]}</Text>
                    </View>
                  </View>
                );
              })}
              <View style={styles.goalProgressRow}>
                <Text style={styles.goalProgressText}>
                  Progress {categoriesDoneToday.size}/{CATEGORIES.length}
                </Text>
              </View>
            </View>
          </GlassCard>
          </StaggerItem>

          {/* ── Quick Actions — same card language as Home's pillar row,
              evenly spread across the full width like Eye's row ─────────── */}
          <StaggerItem index={2}>
          <SectionLabel accent={RELAX_ACCENT}>QUICK ACTIONS</SectionLabel>
          <View style={styles.quickActionsRow}>
            {CATEGORIES.map(cat => (
              <QuickActionTile
                key={cat.id}
                label={cat.label}
                icon={cat.icon}
                accent={CATEGORY_COLOR[cat.id]}
                selected={selectedCategory === cat.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.id);
                }}
              />
            ))}
          </View>
          </StaggerItem>

          {/* ── Browse sessions ────────────────────────────────────────── */}
          <SectionLabel accent={RELAX_ACCENT}>RELAX SESSIONS</SectionLabel>

          {/* Sessions list — fades/slides in on category switch instead of an instant swap */}
          <Animated.View
            style={[
              styles.sessionList,
              {
                opacity: categoryAnim,
                transform: [{ translateX: categoryAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            {categorySessions.map(session => {
              const inProgress = session.id === currentSessionId;
              const doneToday = !inProgress && isCompletedToday(session.id);
              const lightColor = CATEGORY_COLOR_LIGHT[session.category];
              return (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => handleStartSession(session.id)}
                  activeOpacity={0.85}
                >
                  <GlassCard
                    simple
                    noPadding
                    style={[styles.sessionCard, { borderColor: session.color + '28' }]}
                    tint={SURFACE_TINT.card}
                  >
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
                        <View style={styles.metaRow}>
                          <Clock size={11} color={colors.text.tertiary} />
                          <Text style={styles.metaText}>
                            {formatSessionDuration(session.durationSeconds)}
                          </Text>
                          <View style={styles.metaDot} />
                          <Text style={[styles.metaText, styles.capitalize]}>
                            {session.difficulty}
                          </Text>
                          <View style={styles.metaDot} />
                          <Text style={[styles.metaText, styles.capitalize]} numberOfLines={1}>
                            {session.category === 'sleep' ? 'Wind Down' : session.category}
                          </Text>
                        </View>
                      </View>
                      {inProgress ? (
                        <View style={[styles.statePill, { backgroundColor: session.color + '22', borderColor: session.color + '55' }]}>
                          <Text style={[styles.statePillText, { color: lightColor }]}>Continue</Text>
                        </View>
                      ) : doneToday ? (
                        <View style={[styles.statePill, { backgroundColor: 'rgba(76,175,80,0.14)', borderColor: 'rgba(76,175,80,0.35)' }]}>
                          <Text style={[styles.statePillText, { color: '#6FE3A0' }]}>Completed</Text>
                        </View>
                      ) : (
                        <View style={[styles.statePill, { backgroundColor: session.color + '22', borderColor: session.color + '55' }]}>
                          <Text style={[styles.statePillText, { color: lightColor }]}>Start →</Text>
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* ── Weekly Relax — same shared row Home and Eye use ──────────── */}
          <StaggerItem index={3}>
          <SectionLabel accent={RELAX_ACCENT}>WEEKLY RELAX</SectionLabel>
          {totalCompleted > 0 ? (
            <WeeklyProgressRow
              icon={<Leaf size={13} color={RELAX_ACCENT} strokeWidth={2} />}
              label="Weekly Relax"
              value={`${weeklyMinutes}/${WEEKLY_MINUTES_GOAL} min`}
              percent={Math.min(100, (weeklyMinutes / WEEKLY_MINUTES_GOAL) * 100)}
              accentColor={RELAX_ACCENT}
              caption={`${completedThisWeek} Session${completedThisWeek === 1 ? '' : 's'}`}
              onPress={() => router.push(ROUTES.appReport as never)}
            />
          ) : (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateText}>
                Start your first relaxation session today.
              </Text>
            </View>
          )}
          </StaggerItem>

          {/* Bottom runway so the last card scrolls clear of the floating tab bar */}
          <View style={{ height: 100 }} />
        </View>
      </ScreenTransition>

      {/* ── Session preview — tapping the hero recommendation opens this
          instead of jumping straight into the player ─────────────────── */}
      <Modal
        visible={!!previewSession}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewSession(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewSession(null)}>
          {previewSession && (
            <Pressable onPress={(e) => e.stopPropagation()}>
              <GlassCard style={styles.modalSheet} tint={SURFACE_TINT.card}>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setPreviewSession(null)}
                  hitSlop={10}
                >
                  <X size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>

                <View
                  style={[
                    styles.modalIcon,
                    { backgroundColor: previewSession.color + '20', borderColor: previewSession.color + '40' },
                  ]}
                >
                  {previewSession.icon ? (
                    (() => {
                      const PrevIcon = previewSession.icon!;
                      return <PrevIcon size={28} color={previewSession.color} strokeWidth={1.9} />;
                    })()
                  ) : (
                    <Text style={styles.modalIconEmoji}>{previewSession.emoji}</Text>
                  )}
                </View>

                <Text style={styles.modalTitle}>{previewSession.title}</Text>
                <View style={styles.metaRow}>
                  <Clock size={12} color={colors.text.tertiary} />
                  <Text style={styles.metaText}>{formatSessionDuration(previewSession.durationSeconds)}</Text>
                  <View style={styles.metaDot} />
                  <Text style={[styles.metaText, styles.capitalize]}>{previewSession.difficulty}</Text>
                </View>

                <Text style={styles.modalDescription}>{previewSession.description}</Text>

                <Text style={styles.modalBenefitsLabel}>BENEFITS</Text>
                <View style={styles.modalTagsRow}>
                  {previewSession.tags.map(tag => (
                    <View key={tag} style={[styles.modalTag, { borderColor: previewSession.color + '40' }]}>
                      <Text style={[styles.modalTagText, { color: previewSession.color }]}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    const id = previewSession.id;
                    setPreviewSession(null);
                    handleStartSession(id);
                  }}
                  style={[styles.modalStartButton, { backgroundColor: previewSession.color }]}
                >
                  <Play size={16} color="#fff" fill="#fff" />
                  <Text style={styles.modalStartText}>Start Session</Text>
                </TouchableOpacity>
              </GlassCard>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.screenTitle.fontSize,
    fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
    color: TYPOGRAPHY.screenTitle.color,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: TYPOGRAPHY.subtitle.color,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Hero card — same shape as Home/Eye's hero ──
  heroCard: {
    marginBottom: 28,
  },
  heroInner: {
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: 'rgba(255,255,255,0.5)',
  },
  heroDifficulty: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  heroIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  heroIconEmoji: {
    fontSize: 15,
  },
  heroTitleText: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 19,
    color: colors.text.primary,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'capitalize',
    marginTop: 6,
  },
  heroMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  // ── Today's Goal (mirrors Eye's) ──
  goalCard: {
    marginBottom: 28,
    borderRadius: RADIUS.card,
    ...SHADOWS.medium,
  },
  goalInner: {
    padding: 18,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.42)',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  goalCircleEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  goalCircleDone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  goalRowTextDone: {
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  goalRowSub: {
    fontSize: 11.5,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  goalProgressRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  goalProgressText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: RELAX_ACCENT,
  },

  // Quick Actions — same card language as Home's FeatureGrid pillar row,
  // spread evenly across the full width (Eye's fixed-row treatment, not
  // Home's horizontal scroll — there are only ever 4 categories).
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  // Feeling — merged into the hero card instead of its own section, spread
  // across the full width like Quick Actions instead of a tight icon row.
  moodQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 10,
  },
  moodCompactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodCell: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  moodCellIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  moodCellLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
  },


  trackGlow: {
    marginTop: spacing.sm + 2,
  },

  // ── Shared meta row ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  metaTextFlex: {
    flexShrink: 1,
    minWidth: 0,
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

  // ── Session list ──
  sessionList: {
    gap: 14,
    marginBottom: spacing.sm,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: RADIUS.card,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    flexShrink: 0,
  },
  statePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ── This-week empty state ──
  emptyStateBox: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },

  // ── Session preview modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconEmoji: {
    fontSize: 28,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#f6f8fc',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(245,247,251,0.7)',
    textAlign: 'center',
    marginTop: 14,
  },
  modalBenefitsLabel: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(245,247,251,0.4)',
    marginTop: 18,
    marginBottom: 8,
  },
  modalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignSelf: 'stretch',
  },
  modalTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
  },
  modalTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  modalStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: RADIUS.button,
    marginTop: 20,
  },
  modalStartText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
