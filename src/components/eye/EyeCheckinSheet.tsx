import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Check } from 'lucide-react-native';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import {
  PILLAR_COLORS,
  RADIUS,
  STATUS_COLORS,
  SURFACE_TINT,
} from '@/constants/designSystem';
import { GLASS_CARD } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { saveEyeSymptomRecord } from '@/services/eyeSymptomPersistence';
import {
  saveScreenHabitRecord,
  type ScreenSessionContext,
  type ScreenSessionMinutes,
} from '@/services/eyeScreenHabitPersistence';
import {
  getEyeSymptomGuidance,
  type EyeSymptomId,
} from '@/utils/eyeSymptomGuidance';

const EYE_COLOR = PILLAR_COLORS.eye;

export type CheckinMode = 'symptoms' | 'screen';

const EYE_SYMPTOM_OPTIONS: { id: EyeSymptomId; label: string }[] = [
  { id: 'dryness', label: 'Dry or burning' },
  { id: 'tired', label: 'Tired or sore' },
  { id: 'headache', label: 'Headache' },
  { id: 'blurred', label: 'Blurred vision' },
  { id: 'double', label: 'Double vision' },
  { id: 'pain', label: 'Eye pain' },
  { id: 'sudden-change', label: 'Sudden change' },
  { id: 'after-injury', label: 'After injury' },
];

const SCREEN_CONTEXTS: { id: ScreenSessionContext; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'study', label: 'Study' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'reading', label: 'Reading' },
  { id: 'other', label: 'Other' },
];

const SCREEN_DURATIONS: ScreenSessionMinutes[] = [20, 40, 60, 90];

/**
 * Glass bottom sheet for the Eye dashboard's two lightweight check-ins:
 * symptom check-in ("How do your eyes feel?") and screen-session logging.
 * Kept off the main screen so the dashboard only shows the entry rows.
 */
export function EyeCheckinSheet({
  visible,
  mode,
  onClose,
  uid,
}: {
  visible: boolean;
  mode: CheckinMode;
  onClose: () => void;
  uid?: string;
}) {
  const insets = useSafeAreaInsets();
  const [selectedSymptoms, setSelectedSymptoms] = useState<EyeSymptomId[]>([]);
  const [symptomGuidance, setSymptomGuidance] = useState<ReturnType<
    typeof getEyeSymptomGuidance
  > | null>(null);
  const [screenContext, setScreenContext] =
    useState<ScreenSessionContext>('work');
  const [screenMinutes, setScreenMinutes] =
    useState<ScreenSessionMinutes>(40);
  const [screenHabitSaved, setScreenHabitSaved] = useState(false);

  const saveSymptomCheckin = () => {
    setSymptomGuidance(getEyeSymptomGuidance(selectedSymptoms));
    void saveEyeSymptomRecord(uid, selectedSymptoms);
  };

  const saveScreenCheckin = () => {
    void saveScreenHabitRecord(uid, {
      context: screenContext,
      continuousMinutes: screenMinutes,
    });
    setScreenHabitSaved(true);
  };

  const title = mode === 'symptoms' ? 'How do your eyes feel?' : 'Log screen session';
  const subtitle =
    mode === 'symptoms'
      ? 'Optional check-in · stored privately'
      : 'What were you doing?';

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
              <Text style={styles.eyebrow}>{subtitle}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
          >
            {mode === 'symptoms' ? (
              <>
                <View style={styles.chips}>
                  {EYE_SYMPTOM_OPTIONS.map(option => {
                    const selected = selectedSymptoms.includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => {
                          setSymptomGuidance(null);
                          setSelectedSymptoms(current =>
                            selected
                              ? current.filter(id => id !== option.id)
                              : [...current, option.id],
                          );
                        }}
                        style={[
                          styles.chip,
                          selected && styles.chipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveSymptomCheckin}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>
                    {selectedSymptoms.length === 0
                      ? 'Record feeling comfortable'
                      : 'Save check-in'}
                  </Text>
                </TouchableOpacity>
                {symptomGuidance && (
                  <View
                    style={[
                      styles.guidance,
                      symptomGuidance.level === 'urgent' && styles.guidanceUrgent,
                    ]}
                  >
                    <AlertCircle
                      size={15}
                      color={
                        symptomGuidance.level === 'urgent'
                          ? STATUS_COLORS.warning
                          : EYE_COLOR
                      }
                    />
                    <Text style={styles.guidanceText}>
                      {symptomGuidance.message}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.prompt}>What were you doing?</Text>
                <View style={styles.chips}>
                  {SCREEN_CONTEXTS.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setScreenContext(option.id);
                        setScreenHabitSaved(false);
                      }}
                      style={[
                        styles.chip,
                        screenContext === option.id && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          screenContext === option.id && styles.chipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.prompt}>Longest continuous screen block</Text>
                <View style={styles.chips}>
                  {SCREEN_DURATIONS.map(minutes => (
                    <TouchableOpacity
                      key={minutes}
                      onPress={() => {
                        setScreenMinutes(minutes);
                        setScreenHabitSaved(false);
                      }}
                      style={[
                        styles.chip,
                        screenMinutes === minutes && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          screenMinutes === minutes && styles.chipTextSelected,
                        ]}
                      >
                        {minutes === 90 ? '90+ min' : `${minutes} min`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveScreenCheckin}
                  activeOpacity={0.8}
                >
                  {screenHabitSaved ? (
                    <View style={styles.savedRow}>
                      <Check size={13} color={STATUS_COLORS.success} strokeWidth={3} />
                      <Text style={[styles.saveBtnText, styles.savedText]}>
                        Saved ✓
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.saveBtnText}>Save screen session</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.note}>
                  Manually reported; MindPulse does not read device-wide screen time.
                </Text>
              </>
            )}
          </ScrollView>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  chipSelected: {
    borderColor: EYE_COLOR + '70',
    backgroundColor: EYE_COLOR + '14',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chipTextSelected: { color: EYE_COLOR },
  prompt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_COLOR + '18',
    borderWidth: 1,
    borderColor: EYE_COLOR + '30',
  },
  saveBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: EYE_COLOR,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedText: { color: STATUS_COLORS.success },
  note: {
    marginTop: 10,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    color: colors.text.tertiary,
  },
  guidance: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 11,
    backgroundColor: EYE_COLOR + '0C',
  },
  guidanceUrgent: {
    backgroundColor: STATUS_COLORS.warning + '10',
    borderWidth: 1,
    borderColor: STATUS_COLORS.warning + '35',
  },
  guidanceText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text.secondary,
  },
});
