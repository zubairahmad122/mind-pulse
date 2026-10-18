import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Pause, Play, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FigureEightGuide } from '@/components/eye/animations/FigureEightGuide';
import { SweepFlowGuide } from '@/components/eye/animations/SweepFlowGuide';
import { TargetSwitchGuide } from '@/components/eye/animations/TargetSwitchGuide';
import { WaveFlowGuide } from '@/components/eye/animations/WaveFlowGuide';
import { EyeGuideButton, EyeGuideSheet, type EyeGuideContent } from '@/components/eye/EyeGuideSheet';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import {
  getVisualFlowActivity,
  totalVisualFlowSeconds,
  VISUAL_FLOW_ACTIVITIES,
  VISUAL_FLOW_DEFAULT_SEQUENCE,
  type VisualFlowId,
} from '@/constants/visualFlowActivities';
import { useAuth } from '@/context/AuthContext';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionKeepAwake } from '@/hooks/useSessionKeepAwake';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { recordVisualFlowSession } from '@/services/visualFlowPersistence';

const ACCENT = PILLAR_COLORS.eye;
const TRANSITION_MS = 1000;
const PREP_MS = 1200;

type Phase = 'prep' | 'active' | 'transition' | 'complete';

function ActivityVisual({ id, active }: { id: VisualFlowId; active: boolean }) {
  switch (id) {
    case 'infinity-flow': return <FigureEightGuide active={active} />;
    case 'target-switch': return <TargetSwitchGuide active={active} />;
    case 'wave-flow': return <WaveFlowGuide active={active} />;
    case 'sweep-flow': return <SweepFlowGuide active={active} />;
    default: return null;
  }
}

function parseQueue(ids?: string): VisualFlowId[] {
  if (!ids) return VISUAL_FLOW_DEFAULT_SEQUENCE;
  const parsed = ids.split(',').filter(id => !!getVisualFlowActivity(id)) as VisualFlowId[];
  return parsed.length > 0 ? parsed : VISUAL_FLOW_DEFAULT_SEQUENCE;
}

/**
 * The one Visual Flow player — owns the whole activity queue (default
 * 4-item guided flow, or a single item for a solo Explore launch) and
 * never navigates between activities. Reuses the canonical session
 * hooks (`useSessionClock`, `useSessionLifecycle`, `useSessionKeepAwake`)
 * exactly as CVS Protocol / EyeBreakScreen do.
 */
