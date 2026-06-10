import { Ionicons } from '@expo/vector-icons';
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
  { icon: 'notifications' as const, text: 'Notifications — alarm sound and controls' },
  { icon: 'alarm' as const, text: 'Exact alarms — ring at the right time' },
  { icon: 'expand' as const, text: 'Full screen — show Wake Up dialog over lock screen' },
  { icon: 'battery-charging' as const, text: 'Battery — set to Unrestricted' },
];

export function AlarmPermissionModal({ loading, onAllow, onLater }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Ionicons name="alarm-outline" size={48} color={colors.accent.purple} style={{ marginBottom: spacing.sm }} />
        <Text style={styles.title}>Allow wake alarms</Text>
        <Text style={styles.subtitle}>
          AuraSync needs these permissions to ring when the app is closed or your screen is
          off.
        </Text>

        <View style={styles.list}>
          {ITEMS.map(item => (
            <View key={item.text} style={styles.row}>
              <Ionicons name={item.icon} size={20} color={colors.accent.purple} />
              <Text style={styles.rowText}>{item.text}</Text>
            </View>
          ))}
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
  rowText: { ...typography.body, color: colors.text.primary, flex: 1 },
  primary: { width: '100%', marginBottom: spacing.sm },
});
