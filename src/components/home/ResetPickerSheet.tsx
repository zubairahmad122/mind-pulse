import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Eye,
  PersonStanding,
  PhoneOff,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '@/constants';
import { EYE_BREAK_ACTIVITY, formatActivityDuration } from '@/constants/eyeRelax';
import { formatSessionDuration, getSessionById } from '@/constants/relaxSessions';
import { PILLAR_COLORS, STATUS_COLORS } from '@/constants/designSystem';
import { GLASS_CARD } from '@/constants/theme';
import type { ResetType } from '@/services/screenBalancePersistence';

const RESET_COLOR = PILLAR_COLORS.reset;
const BREATHE_SESSION = getSessionById('box-breathing');
/** Local override, not `RADIUS.card` (24) — this sheet's rows want a
 * slightly tighter, more integrated corner than the app's standard card
 * radius, kept local so it doesn't ripple into other `RADIUS.card` surfaces. */
const ROW_RADIUS = 17;

type ResetOption = {
  id: ResetType;
  icon: LucideIcon;
  accent: string;
  title: string;
  duration: string;
  description: string;
  route: string;
};

const OPTIONS: ResetOption[] = [
  {
    id: 'eye-break',
    icon: Eye,
    accent: PILLAR_COLORS.eye,
    title: 'Eye Break',
    duration: formatActivityDuration(EYE_BREAK_ACTIVITY.durationSeconds),
    description: 'Look away from the screen',
    route: EYE_BREAK_ACTIVITY.route,
  },
  {
    id: 'breathe',
    icon: Wind,
    accent: PILLAR_COLORS.relax,
    title: 'Breathe',
    duration: BREATHE_SESSION ? formatSessionDuration(BREATHE_SESSION.durationSeconds) : '5 min',
    description: 'Slow your breathing',
    route: ROUTES.appBoxBreathing,
  },
  {
    id: 'move',
    icon: PersonStanding,
    accent: PILLAR_COLORS.challenge,
    title: 'Move',
    duration: '2 min',
    description: 'Stand, stretch, and move',
    route: ROUTES.appMoveReset,
  },
  {
    id: 'offline',
    icon: PhoneOff,
    accent: STATUS_COLORS.success,
    title: 'Go Offline',
    duration: '5 min',
    description: 'Put the phone down for a while',
    route: ROUTES.appOfflineReset,
  },
];

/**
 * "Choose your reset" — the shared entry point for Screen Balance's reset
 * flow. Both the Home Quick Action ("Reset" pillar) and the Screen Balance
 * card's "Take a Reset" CTA open this same sheet rather than growing their
 * own copies. Same Modal/backdrop/handle convention as `CompanionActivitySheet`.
 *
 * `recommendedReset`, when set, marks exactly one row "Recommended" — the
 * ordering and options themselves never change, only that one label.
 */
export function ResetPickerSheet({
  visible,
  onClose,
  recommendedReset,
}: {
  visible: boolean;
  onClose: () => void;
  recommendedReset?: ResetType;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const open = (route: string) => {
    onClose();
    router.push(route as never);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <BlurView intensity={GLASS_CARD.blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
          {/* Premium navy-indigo base — a two-stop gradient instead of a flat
              fill, matching the Featured card's surface treatment. */}
          <LinearGradient colors={['#211B48', '#14102E']} style={StyleSheet.absoluteFill} />
          {/* Ambient depth — cyan glow toward the upper-left, a barely-there
              violet echo toward the lower-right. Both span the sheet's full
              bounds (not an inner box) so there's no hard-edged seam where a
              smaller glow rectangle would otherwise cut off against the flat
              fill around it. */}
          <LinearGradient
            colors={['rgba(77,225,193,0.10)', 'rgba(77,225,193,0.02)', 'rgba(77,225,193,0)']}
            locations={[0, 0.35, 0.7]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(123,92,255,0)', 'rgba(123,92,255,0.02)', 'rgba(123,92,255,0.06)']}
            locations={[0.5, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={GLASS_CARD.highlightColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topHighlight}
          />
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: RESET_COLOR }]}>SCREEN BALANCE</Text>
            <Text style={styles.title}>Choose your reset</Text>
            <Text style={styles.subtitle}>A small break can help you return with intention.</Text>
          </View>

          <View style={styles.options}>
            {OPTIONS.map(option => {
              const Icon = option.icon;
              const isRecommended = option.id === recommendedReset;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => open(option.route)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isRecommended
                      ? `${option.title}, ${option.duration}, ${option.description}, Recommended`
                      : `${option.title}, ${option.duration}, ${option.description}`
                  }
                  style={[
                    styles.option,
                    isRecommended && {
                      backgroundColor: RESET_COLOR + '0A',
                      borderColor: RESET_COLOR + '2A',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: option.accent + '16', borderColor: option.accent + '2E', borderTopColor: 'rgba(255,255,255,0.15)' },
                    ]}
                  >
                    <Icon size={20} color={option.accent} strokeWidth={2} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle} numberOfLines={1}>{option.title}</Text>
                    <Text style={styles.optionDescription} numberOfLines={1}>{option.description}</Text>
                    {isRecommended && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.optionRight}>
                    <Text style={styles.optionDuration}>{option.duration}</Text>
                    <ChevronRight size={16} color="rgba(214,250,241,0.45)" strokeWidth={2.4} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1.5,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 13,
  },
  header: {
    gap: 2,
    marginBottom: 13,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  options: {
    gap: 9,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ROW_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  optionInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    marginTop: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: RESET_COLOR + '1A',
    borderWidth: 1,
    borderColor: RESET_COLOR + '38',
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: RESET_COLOR,
    textTransform: 'uppercase',
  },
  optionRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  optionDuration: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
});
