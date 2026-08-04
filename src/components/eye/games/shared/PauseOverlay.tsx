import { BlurView } from 'expo-blur';
import { AlertTriangle, Contrast, Maximize2, Pause, RotateCcw, Vibrate, VolumeX, Volume2, Wind, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS, STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';

const EYE = PILLAR_COLORS.eye;

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel: string;
}

function ToggleRow({ icon, label, value, onValueChange, accessibilityLabel }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabelWrap}>
        {icon}
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.14)', true: EYE + 'B0' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="rgba(255,255,255,0.14)"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

interface Props {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  soundEnabled: boolean;
  onToggleSound: (v: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (v: boolean) => void;
  largeTarget: boolean;
  onToggleLargeTarget: (v: boolean) => void;
  highContrast: boolean;
  onToggleHighContrast: (v: boolean) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (v: boolean) => void;
}

/**
 * Shared pause overlay for eye games — the only place in-session settings
 * live (no floating settings gear during active gameplay). Exit is a
 * two-step confirm (End round → "Keep Playing" / "End Session") so one
 * accidental tap can't discard progress.
 */
export function PauseOverlay({
  visible,
  onResume,
  onRestart,
  onExit,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  largeTarget,
  onToggleLargeTarget,
  highContrast,
  onToggleHighContrast,
  reducedMotion,
  onToggleReducedMotion,
}: Props) {
  const [confirmingExit, setConfirmingExit] = useState(false);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.centerWrap}>
          <View style={styles.card}>
            {confirmingExit ? (
              <>
                <View style={styles.iconBadgeWarn}>
                  <AlertTriangle size={20} color={STATUS_COLORS.error} strokeWidth={2.4} />
                </View>
                <Text style={styles.title}>End session?</Text>
                <Text style={styles.sub}>Your progress on this round won&apos;t be saved.</Text>
                <View style={styles.actions}>
                  <GradientCTA label="Keep Playing" onPress={() => setConfirmingExit(false)} />
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={onExit}
                    accessibilityRole="button"
                    accessibilityLabel="End session"
                  >
                    <Text style={styles.secondaryBtnText}>End Session</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.iconBadge}>
                  <Pause size={20} color={EYE} strokeWidth={2.4} />
                </View>
                <Text style={styles.title}>Paused</Text>

                <View style={styles.toggleGroup}>
                  <ToggleRow
                    icon={soundEnabled ? <Volume2 size={16} color={colors.text.secondary} /> : <VolumeX size={16} color={colors.text.secondary} />}
                    label="Sound"
                    value={soundEnabled}
                    onValueChange={onToggleSound}
                    accessibilityLabel="Sound effects"
                  />
                  <ToggleRow
                    icon={<Vibrate size={16} color={colors.text.secondary} />}
                    label="Haptics"
                    value={hapticsEnabled}
                    onValueChange={onToggleHaptics}
                    accessibilityLabel="Haptic feedback"
                  />
                  <ToggleRow
                    icon={<Maximize2 size={16} color={colors.text.secondary} />}
                    label="Large symbols"
                    value={largeTarget}
                    onValueChange={onToggleLargeTarget}
                    accessibilityLabel="Large symbol mode"
                  />
                  <ToggleRow
                    icon={<Contrast size={16} color={colors.text.secondary} />}
                    label="High contrast"
                    value={highContrast}
                    onValueChange={onToggleHighContrast}
                    accessibilityLabel="High contrast mode"
                  />
                  <ToggleRow
                    icon={<Wind size={16} color={colors.text.secondary} />}
                    label="Reduced motion"
                    value={reducedMotion}
                    onValueChange={onToggleReducedMotion}
                    accessibilityLabel="Reduced motion"
                  />
                </View>

                <View style={styles.actions}>
                  <GradientCTA label="Resume" onPress={onResume} />
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={onRestart}
                    accessibilityRole="button"
                    accessibilityLabel="Restart session"
                  >
                    <RotateCcw size={15} color={colors.text.secondary} strokeWidth={2.2} />
                    <Text style={styles.secondaryBtnText}>Restart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => setConfirmingExit(true)}
                    accessibilityRole="button"
                    accessibilityLabel="End session"
                  >
                    <X size={15} color={colors.text.secondary} strokeWidth={2.2} />
                    <Text style={styles.secondaryBtnText}>End Session</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(18,22,34,0.92)',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: PILLAR_COLORS.eye + '1E',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconBadgeWarn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: STATUS_COLORS.error + '1E',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontFamily: FONTS.headingSemi, fontSize: 20, color: '#FFFFFF', marginBottom: 6 },
  sub: { fontFamily: FONTS.body, fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.md },
  toggleGroup: { width: '100%', marginTop: spacing.sm, marginBottom: spacing.md },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontFamily: FONTS.body, fontSize: 14, color: '#FFFFFF' },
  actions: { width: '100%', alignItems: 'center', gap: spacing.sm },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16,
    minHeight: 48,
  },
  secondaryBtnText: { fontFamily: FONTS.bodySemi, fontSize: 14, color: colors.text.secondary },
});
