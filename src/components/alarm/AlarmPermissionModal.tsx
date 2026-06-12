import { Bell, BellRing, BatteryCharging, Maximize2, Smartphone } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = {
  loading?: boolean;
  onAllow: () => void;
  onLater: () => void;
};

const ITEMS = [
  { icon: BellRing, text: 'Notifications — alarm sound and controls' },
  { icon: Smartphone, text: 'Exact alarms — ring at the right time' },
  { icon: Maximize2, text: 'Full screen — show Wake Up dialog over lock screen' },
  { icon: BatteryCharging, text: 'Battery — set to Unrestricted' },
];

export function AlarmPermissionModal({ loading, onAllow, onLater }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Bell size={40} color={colors.accent.purple} />
        </View>
        <Text style={styles.title}>Allow wake alarms</Text>
        <Text style={styles.subtitle}>
          MindPulse needs these permissions to ring when the app is closed or your screen is
          off.
        </Text>

        <View style={styles.list}>
          {ITEMS.map(item => {
            const ItemIcon = item.icon;
            return (
              <View key={item.text} style={styles.row}>
                <View style={styles.iconBox}>
                  <ItemIcon size={18} color={colors.accent.purple} strokeWidth={1.8} />
                </View>
                <Text style={styles.rowText}>{item.text}</Text>
              </View>
            );
          })}
        </View>

        <PrimaryButton
          label="Allow alarms"
          onPress={onAllow}
          loading={loading}
          style={styles.primary}
        />
        <OutlineButton label="Not now" onPress={onLater} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  title: { ...typography.headingMedium, color: colors.text.primary, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  list: { width: '100%', gap: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { ...typography.body, color: colors.text.primary, flex: 1 },
  primary: { width: '100%', marginBottom: spacing.sm },
});
