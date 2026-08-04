import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, BellRing, Volume2, Vibrate } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS, RADIUS, SURFACE_TINT } from '@/constants/designSystem';
import { GLASS_CARD } from '@/constants/theme';
import {
  COMPANION_SNOOZE_OPTIONS,
  type DesktopCompanionPrefs,
} from '@/services/desktopCompanion';

const EYE_COLOR = PILLAR_COLORS.eye;

/**
 * Companion notification settings. Lives behind the gear on the companion
 * hero so the dashboard stays compact while every option stays reachable.
 */
export function CompanionSettingsSheet({
  visible,
  prefs,
  onChange,
  onClose,
}: {
  visible: boolean;
  prefs: DesktopCompanionPrefs;
  onChange: (patch: Partial<DesktopCompanionPrefs>) => void;
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
            <Text style={styles.title}>Reminder settings</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.group}>
            <ToggleRow
              icon={Volume2}
              label="Sound"
              value={prefs.soundOn}
              onChange={v => onChange({ soundOn: v })}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon={Vibrate}
              label="Vibration"
              value={prefs.vibrationOn}
              onChange={v => onChange({ vibrationOn: v })}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon={BellRing}
              label="Notification repeat"
              value={prefs.repeatOn}
              onChange={v => onChange({ repeatOn: v })}
              footnote="Remind again every interval until the session ends."
            />
          </View>

          <Text style={styles.sectionLabel}>REMIND ME AGAIN AFTER</Text>
          <View style={styles.snoozeRow}>
            {COMPANION_SNOOZE_OPTIONS.map(minutes => {
              const selected = prefs.snoozeMinutes === minutes;
              return (
                <TouchableOpacity
                  key={minutes}
                  onPress={() => onChange({ snoozeMinutes: minutes })}
                  activeOpacity={0.8}
                  style={[styles.snoozeChip, selected && styles.snoozeChipSelected]}
                >
                  <Text
                    style={[
                      styles.snoozeChipText,
                      selected && styles.snoozeChipTextSelected,
                    ]}
                  >
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.noteRow}>
            <Bell size={13} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            <Text style={styles.note}>
              Saved for future sessions — reminders scheduled from now on use
              these settings.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  value,
  onChange,
  footnote,
}: {
  icon: typeof Volume2;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  footnote?: string;
}) {
  return (
    <View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleIcon}>
          <Icon size={15} color={EYE_COLOR} strokeWidth={2} />
        </View>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#252542', true: EYE_COLOR }}
          thumbColor="#FFFFFF"
        />
      </View>
      {footnote && <Text style={styles.toggleFootnote}>{footnote}</Text>}
    </View>
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
    paddingHorizontal: 18,
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
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  group: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
  },
  // Same icon-chip recipe as the companion card hero icon + activity sheet.
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EYE_COLOR + '12',
    borderWidth: 1,
    borderColor: EYE_COLOR + '28',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  toggleFootnote: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.text.tertiary,
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.text.tertiary,
    marginBottom: 6,
  },
  snoozeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  // Same chip recipe as the companion card's compact interval/break chips.
  snoozeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  snoozeChipSelected: {
    borderColor: EYE_COLOR + '99',
    backgroundColor: EYE_COLOR + '1A',
  },
  snoozeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  snoozeChipTextSelected: { color: EYE_COLOR, fontWeight: '800' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  note: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.text.tertiary,
  },
});
