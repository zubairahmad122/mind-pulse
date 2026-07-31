import {
  Bell,
  BellRing,
  BatteryCharging,
  Maximize2,
  Smartphone,
} from 'lucide-react-native';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import {
  FONTS,
  GLASS_CARD,
  PILLAR_COLORS,
  RADIUS,
} from '@/constants/designSystem';
import { typography } from '@/constants/typography';

// This modal has no pillar of its own (it's a system-permission prompt, can
// surface from any screen) — the sleep indigo reads correctly here since
// it's specifically about the wake-alarm flow.
const ACCENT = PILLAR_COLORS.sleep;

type Props = {
  loading?: boolean;
  onAllow: () => void;
  onLater: () => void;
  onAutostart?: () => void;
};

const ITEMS = [
  { icon: BellRing, text: 'Notifications — alarm sound and controls' },
  { icon: Smartphone, text: 'Exact alarms — ring at the right time' },
  {
    icon: Maximize2,
    text: 'Full screen — show Wake Up dialog over lock screen',
  },
  { icon: BatteryCharging, text: 'Battery — set to Unrestricted' },
  {
    icon: Smartphone,
    text: 'Autostart — let alarms start when the app is closed',
  },
];

export function AlarmPermissionModal({
  loading,
  onAllow,
  onLater,
  onAutostart,
}: Props) {
  return (
    <View style={styles.overlay}>
      <GlassCard noPadding style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.cardInner}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Bell size={26} color={ACCENT} strokeWidth={1.8} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>WAKE ALARM SETUP</Text>
              <Text style={styles.title}>Allow wake alarms</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Enable these Android settings so your alarm can ring reliably when
            the screen is off.
          </Text>

          <View style={styles.list}>
            {ITEMS.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <View
                  key={item.text}
                  style={[
                    styles.row,
                    index < ITEMS.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.iconBox}>
                    <ItemIcon size={17} color={ACCENT} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.rowText}>{item.text}</Text>
                </View>
              );
            })}
          </View>

          <GradientCTA
            label="Allow alarms"
            onPress={onAllow}
            loading={loading}
            style={styles.primary}
            height={58}
          />
          {onAutostart ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onAutostart}
              activeOpacity={0.78}
            >
              <Text style={styles.secondaryText}>Enable Autostart</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.laterButton}
            onPress={onLater}
            activeOpacity={0.7}
          >
            <Text style={styles.laterText}>Not now</Text>
          </TouchableOpacity>
        </ScrollView>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,4,10,0.82)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    alignSelf: 'center',
    borderRadius: RADIUS.card,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardInner: {
    padding: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: 'rgba(255,255,255,0.44)',
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    letterSpacing: 1.8,
    marginBottom: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: ACCENT + '16',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACCENT + '2E',
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 14,
    marginBottom: 18,
    lineHeight: 21,
  },
  list: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS_CARD.border,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: ACCENT + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  primary: { width: '100%', marginBottom: 10 },
  secondaryButton: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ACCENT + '55',
    backgroundColor: ACCENT + '0A',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
  },
  laterButton: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  laterText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
});
