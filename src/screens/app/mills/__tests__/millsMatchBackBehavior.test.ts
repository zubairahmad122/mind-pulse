import { shouldPromptLeaveOnBack } from '../millsMatchBackLogic';

describe('shouldPromptLeaveOnBack', () => {
  test('opens the Leave Match prompt for an active, unfinished match with no modal open', () => {
    expect(shouldPromptLeaveOnBack({ paused: false, confirmOpen: false, matchCompleted: false })).toBe(true);
  });

  test('defers to the pause sheet\'s own back handling when it is open', () => {
    expect(shouldPromptLeaveOnBack({ paused: true, confirmOpen: false, matchCompleted: false })).toBe(false);
  });

  test('defers to the confirm dialog\'s own back handling when one is already open', () => {
    expect(shouldPromptLeaveOnBack({ paused: false, confirmOpen: true, matchCompleted: false })).toBe(false);
  });

  test('does not warn about losing an already-completed match', () => {
    expect(shouldPromptLeaveOnBack({ paused: false, confirmOpen: false, matchCompleted: true })).toBe(false);
  });

  test('never opens the prompt while another modal is already up, even on a finished match', () => {
    expect(shouldPromptLeaveOnBack({ paused: true, confirmOpen: false, matchCompleted: true })).toBe(false);
    expect(shouldPromptLeaveOnBack({ paused: false, confirmOpen: true, matchCompleted: true })).toBe(false);
  });
});
