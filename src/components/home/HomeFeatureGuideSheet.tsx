import { useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Timer, TimerReset, TrendingUp, X, type LucideIcon } from 'lucide-react-native';
import { FONTS, GLASS_CARD, PILLAR_COLORS } from '@/constants/designSystem';
import { GradientCTA } from '@/components/ui/GradientCTA';

type Slide = {
  icon: LucideIcon;
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
};

/**
 * One real benefit per slide, deliberately matching the app's own Featured
 * card (Focus / Screen Balance) and the suggested Play Store screenshot set
 * — "one image, one benefit" reads clearer to a brand-new user than a long
 * feature list. Icon-illustrated (same visual language as the rest of the
 * app) rather than literal screenshots, which keeps this in sync with the
 * UI automatically instead of going stale the next time a screen's design
 * changes.
 */
const SLIDES: Slide[] = [
  {
    icon: Timer,
    accent: PILLAR_COLORS.mind,
    eyebrow: 'FOCUS',
    title: 'Focus on your next task',
    description:
      'Start a focus block right from Home and keep distracting apps out of the way while you work or study.',
  },
  {
    icon: TimerReset,
    accent: PILLAR_COLORS.reset,
    eyebrow: 'SCREEN BREAK',
    title: 'Take a screen break',
    description:
      'When a session ends, take a short guided reset — eyes, breathing, or a stretch — before you pick your phone back up.',
  },
  {
    icon: TrendingUp,
    accent: PILLAR_COLORS.challenge,
    eyebrow: 'PROGRESS',
    title: 'See your progress',
    description:
      'Your focus minutes, resets, and screen time build into a simple weekly picture — no guessing how the week went.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  visible: boolean;
  /** Fired on skip (X) and after the final slide's primary button — callers persist "seen" here. */
  onClose: () => void;
  /** Fired only after the last slide's "Start Focus" tap, in addition to `onClose`. */
  onStartFocus: () => void;
};

/**
 * First-run, swipeable "how this app works" guide shown once on Home —
 * see `homeFeatureGuidePersistence.ts` for the "shown once" gate. Purely
 * orientation: it never blocks the app (X always available) and never
 * mentions Pro/paywall — that's the separate onboarding paywall sheet.
 */
export function HomeFeatureGuideSheet({ visible, onClose, onStartFocus }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  if (!visible) return null;

  const goTo = (next: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  };

  const handlePrimaryPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      onClose();
      onStartFocus();
      return;
    }
    goTo(index + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
          <BlurView intensity={GLASS_CARD.blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(19,16,40,0.97)', 'rgba(15,12,41,0.99)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.handle} />
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Skip guide"
            style={styles.closeBtn}
          >
            <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.2} />
          </TouchableOpacity>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
            scrollEventThrottle={16}
          >
            {SLIDES.map((slide) => {
              const Icon = slide.icon;
              return (
                <View key={slide.title} style={[styles.slide, { width: SCREEN_WIDTH }]}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: slide.accent + '18', borderColor: slide.accent + '38' },
                    ]}
                  >
                    <Icon size={34} color={slide.accent} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
            {SLIDES.map((slide, i) => (
              <TouchableOpacity key={slide.title} onPress={() => goTo(i)} activeOpacity={0.7} hitSlop={8}>
                <View
                  style={[
                    styles.dot,
                    i === index ? { width: 22, backgroundColor: slide.accent } : null,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.primaryButtonWrap}>
            <GradientCTA
              label={isLast ? 'Start Focus' : 'Next'}
              icon={<ArrowRight size={17} color="#03212C" strokeWidth={2.5} />}
              textColor="#03212C"
              onPress={handlePrimaryPress}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,4,10,0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: GLASS_CARD.border,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 8,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '700',
    color: '#F6F8FC',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(245,247,251,0.68)',
    textAlign: 'center',
    maxWidth: 300,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  primaryButtonWrap: {
    marginHorizontal: 24,
    marginTop: 20,
  },
});
