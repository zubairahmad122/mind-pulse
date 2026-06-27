import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    CheckCircle,
    ChevronRight,
    Clock,
    Cloud,
    Compass,
    Flame,
    Hand,
    Leaf,
    Moon,
    Play,
    Sparkles,
    ZapOff,
    type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';

import { colors } from '@/constants/colors';
import {
    EMOTIONAL_STATES,
    getEmotionOption,
    type EmotionalState,
} from '@/constants/emotionalStates';
import {
    getRecommendedSession,
    getSessionsByCategory,
    type SessionCategory,
} from '@/constants/relaxSessions';
import { spacing } from '@/constants/spacing';
import { useRelaxContext } from '@/context/RelaxContext';
import { recordLastFeature } from '@/components/home/ContinueJourney';

/** Calm violet accent — the Relax pillar's signature colour. */
const RELAX_ACCENT = '#a78bfa';

const CATEGORIES: { id: SessionCategory; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'breathe', label: 'Breathe', icon: Flame, color: '#FF9800' },
  { id: 'release', label: 'Release', icon: Hand, color: '#FF6B9D' },
  { id: 'ground', label: 'Ground', icon: Compass, color: '#4CAF50' },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: '#a78bfa' },
];

const EMOTION_ICONS: Record<EmotionalState, LucideIcon> = {
  'at-ease': Leaf,
  'tense': AlertCircle,
  'overwhelmed': Cloud,
  'drained': ZapOff,
  'sleepy': Moon,
};

/** Short single-word labels for the compact mood selector cells. */
const EMOTION_SHORT: Record<EmotionalState, string> = {
  'at-ease': 'At Ease',
  'tense': 'Tense',
  'overwhelmed': 'Overwhelmed',
  'drained': 'Drained',
  'sleepy': 'Sleepy',
};

