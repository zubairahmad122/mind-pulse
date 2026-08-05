import { createRuntimeLifecycle } from '../lifecycle/runtimeLifecycle';

describe('createRuntimeLifecycle', () => {
  it('starts idle and moves to running', () => {
    const lc = createRuntimeLifecycle();
    expect(lc.phase).toBe('idle');
    lc.start();
    expect(lc.phase).toBe('running');
  });

  it('does not accumulate active time while paused', () => {
    const lc = createRuntimeLifecycle();
    lc.start();
    lc.tick(1000);
    lc.pause('background');
    // Ticks arriving during a pause (a late frame, a stray timer) must be
    // ignored — backgrounded time can never count toward a session.
    lc.tick(5000);
    lc.resume();
    lc.tick(500);
    expect(lc.activeMs).toBe(1500);
  });

  it('never auto-resumes from background', () => {
    const lc = createRuntimeLifecycle();
    lc.start();
    lc.pause('background');
    expect(lc.phase).toBe('paused');
    expect(lc.lastPauseReason).toBe('background');
    // Only an explicit resume() leaves the paused state.
    expect(lc.phase).toBe('paused');
  });

  it('ignores pause when not running and resume when not paused', () => {
    const lc = createRuntimeLifecycle();
    lc.pause('user');
    expect(lc.phase).toBe('idle');
    lc.start();
    lc.resume();
    expect(lc.phase).toBe('running');
  });

  it('treats ended as terminal so a late callback cannot restart it', () => {
    const lc = createRuntimeLifecycle();
    lc.start();
    lc.end('completed');
    lc.start();
    lc.resume();
    expect(lc.phase).toBe('ended');
    expect(lc.endReason).toBe('completed');
  });

  it('keeps the first end reason', () => {
    const lc = createRuntimeLifecycle();
    lc.start();
    lc.end('completed');
    lc.end('quit');
    expect(lc.endReason).toBe('completed');
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const lc = createRuntimeLifecycle();
    const seen: string[] = [];
    const off = lc.onChange(p => seen.push(p));
    lc.start();
    lc.pause('user');
    off();
    lc.resume();
    expect(seen).toEqual(['running', 'paused']);
  });

  it('reset returns to a clean idle session', () => {
    const lc = createRuntimeLifecycle();
    lc.start();
    lc.tick(1234);
    lc.end('quit');
    lc.reset();
    expect(lc.phase).toBe('idle');
    expect(lc.activeMs).toBe(0);
    expect(lc.endReason).toBeNull();
  });
});
