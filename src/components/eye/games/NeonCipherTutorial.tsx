import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { createSeededRandom } from '@/utils/seededRandom';
import { generateRound } from '@/utils/neonCipherEngine';
import { NeonCipherGrid } from './NeonCipherGrid';
import { NeonCipherSymbolGlyph } from './NeonCipherSymbol';

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_PREVIEW_MS = 2500;
// Fixed seed — the tutorial round is intentionally the same every time,
// not part of session randomness.
const TUTORIAL_ROUND = generateRound(createSeededRandom(1), 'gentle', 0);

type TutorialPhase = 'preview' | 'field' | 'done';

/**
 * A short, skippable first round that teaches the loop: see the target,
 * then find it in the grid. Skip state persists so it doesn't repeat every
 * session — the caller (NeonCipher.tsx) owns that persistence and only
 * mounts this when it should actually show.
 */
export function NeonCipherTutorial({ onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<TutorialPhase>('preview');

  useEffect(() => {
    if (phase !== 'preview') return;
    const t = setTimeout(() => setPhase('field'), TUTORIAL_PREVIEW_MS);
    return () => clearTimeout(t);
  }, [phase]);

  function handleTap(index: number) {
    if (phase !== 'field') return;
    if (index === TUTORIAL_ROUND.targetIndexes[0]) setPhase('done');
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onSkip} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip tutorial">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {phase === 'preview' && (
        <View style={styles.center}>
          <Text style={styles.instruction}>This is your target</Text>
          <View style={styles.targetPreview}>
            <NeonCipherSymbolGlyph spec={TUTORIAL_ROUND.sequence[0]} size={120} state="correct" />
          </View>
          <Text style={styles.hint}>Remember its shape</Text>
        </View>
      )}

      {phase === 'field' && (
        <View style={styles.fieldWrap}>
          <Text style={styles.instruction}>Find it in the grid</Text>
          <NeonCipherGrid
            cells={TUTORIAL_ROUND.grid}
            gridSize={3}
            onTapCell={handleTap}
          />
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.instruction}>Nice — that&apos;s the idea</Text>
          <Text style={styles.hint}>Rounds get more challenging as you go</Text>
          <View style={styles.startBtn}>
            <GradientCTA label="Start" onPress={onComplete} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  skip: { alignSelf: 'flex-end', padding: spacing.md, minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: FONTS.bodySemi, fontSize: 14, color: colors.text.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  fieldWrap: { flex: 1, alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  instruction: { fontFamily: FONTS.headingSemi, fontSize: 18, color: '#FFFFFF' },
  hint: { fontFamily: FONTS.body, fontSize: 14, color: colors.text.secondary },
  targetPreview: {
    width: 160, height: 160, borderRadius: 24,
    backgroundColor: PILLAR_COLORS.eye + '14',
    borderWidth: 1, borderColor: PILLAR_COLORS.eye + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  startBtn: { marginTop: spacing.md, width: '100%' },
});
