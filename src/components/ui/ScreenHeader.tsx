import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
};

export function ScreenHeader({ title, subtitle, showBack, rightAction }: Props) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightSlot}>
          {rightAction}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg, paddingTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  rightSlot: { flexShrink: 0 },
  title: { ...typography.headingLarge, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary, marginTop: 2 },
});