export default function RelaxHome() {
  const router = useRouter();
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState | null>(null);

  useEffect(() => { void recordLastFeature('relax'); }, []);
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
  const categorySessions = useMemo(
    () => getSessionsByCategory(selectedCategory),
    [selectedCategory],
  );

  return (
    <ScreenShell ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <View style={styles.page}>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Relax</Text>

            </View>
            <View style={styles.headerRight}>

              {totalCompleted > 0 && (
                <View style={styles.streakPill}>
                  <Flame size={13} color="#FF9800" />
                  <Text style={styles.streakText}>{completedThisWeek} this wk</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Mood hero card ─────────────────────────────────────────── */}
          <GlassCard noPadding style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Sparkles size={13} color={RELAX_ACCENT} />
              <Text style={styles.heroEyebrow}>HOW ARE YOU FEELING?</Text>
            </View>

            <View style={styles.moodRow}>
              {EMOTIONAL_STATES.map(emotion => {
                const isSelected = selectedEmotion === emotion.state;
                const EmotionIcon = EMOTION_ICONS[emotion.state];
                return (
                  <Pressable
                    key={emotion.state}
                    onPress={() => handleSelectEmotion(emotion.state)}
                    style={[
                      styles.moodCell,
                      isSelected && {
                        backgroundColor: emotion.color + '1f',
                        borderColor: emotion.color,
                        shadowColor: emotion.color,
                        shadowOpacity: 0.35,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.moodIcon,
                        {
                          backgroundColor: isSelected
                            ? emotion.color + '30'
                            : 'rgba(255,255,255,0.06)',
                        },
                      ]}
                    >
                      <EmotionIcon
                        size={20}
                        color={isSelected ? emotion.color : colors.text.tertiary}
                        strokeWidth={1.9}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.moodLabel,
                        isSelected && { color: emotion.color, fontWeight: '800' },
                      ]}
                    >
                      {EMOTION_SHORT[emotion.state]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Recommended session — appears once a mood is picked */}
            {recommendedSession ? (
              <TouchableOpacity
                onPress={() => handleStartSession(recommendedSession.id)}
                activeOpacity={0.85}
                style={styles.recommendRow}
              >
                <LinearGradient
                  colors={[recommendedSession.color + '14', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.recommendIcon,
                    { borderColor: recommendedSession.color + '40' },
                  ]}
                >
                  <LinearGradient
                    colors={[recommendedSession.color + '30', recommendedSession.color + '12']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {recommendedSession.icon ? (
                    (() => {
                      const RecIcon = recommendedSession.icon!;
                      return <RecIcon size={26} color={recommendedSession.color} strokeWidth={1.9} />;
                    })()
                  ) : (
                    <Text style={styles.recommendEmoji}>{recommendedSession.emoji}</Text>
                  )}
                </View>
                <View style={styles.recommendInfo}>
                  <Text style={[styles.recommendTag, { color: recommendedSession.color }]}>
                    RECOMMENDED FOR YOU
                  </Text>
                  <Text style={styles.recommendTitle} numberOfLines={1}>
                    {recommendedSession.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Clock size={12} color={colors.text.tertiary} />
                    <Text style={styles.metaText}>
                      {Math.ceil(recommendedSession.durationSeconds / 60)} min
                    </Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaText}>
                      {getEmotionOption(selectedEmotion!).description}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.playBadge,
                    {
                      backgroundColor: recommendedSession.color,
                      shadowColor: recommendedSession.color,
                    },
                  ]}
                >
                  <Play size={16} color="#fff" fill="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.hintRow}>
                <Text style={styles.hintText}>
                  Pick a mood and we’ll suggest the right session for you.
                </Text>
              </View>
            )}
          </GlassCard>

          {/* ── Browse sessions ────────────────────────────────────────── */}
          <SectionLabel accent={RELAX_ACCENT}>BROWSE SESSIONS</SectionLabel>

          {/* Category segmented control — gradient active pill (Sleep style) */}
          <View style={styles.segmented}>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              const CatIcon = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id);
                  }}
                  activeOpacity={0.85}
                  style={styles.segmentItem}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[cat.color, cat.color + 'cc']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.segmentInner, styles.segmentActive, { shadowColor: cat.color }]}
                    >
                      <CatIcon size={15} color="#fff" strokeWidth={2.1} />
                      <Text style={styles.segmentLabelActive}>{cat.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentInner}>
                      <CatIcon size={15} color={colors.text.tertiary} strokeWidth={1.9} />
                      <Text style={styles.segmentLabel}>{cat.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sessions list */}
          <View style={styles.sessionList}>
            {categorySessions.map(session => (
              <TouchableOpacity
                key={session.id}
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
                      <Text style={styles.sessionDesc} numberOfLines={1}>
                        {session.description}
                      </Text>
                      <View style={styles.metaRow}>
                        <Clock size={11} color={colors.text.tertiary} />
                        <Text style={styles.metaText}>
                          {Math.ceil(session.durationSeconds / 60)} min
                        </Text>
                        <View style={styles.metaDot} />
                        <Text style={[styles.metaText, styles.capitalize]}>
                          {session.difficulty}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.sessionArrow, { backgroundColor: session.color + '18', borderColor: session.color + '30' }]}>
                      <ChevronRight size={17} color={session.color} strokeWidth={2.3} />
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Progress ───────────────────────────────────────────────── */}
          {totalCompleted > 0 && (
            <>
              <SectionLabel accent={RELAX_ACCENT}>YOUR PROGRESS</SectionLabel>
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <View style={[styles.statIcon, { borderColor: '#FF980038' }]}>
                    <LinearGradient
                      colors={['#FF980028', '#FF980010']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Flame size={18} color="#FF9800" />
                  </View>
                  <Text style={styles.statValue}>{completedThisWeek}</Text>
                  <Text style={styles.statLabel}>This week</Text>
                </View>
                <View style={styles.statCell}>
                  <View style={[styles.statIcon, { borderColor: '#4CAF5038' }]}>
                    <LinearGradient
                      colors={['#4CAF5028', '#4CAF5010']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <CheckCircle size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.statValue}>{totalCompleted}</Text>
                  <Text style={styles.statLabel}>Total sessions</Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: spacing.lg }} />
        </View>
      </ScreenTransition>
    </ScreenShell>
  );
}

const HAIRLINE = 'rgba(255,255,255,0.07)';

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
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
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

  // ── Hero / mood card ──
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(245,247,251,0.55)',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  moodCell: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 10,
  },
  moodIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  hintRow: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(245,247,251,0.5)',
    fontWeight: '500',
  },

  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  recommendIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  recommendEmoji: {
    fontSize: 28,
  },
  recommendInfo: {
    flex: 1,
    gap: 3,
  },
  recommendTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  recommendTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f6f8fc',
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
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
  metaDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: colors.text.tertiary,
  },
  capitalize: {
    textTransform: 'capitalize',
  },

  // ── Segmented category control ──
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: 18,
    backgroundColor: 'rgba(12,8,28,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.md,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
  },
  segmentActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  segmentLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
  },
  segmentLabelActive: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Session list ──
  sessionList: {
    gap: 10,
    marginBottom: spacing.xs,
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
    minHeight: 76,
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
  sessionArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  // ── Progress stats ──
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: 'rgba(255,255,255,0.035)',
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
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
});
