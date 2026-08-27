import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProgressBar } from './ProgressBar';
import { FONTS, TYPOGRAPHY } from '@/constants/designSystem';

interface Props {
  icon: ReactNode;
  label: string;
  /** Right-aligned headline value, e.g. "38/100" or "3/7 days". */
  value: string;
  /** 0-100 — how far the mini bar fills. */
  percent: number;
  accentColor: string;
  onPress: () => void;
  /** Optional small line under the bar, e.g. "3 Sessions" — omit to match
   * Home's/Eye's single-value row exactly. */
  caption?: string;
}

/**
 * Borderless "weekly progress" teaser row — icon + label, a headline value,
 * "View Insights →", and a thin mini progress bar underneath. Shared by every
 * pillar screen (Home, Eye, Relax, ...) that needs this exact pattern, so it
 * can't drift between screens the way hand-copied versions inevitably would.
 */
export function WeeklyProgressRow({ icon, label, value, percent, accentColor, onPress, caption }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <View style={styles.top}>
        <View style={styles.left}>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
          <Text style={styles.link}>View Insights →</Text>
        </View>
      </View>
      <ProgressBar progress={clamped / 100} fill={accentColor} style={styles.track} />
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: TYPOGRAPHY.meta.fontSize,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.6)',
  },
  value: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.4)',
  },
  track: {
    marginTop: 8,
  },
  caption: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.5)',
    marginTop: 6,
  },
});
