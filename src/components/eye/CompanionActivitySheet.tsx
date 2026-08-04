import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  BookText,
  BriefcaseBusiness,
  Gamepad2,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PILLAR_COLORS, RADIUS, SURFACE_TINT } from '@/constants/designSystem';
import { GLASS_CARD } from '@/constants/theme';
import type { ScreenSessionContext } from '@/services/eyeScreenHabitPersistence';

const EYE_COLOR = PILLAR_COLORS.eye;

const ACTIVITIES: { id: ScreenSessionContext; label: string; icon: LucideIcon }[] = [
  { id: 'work', label: 'Work', icon: BriefcaseBusiness },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'reading', label: 'Reading', icon: BookText },
];

/**
 * Shown right before a desktop session starts — pick what you're doing, and
 * the session timer starts immediately. The choice is saved for next time.
 */
export function CompanionActivitySheet({
  visible,
  initialActivity,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialActivity: ScreenSessionContext | null;
  onSelect: (activity: ScreenSessionContext) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <BlurView
            intensity={GLASS_CARD.blurIntensity}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient colors={SURFACE_TINT.card} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={GLASS_CARD.highlightColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topHighlight}
          />
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>DESKTOP SESSION</Text>
              <Text style={styles.title}>What are you doing?</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.close}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {ACTIVITIES.map(activity => {
              const Icon = activity.icon;
              const active = initialActivity === activity.id;
              return (
                <TouchableOpacity
                  key={activity.id}
                  onPress={() => onSelect(activity.id)}
                  activeOpacity={0.8}
                  style={[styles.option, active && styles.optionSelected]}
                >
                  <View style={[styles.optionIcon, active && styles.optionIconSelected]}>
                    <Icon
                      size={17}
                      color={active ? EYE_COLOR : 'rgba(255,255,255,0.72)'}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={[styles.optionLabel, active && styles.optionLabelSelected]}>
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.note}>
            The timer starts now — you&apos;ll get a reminder to take a break in a
            bit.
          </Text>
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
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: EYE_COLOR,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  close: {
    fontSize: 14,
    fontWeight: '700',
    color: EYE_COLOR,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  optionSelected: {
    borderColor: EYE_COLOR + '70',
    backgroundColor: EYE_COLOR + '14',
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionIconSelected: {
    backgroundColor: EYE_COLOR + '16',
    borderColor: EYE_COLOR + '40',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  optionLabelSelected: { color: EYE_COLOR },
  note: {
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
});
