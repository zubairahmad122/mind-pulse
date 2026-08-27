import { fireEvent, render } from '@testing-library/react-native';
import { CandidateTile } from '../GamePresentation';
import { generatePattern } from '@/engine/core/games/patternShift';

jest.mock('react-native-reanimated', () => {
  // Jest's factory is hoisted, so the native view must be loaded inside it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { cubic: jest.fn(), out: jest.fn(value => value) },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_delay: number, value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
  };
});
jest.mock('../PatternGlyphView', () => ({
  PatternGlyphView: () => null,
}));

describe('Pattern Shift answer controls', () => {
  const glyph = generatePattern(731, 5);

  it('submits immediately when an idle candidate is tapped', () => {
    const onPress = jest.fn();
    const view = render(<CandidateTile glyph={glyph} size={120} state="idle" reducedMotion index={0} onPress={onPress} />);
    const option = view.getByRole('button', { name: 'Pattern option 1' });

    expect(option.props.accessibilityState).toEqual({ disabled: false });
    fireEvent.press(option);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('locks resolved candidates from further input', () => {
    const onPress = jest.fn();
    const view = render(<CandidateTile glyph={glyph} size={120} state="incorrect" reducedMotion index={0} onPress={onPress} />);
    const option = view.getByRole('button', { name: 'Pattern option 1' });

    expect(option.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(option);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('marks the revealed correct option as locked', () => {
    const onPress = jest.fn();
    const view = render(<CandidateTile glyph={glyph} size={120} state="revealedCorrect" reducedMotion index={1} onPress={onPress} />);
    const option = view.getByRole('button', { name: 'Pattern option 2' });

    expect(option.props.accessibilityState).toEqual({ disabled: true });
  });
});
