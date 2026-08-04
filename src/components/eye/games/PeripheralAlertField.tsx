import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PILLAR_COLORS, STATUS_COLORS } from '@/constants/designSystem';
import { PERIPHERAL_POSITION_COUNT } from '@/utils/peripheralAlertEngine';

const EYE = PILLAR_COLORS.eye;
const FIELD_SIZE = 280;
const NODE_SIZE = 52;
const RADIUS = FIELD_SIZE / 2 - NODE_SIZE / 2 - 4;

export type PeripheralNodeState = 'idle' | 'correct' | 'wrong';

interface Props {
  threatPosition: number;
  falseAlertPositions: number[];
  disabled?: boolean;
  onTapPosition: (position: number) => void;
  nodeStates?: Record<number, PeripheralNodeState>;
  highContrast?: boolean;
}

/**
 * Peripheral Alert's field — a static central "mission core" (decorative
 * framing only; this does not detect where the player is looking) with
 * eight fixed edge positions. The real threat renders as a filled disc; a
 * false alert (from the round where they start appearing) renders as a
 * hollow ring instead — a shape difference, not a color one, so the two
 * are distinguishable without relying on color.
 */
export function PeripheralAlertField({
  threatPosition,
  falseAlertPositions,
  disabled = false,
  onTapPosition,
  nodeStates,
  highContrast = false,
}: Props) {
  const positions = Array.from({ length: PERIPHERAL_POSITION_COUNT }, (_, i) => i);

  return (
    <View style={styles.field}>
      <View style={styles.core}>
        <View style={styles.coreInner} />
      </View>

      {positions.map(pos => {
        const isThreat = pos === threatPosition;
        const isFalseAlert = falseAlertPositions.includes(pos);
        if (!isThreat && !isFalseAlert) return null;

        const angle = (pos / PERIPHERAL_POSITION_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = FIELD_SIZE / 2 + RADIUS * Math.cos(angle) - NODE_SIZE / 2;
        const y = FIELD_SIZE / 2 + RADIUS * Math.sin(angle) - NODE_SIZE / 2;
        const state = nodeStates?.[pos] ?? 'idle';

        return (
          <TouchableOpacity
            key={pos}
            accessibilityRole="button"
            accessibilityLabel={isThreat ? 'Real signal' : 'False alert — do not tap'}
            disabled={disabled}
            activeOpacity={0.75}
            onPress={() => onTapPosition(pos)}
            style={[styles.node, { left: x, top: y }]}
          >
            <View
              style={[
                isFalseAlert ? styles.ringShape : styles.filledShape,
                state === 'correct' && styles.correctState,
                state === 'wrong' && styles.wrongState,
                highContrast && styles.highContrastShape,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: FIELD_SIZE, height: FIELD_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  core: {
    position: 'absolute', top: FIELD_SIZE / 2 - 26, left: FIELD_SIZE / 2 - 26,
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1, borderColor: EYE + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  coreInner: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: EYE, opacity: 0.85,
  },
  node: {
    position: 'absolute', width: NODE_SIZE, height: NODE_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  filledShape: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: EYE,
  },
  ringShape: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 3, borderColor: 'rgba(233,240,255,0.6)',
    backgroundColor: 'transparent',
  },
  highContrastShape: { borderColor: '#FFFFFF' },
  correctState: { backgroundColor: EYE, borderColor: EYE },
  wrongState: { backgroundColor: STATUS_COLORS.error, borderColor: STATUS_COLORS.error },
});
