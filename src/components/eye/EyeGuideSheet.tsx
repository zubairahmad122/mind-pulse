import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, HelpCircle, Info, X, type LucideIcon } from 'lucide-react-native';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GLASS_CARD, PILLAR_COLORS, SURFACE_TINT } from '@/constants/designSystem';

/**
 * Contextual content for one Eye Guide sheet. Every Eye screen builds one of
 * these for its own activity — the sheet itself is the single shared
 * implementation, so guide markup never gets duplicated screen to screen.
 */
export type EyeGuideContent = {
  title: string;
  /** One-line purpose/description shown under the title. */
  description: string;
  steps: string[];
  tips?: string[];
  /** e.g. "25 sec" or "3 min 30 sec · 7 activities" — read from real data, never hardcoded per-screen. */
  duration?: string;
  icon?: LucideIcon;
  accent?: string;
};

type Props = {
  visible: boolean;
  content: EyeGuideContent | null;
  onClose: () => void;
};

/**
 * The single reusable "Guide / How It Works" bottom sheet for every Eye
 * inner screen. Dark Well Mode glass, backdrop keeps the current screen
 * visible behind it, closes via X / backdrop tap / swipe-down (Android back
 * via `onRequestClose`). Purely instructional UI — never touches session,
 * timer, or pause/resume state itself; callers own that.
 */
export function EyeGuideSheet({ visible, content, onClose }: Props) {
  const insets = useSafeAreaInsets();
  if (!content) return null;
  const Icon = content.icon ?? Eye;
  const accent = content.accent ?? PILLAR_COLORS.eye;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close guide"
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}
          accessibilityViewIsModal
        >
          <BlurView intensity={GLASS_CARD.blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={SURFACE_TINT.card} style={StyleSheet.absoluteFill} />

          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: accent + '18', borderColor: accent + '34' }]}>
              <Icon size={20} color={accent} strokeWidth={2} />
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close guide"
              style={styles.closeBtn}
            >
              <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title} accessibilityRole="header">{content.title}</Text>
            <Text style={styles.description}>{content.description}</Text>

            <Text style={styles.sectionLabel}>HOW TO DO IT</Text>
            <View style={styles.list}>
              {content.steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={[styles.stepNum, { color: accent }]}>{i + 1}</Text>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>

            {!!content.tips?.length && (
              <>
                <Text style={styles.sectionLabel}>TIPS</Text>
                <View style={styles.list}>
                  {content.tips.map((t, i) => (
                    <View key={i} style={styles.tipRow}>
                      <Text style={styles.tipBullet}>•</Text>
                      <Text style={styles.tipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!!content.duration && <Text style={styles.duration}>{content.duration}</Text>}
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[styles.gotIt, { backgroundColor: accent + '1f', borderColor: accent + '55' }]}
          >
            <Text style={[styles.gotItText, { color: accent }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Small contextual trigger shared by every Eye screen. `icon` = compact
 * circular "?" for tight header space (active exercise session); `pill` =
 * the standard "ⓘ Guide" chip for regular Eye inner-screen headers.
 */
export function EyeGuideButton({
  onPress,
  accessibilityLabel,
  variant = 'pill',
  accent = PILLAR_COLORS.eye,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'pill' | 'icon';
  accent?: string;
}) {
  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[styles.iconTrigger, { borderColor: accent + '35' }]}
      >
        <HelpCircle size={18} color={accent} strokeWidth={2} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.pillTrigger, { borderColor: accent + '30' }]}
    >
      <Info size={15} color={accent} strokeWidth={2} />
      <Text style={[styles.pillTriggerText, { color: accent }]}>Guide</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '62%',
    backgroundColor: '#1A1545',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: { paddingBottom: 6 },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(245,247,251,0.75)',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(245,247,251,0.4)',
    marginTop: 18,
    marginBottom: 8,
  },
  list: { gap: 8 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { fontSize: 13, fontWeight: '800', width: 16 },
  stepText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: 'rgba(245,247,251,0.88)' },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { fontSize: 13, color: 'rgba(245,247,251,0.5)', width: 10 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18, color: 'rgba(245,247,251,0.7)' },
  duration: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.5)',
    marginTop: 16,
  },
  gotIt: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  gotItText: { fontSize: 14.5, fontWeight: '700' },

  // Triggers
  iconTrigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,14,24,0.55)',
    borderWidth: 1,
  },
  pillTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(10,14,24,0.55)',
    borderWidth: 1,
  },
  pillTriggerText: { fontSize: 12.5, fontWeight: '700' },
});
