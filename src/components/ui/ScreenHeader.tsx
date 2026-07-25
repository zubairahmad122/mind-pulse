import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FONTS, TYPOGRAPHY } from '@/constants/designSystem';

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
};

/**
 * The single canonical screen header — back button + title/subtitle + right
 * slot. Title/subtitle typography is frozen (spec section 7): every screen
 * uses this exact scale, never a one-off size.
 */
export function ScreenHeader({ title, subtitle, showBack, rightAction }: Props) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.7}>
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
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
  // Local, smaller gaps than SPACING.section/screenTop on purpose — those
  // tokens are shared by inter-card spacing elsewhere, and the header's own
  // rhythm is tighter than the space between cards below it.
  wrap: { marginBottom: 20, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  rightSlot: { flexShrink: 0 },
  title: {
    // Same branded font Home's own greeting uses — this was missing here,
    // so every screen using this header (Profile, Achievements, Eye, etc.)
    // rendered its title in the plain system font instead.
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.screenTitle.fontSize,
    fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
    color: TYPOGRAPHY.screenTitle.color,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: TYPOGRAPHY.subtitle.color,
    // Tighter than SPACING.titleGap on purpose — that token is shared by
    // unrelated gaps elsewhere (hero CTA margins, Home's streak row).
    marginTop: 2,
  },
});
