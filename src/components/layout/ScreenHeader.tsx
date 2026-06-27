import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

const BADGE_SIZE = 40;

type Props = {
  /** Shows a circular back button when provided. */
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  /** Replaces the title/subtitle block entirely (e.g. a tab switcher). */
  center?: ReactNode;
  /** Right-side slot — defaults to an invisible spacer so the center stays balanced. */
  right?: ReactNode;
  textColor?: string;
  subtitleColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  /**
   * Extra top clearance for screens with no SafeAreaView of their own (e.g. a
   * raw `Modal` with `statusBarTranslucent`). Screens that already pad for the
   * safe area (most stack screens) should leave this at 0.
   */
  topInset?: number;
};

/** The one back-button + title header used across every stack/modal screen. */
export function ScreenHeader({
  onBack,
  title,
  subtitle,
  center,
  right,
  textColor = '#FFFFFF',
  subtitleColor = 'rgba(255,255,255,0.4)',
  badgeBg = 'rgba(255,255,255,0.08)',
  badgeBorder = 'rgba(255,255,255,0.14)',
  topInset = 0,
}: Props) {
  return (
    <View style={[styles.row, { paddingTop: 8 + topInset }]}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.badge} />
      )}

      <View style={styles.center}>
        {center ?? (
          <>
            {title ? <Text style={[styles.title, { color: textColor }]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text> : null}
          </>
        )}
      </View>

      {right ?? <View style={styles.badge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
