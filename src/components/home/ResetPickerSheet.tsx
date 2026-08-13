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
import { PILLAR_COLORS, RADIUS, STATUS_COLORS, SURFACE_TINT } from '@/constants/designSystem';
import { GLASS_CARD } from '@/constants/theme';

const RESET_COLOR = PILLAR_COLORS.reset;
const BREATHE_SESSION = getSessionById('box-breathing');

type ResetOption = {
  id: string;
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
 */
export function ResetPickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
          <LinearGradient colors={SURFACE_TINT.card} style={StyleSheet.absoluteFill} />
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
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => open(option.route)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title}, ${option.duration}, ${option.description}`}
                  style={styles.option}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.accent + '18', borderColor: option.accent + '38' }]}>
                    <Icon size={18} color={option.accent} strokeWidth={2} />
                  </View>
                  <View style={styles.optionInfo}>
                    <View style={styles.optionTitleRow}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDuration}>{option.duration}</Text>
                    </View>
                    <Text style={styles.optionDescription} numberOfLines={1}>{option.description}</Text>
                  </View>
                  <ChevronRight size={18} color="rgba(255,255,255,0.3)" strokeWidth={2.4} />
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
    backgroundColor: '#11162a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    marginBottom: 14,
  },
  header: {
    gap: 3,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.55)',
  },
  options: {
    gap: 8,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
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
    gap: 2,
    minWidth: 0,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionDuration: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  optionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
