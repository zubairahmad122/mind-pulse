import { render } from '@testing-library/react-native';
import { createInitialGame, placePiece } from '@/engine/core/games/mills';
import { MillsPlayerStatus } from '../MillsPlayerStatus';

describe('MillsPlayerStatus', () => {
  test('shows authoritative counts and the active player', () => {
    const state = placePiece(createInitialGame({ playerNames: { P1: 'Avery', P2: 'Blake' } }), 'a7');
    const view = render(<MillsPlayerStatus state={state} />);

    expect(view.getByLabelText(/Avery, waiting, 1 pieces on board/)).toBeTruthy();
    expect(view.getByLabelText(/Blake, active turn, 0 pieces on board/)).toBeTruthy();
    expect(view.getByText('YOUR TURN')).toBeTruthy();
    expect(view.getByText('8')).toBeTruthy();
    expect(view.getByText('9')).toBeTruthy();
    expect(view.getAllByText('TO PLACE')).toHaveLength(2);
    expect(view.getAllByText('Captured 0')).toHaveLength(2);
  });
});