export default function VisualFlowSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const queue = useMemo(() => parseQueue(ids), [ids]);
  const isSolo = queue.length === 1;
  const totalSeconds = useMemo(() => totalVisualFlowSeconds(queue), [queue]);

  const [phase, setPhase] = useState<Phase>('prep');
  const [queueIndex, setQueueIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [lifecyclePaused, setLifecyclePaused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const { isBackgrounded } = useSessionLifecycle({
    onPause: () => setLifecyclePaused(true),
    onResume: () => setLifecyclePaused(true),
  });

  // Guide reuses the exact same pause path as a manual pause — closing it
  // only resumes if nothing else (manual pause / backgrounding) is holding
  // the session paused, with no separate Guide-specific pause state needed.
  const paused = userPaused || lifecyclePaused || guideOpen;
  const activity = VISUAL_FLOW_ACTIVITIES[queue[queueIndex]];

  useSessionKeepAwake(phase !== 'complete', 'mindpulse-visual-flow');

  useEffect(() => {
    if (phase !== 'prep' || isBackgrounded) return;
    const t = setTimeout(() => setPhase('active'), PREP_MS);
    return () => clearTimeout(t);
  }, [phase, isBackgrounded]);

  useEffect(() => {
    if (phase !== 'transition' || isBackgrounded) return;
    const t = setTimeout(() => {
      setQueueIndex(i => i + 1);
      setPhase('active');
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [phase, isBackgrounded]);

  const handleActivityComplete = useCallback(() => {
    if (isBackgrounded) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (queueIndex + 1 >= queue.length) {
      setPhase('complete');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void recordVisualFlowSession(user?.uid, {
        durationSeconds: totalSeconds,
        activityIds: queue,
        fullSession: !isSolo,
      });
    } else {
      setPhase('transition');
    }
  }, [isBackgrounded, queueIndex, queue, totalSeconds, isSolo, user?.uid]);

  const { secondsLeft } = useSessionClock({
    totalSeconds: activity.durationSeconds,
    running: phase === 'active' && !isBackgrounded,
    paused,
    resetKey: `${queueIndex}-${activity.id}`,
    onComplete: handleActivityComplete,
  });

  useEffect(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, []);

  const guideContent: EyeGuideContent = {
    title: activity.title,
    description: activity.description,
    steps: activity.steps,
    accent: ACCENT,
  };

  const nextActivity =
    phase === 'transition' && queueIndex + 1 < queue.length
      ? VISUAL_FLOW_ACTIVITIES[queue[queueIndex + 1]]
      : null;

  function requestClose() {
    if (phase === 'complete') { router.back(); return; }
    setCloseConfirmOpen(true);
  }

  return (
    <ScreenShell
      scroll={false}
      safeBottom
      pillar="eye"
      ambient={<AmbientBackground subtle />}
      header={
        phase !== 'complete' ? (
          <View style={styles.headerDock}>
            <View style={styles.headerInner}>
              <ScreenHeader
                title="Visual Flow"
                subtitle={!isSolo ? `${queueIndex + 1} of ${queue.length}` : undefined}
                compact
                rightAction={
                  <View style={styles.headerActions}>
                    <EyeGuideButton
                      variant="icon"
                      accent={ACCENT}
                      accessibilityLabel="Visual Flow guide"
                      onPress={() => setGuideOpen(true)}
                    />
                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={requestClose}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Close Visual Flow"
                    >
                      <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                }
              />
            </View>
          </View>
        ) : undefined
      }
    >
      {phase !== 'complete' ? (
        <View style={styles.activeRoot}>
          {phase === 'transition' && nextActivity ? (
            <Animated.View key="transition" entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.transitionWrap}>
              <Text style={styles.transitionLabel}>Next</Text>
              <Text style={styles.transitionTitle}>{nextActivity.title}</Text>
            </Animated.View>
          ) : (
            <Animated.View key={activity.id} entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.activityWrap}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityInstruction}>{activity.instruction}</Text>

              <View style={styles.openCanvas}>
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <RadialGradient id="fieldGlow" cx="50%" cy="50%" r="65%">
                      <Stop offset="0%" stopColor="#3D2E7A" stopOpacity="0.16" />
                      <Stop offset="55%" stopColor="#211A50" stopOpacity="0.08" />
                      <Stop offset="100%" stopColor="#0F0C29" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill="url(#fieldGlow)" />
                </Svg>
                <ActivityVisual id={activity.id} active={phase === 'active' && !paused} />
              </View>

              <View style={styles.bottomRow}>
                <Text style={styles.remaining}>{secondsLeft}s remaining</Text>
                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={styles.pauseBtn}
                    onPress={() => setUserPaused(p => !p)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={userPaused ? 'Resume' : 'Pause'}
                  >
                    {userPaused ? (
                      <Play size={14} color={colors.text.primary} strokeWidth={2.2} />
                    ) : (
                      <Pause size={14} color={colors.text.primary} strokeWidth={2.2} />
                    )}
                    <Text style={styles.pauseText}>{userPaused ? 'Resume' : 'Pause'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleActivityComplete} activeOpacity={0.7} hitSlop={8}>
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}

          {lifecyclePaused && (
            <View style={styles.pausedOverlay}>
              <Text style={styles.pausedTitle}>Paused</Text>
              <Text style={styles.pausedSub}>
                Pick up where you left off whenever you&apos;re ready.
              </Text>
              <GradientCTA
                label="Resume"
                onPress={() => setLifecyclePaused(false)}
                textColor="#03212C"
                style={styles.pausedCta}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.completeRoot}>
          <View style={styles.completeIcon}>
            <Check size={32} color={ACCENT} strokeWidth={3} />
          </View>
          <Text style={styles.completeTitle}>Visual Flow Complete</Text>
          <Text style={styles.completeMeta}>
            {Math.round(totalSeconds / 60)} min · {queue.length} activit{queue.length === 1 ? 'y' : 'ies'}
          </Text>
          <Text style={styles.completeSub}>You completed today&apos;s Visual Flow.</Text>
          <GradientCTA label="Done" onPress={() => router.back()} textColor="#03212C" style={styles.completeCta} />
        </View>
      )}

      <EyeGuideSheet visible={guideOpen} content={guideContent} onClose={() => setGuideOpen(false)} />

      <Modal
        visible={closeConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCloseConfirmOpen(false)}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCloseConfirmOpen(false)} />
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>End Visual Flow?</Text>
            <Text style={styles.confirmSub}>Your current session will stop.</Text>
            <TouchableOpacity style={styles.confirmPrimary} onPress={() => setCloseConfirmOpen(false)} activeOpacity={0.85}>
              <Text style={styles.confirmPrimaryText}>Keep Going</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmSecondary} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.confirmSecondaryText}>End Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerDock: { paddingBottom: spacing.xs },
  headerInner: { paddingHorizontal: spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  activeRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  activityWrap: { alignItems: 'center', width: '100%' },
  activityTitle: { fontFamily: FONTS.heading, fontSize: 20, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  activityInstruction: { fontSize: 13.5, color: colors.text.secondary, textAlign: 'center', marginTop: 3 },
  openCanvas: { alignItems: 'center', justifyContent: 'center', marginTop: 16 },

  bottomRow: { alignItems: 'center', gap: 12, marginTop: 19 },
  remaining: { fontSize: 13.5, fontWeight: '600', color: 'rgba(245,247,251,0.62)', fontVariant: ['tabular-nums'] },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  pauseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.button,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pauseText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  skipText: { fontSize: 13, fontWeight: '600', color: 'rgba(245,247,251,0.55)', paddingVertical: 6, paddingHorizontal: 4 },

  transitionWrap: { alignItems: 'center', gap: 4 },
  transitionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
  transitionTitle: { fontFamily: FONTS.heading, fontSize: 22, fontWeight: '700', color: ACCENT },

  pausedOverlay: {
    ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 24, backgroundColor: 'rgba(15,12,41,0.96)', zIndex: 20,
  },
  pausedTitle: { fontSize: 20, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  pausedSub: { fontSize: 13, lineHeight: 19, color: colors.text.secondary, textAlign: 'center', maxWidth: 280 },
  pausedCta: { minWidth: 200, marginTop: 6 },

  completeRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  completeIcon: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT + '14', borderWidth: 1, borderColor: ACCENT + '38',
  },
  completeTitle: { fontFamily: FONTS.heading, fontSize: 22, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  completeMeta: { fontSize: 13, fontWeight: '600', color: ACCENT },
  completeSub: { fontSize: 14, lineHeight: 20, color: colors.text.secondary, textAlign: 'center' },
  completeCta: { minWidth: 200, marginTop: 8 },

  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  confirmSheet: {
    width: '100%', maxWidth: 340, borderRadius: RADIUS.card, padding: 20, gap: 6,
    backgroundColor: '#1A1545', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: colors.text.primary },
  confirmSub: { fontSize: 13, lineHeight: 18, color: colors.text.secondary, marginBottom: 10 },
  confirmPrimary: {
    height: 46, borderRadius: RADIUS.button, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT + '1f', borderWidth: 1, borderColor: ACCENT + '55', marginBottom: 8,
  },
  confirmPrimaryText: { fontSize: 14.5, fontWeight: '700', color: ACCENT },
  confirmSecondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
  confirmSecondaryText: { fontSize: 13.5, fontWeight: '600', color: colors.text.tertiary },
});
