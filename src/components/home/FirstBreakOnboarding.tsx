import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye } from 'lucide-react-native';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { FONTS, GLASS_CARD, PALETTE, RADIUS, SPACING } from '@/constants/designSystem';

/** First-break onboarding shown once after feature guide, before any paywall.
 * Guides the user into one simple eye break. No account creation / long tours.
 */
export function FirstBreakOnboarding({
  visible,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Eye size={28} color={PALETTE.mint} strokeWidth={2.2} />
          </View>

          <Text style={styles.title}>Take your first eye break</Text>
          <Text style={styles.subtitle}>
            A quick 20-20-20 reset — look at something far away for about 20 seconds.
          </Text>

          <View style={styles.timerBadge}>
            <Text style={styles.timerValue}>20</Text>
            <Text style={styles.timerUnit}>sec</Text>
          </View>

          <GradientCTA
            label="Start Break"
            onPress={onAccept}
            textColor={PALETTE.onMint}
            compact
            style={styles.cta}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            onPress={onDecline}
            hitSlop={12}
            style={styles.skipHit}
          >
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 15, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.screenH,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.hero,
    paddingHorizontal: SPACING.cardPadding,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    backgroundColor: '#16123A',
    borderWidth: 1,
    borderColor: GLASS_CARD.border,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77, 225, 193, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(77, 225, 193, 0.28)',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '700',
    color: '#F6F8FC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(245,247,251,0.65)',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(77, 225, 193, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(77, 225, 193, 0.22)',
    marginBottom: 22,
  },
  timerValue: {
    fontFamily: FONTS.heading,
    fontSize: 36,
    fontWeight: '700',
    color: PALETTE.mint,
    fontVariant: ['tabular-nums'],
  },
  timerUnit: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    color: 'rgba(245,247,251,0.55)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingBottom: 4,
  },
  cta: {
    width: '100%',
  },
  skipHit: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skip: {
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: 'rgba(245,247,251,0.55)',
    textAlign: 'center',
  },
});
