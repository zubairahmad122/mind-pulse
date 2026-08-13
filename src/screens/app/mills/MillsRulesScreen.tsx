import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '@/constants/designSystem';
import { MILLS_THEME as T } from '@/constants/millsTheme';

const RULES: Array<[string, string, string]> = [
  ['1', 'Place nine pieces', 'Take turns placing one piece on any empty point.'],
  ['2', 'Form a mill', 'Align three of your pieces on an official board line.'],
  ['3', 'Capture', 'A new mill lets you remove one opponent piece. Pieces outside mills must be removed first.'],
  ['4', 'Move along lines', 'After placement, move one piece to an empty connected point.'],
  ['5', 'Fly with three', 'When you have exactly three pieces, move to any empty point.'],
  ['6', 'Win the match', 'Reduce your opponent below three pieces or leave them with no legal move.'],
];

export default function MillsRulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const cardWidth = width - 40;
  const stride = cardWidth + 12;
  const lastPage = RULES.length - 1;
  const isLast = page === lastPage;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / stride);
    setPage(Math.max(0, Math.min(lastPage, next)));
  };

  const goToPage = (index: number) => {
    const clamped = Math.max(0, Math.min(lastPage, index));
    scrollRef.current?.scrollTo({ x: clamped * stride, animated: true });
    setPage(clamped);
  };

  const onNext = () => {
    void Haptics.selectionAsync().catch(() => {});
    if (isLast) {
      router.back();
      return;
    }
    goToPage(page + 1);
  };

  return (
    <View style={[styles.safe, { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.top}>
        <Pressable accessibilityLabel="Back" hitSlop={8} onPress={() => router.back()} style={styles.icon}>
          <ArrowLeft color={T.text} size={20} />
        </Pressable>
        <Text style={styles.title}>How to play</Text>
        <Text style={styles.progress}>{page + 1} / {RULES.length}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        snapToInterval={stride}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        {RULES.map(([n, title, copy]) => (
          <View key={n} style={[styles.card, { width: cardWidth }]}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{n}</Text>
            </View>
            <View style={styles.illustration}>
              <View style={styles.outerSquare} />
              <View style={styles.innerSquare} />
              <Text style={styles.illustrationMark}>{Number(n) % 2 ? '●  ●  ●' : '◆  ◆  ◆'}</Text>
            </View>
            <Text style={styles.ruleTitle}>{title}</Text>
            <Text style={styles.copy}>{copy}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {RULES.map(([n], i) => (
          <Pressable key={n} accessibilityLabel={`Go to step ${i + 1}`} hitSlop={8} onPress={() => goToPage(i)}>
            <View style={[styles.dot, i === page && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
        >
          <Text style={styles.nextButtonText}>{isLast ? 'Got it' : 'Next'}</Text>
          {!isLast && <ChevronRight color={T.background} size={17} strokeWidth={2.5} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },

  top: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceSoft, borderWidth: 1, borderColor: T.border },
  title: { flex: 1, color: T.text, fontFamily: FONTS.heading, fontSize: 22 },
  progress: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 12.5, letterSpacing: 0.4 },

  content: { paddingHorizontal: 20, gap: 12 },
  card: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, borderRadius: 26, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  number: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.p1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  numberText: { color: T.background, fontFamily: FONTS.bodyBold, fontSize: 14 },
  illustration: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginVertical: 22 },
  outerSquare: { position: 'absolute', width: 164, height: 164, borderWidth: 2, borderColor: T.boardLine },
  innerSquare: { position: 'absolute', width: 92, height: 92, borderWidth: 2, borderColor: T.boardLine },
  illustrationMark: { color: T.p1, fontSize: 20, letterSpacing: 7 },
  ruleTitle: { color: T.text, fontFamily: FONTS.heading, fontSize: 23, textAlign: 'center' },
  copy: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 14.5, lineHeight: 21, marginTop: 10, textAlign: 'center' },

  dots: { height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.border },
  dotActive: { width: 18, backgroundColor: T.p1 },

  footer: { paddingHorizontal: 20, paddingTop: 4 },
  nextButton: { height: 52, borderRadius: 16, backgroundColor: T.p1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: T.p1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14 },
  nextButtonPressed: { opacity: 0.85 },
  nextButtonText: { color: T.background, fontFamily: FONTS.bodyBold, fontSize: 15.5, letterSpacing: 0.3 },
});
