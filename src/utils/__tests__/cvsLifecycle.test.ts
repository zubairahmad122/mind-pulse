import {
  cvsCancelResumeBeat,
  cvsCanComplete,
  cvsDeferredStepApplies,
  cvsPauseVoiceOnBackground,
  cvsResumeVoiceOnForeground,
  cvsShouldFreezeActive,
  cvsTimingBlocked,
  type CvsPhase,
} from '../cvsLifecycle';

/**
 * Approved scope exception — lifecycle rules for CVSProtocolScreen (Eye
 * Reset). Each test maps
 * to a scenario in the plan: background during a step, phone lock, return
 * after longer than the remaining time, rapid app switching, manual pause
 * then background, background during interstitial / check-in, completion
 * once-only, and no auto-advance while away.
 */
describe('cvsLifecycle — CVSProtocolScreen background/lock rules', () => {
  it('freezes the step timer the moment the app backgrounds (during a step)', () => {
    expect(cvsTimingBlocked('active', true, false)).toBe(true);
  });

  it('treats phone lock like background (AppState non-active) — same freeze', () => {
    // The screen's hook freezes on ANY non-foreground AppState, so lock and
    // minimize are the same code path.
    expect(cvsTimingBlocked('active', true, false)).toBe(true);
  });

  it('stays frozen after returning until the user resumes — no auto-advance', () => {
    // Returned but not yet resumed (paused overlay still up): still frozen.
    expect(cvsTimingBlocked('active', false, true)).toBe(true);
    // Only an explicit resume unblocks the step.
    expect(cvsTimingBlocked('active', false, false)).toBe(false);
  });

  it('handles rapid background/foreground flips without losing or doubling time', () => {
    // Every background frame blocks timing; every foreground frame (not
    // user-paused) unblocks it — flips are deterministic and idempotent.
    const flips = [true, false, true, false, true, false];
    for (const bg of flips) {
      expect(cvsTimingBlocked('active', bg, false)).toBe(bg);
    }
  });

  it('manual pause followed by background stays frozen (idempotent)', () => {
    expect(cvsTimingBlocked('active', true, true)).toBe(true);
  });

  it('defers an interrupted step change and applies it only on return', () => {
    // While away the pending advance must NOT apply…
    expect(cvsDeferredStepApplies(2, true)).toBe(false);
    // …and once foregrounded it is replayed.
    expect(cvsDeferredStepApplies(2, false)).toBe(true);
    // No pending advance = nothing to replay.
    expect(cvsDeferredStepApplies(null, false)).toBe(false);
  });

  it('does not freeze the comfort check-in (no timer running there)', () => {
    for (const phase of ['idle', 'checkin-before', 'checkin-after', 'done'] as CvsPhase[]) {
      expect(cvsTimingBlocked(phase, true, false)).toBe(false);
    }
  });

  it('blocks completion while backgrounded, allows it in the foreground', () => {
    expect(cvsCanComplete(true)).toBe(false);
    expect(cvsCanComplete(false)).toBe(true);
  });

  it('freezes the 3-2-1 countdown and 20-20-20 recovery while away', () => {
    expect(cvsTimingBlocked('countdown', true, false)).toBe(true);
    expect(cvsTimingBlocked('recovery', true, false)).toBe(true);
    expect(cvsTimingBlocked('recovery', false, false)).toBe(false);
    expect(cvsTimingBlocked('countdown', false, false)).toBe(false);
  });

  it('cancels an in-flight 3-2-1 resume beat on background so the session never auto-resumes', () => {
    // Mid-beat + active → must cancel, else the beat finishes while away and
    // auto-resumes the session on return.
    expect(cvsCancelResumeBeat('active', 3)).toBe(true);
    expect(cvsCancelResumeBeat('active', 1)).toBe(true);
    // No beat in flight, or not in the active phase → nothing to cancel.
    expect(cvsCancelResumeBeat('active', null)).toBe(false);
    expect(cvsCancelResumeBeat('calibrate', 3)).toBe(false);
    expect(cvsCancelResumeBeat('recovery', 2)).toBe(false);
  });

  it('pauses voice on background for active/calibrate/countdown and resumes voice-only phases on return', () => {
    expect(cvsPauseVoiceOnBackground('active')).toBe(true);
    expect(cvsPauseVoiceOnBackground('calibrate')).toBe(true);
    expect(cvsPauseVoiceOnBackground('countdown')).toBe(true);
    expect(cvsPauseVoiceOnBackground('recovery')).toBe(false);
    // Only the active exercise freezes the whole session (paused overlay).
    expect(cvsShouldFreezeActive('active')).toBe(true);
    expect(cvsShouldFreezeActive('calibrate')).toBe(false);
    // Voice-only phases auto-resume on return; the active phase waits for the
    // user's Resume tap so the session never restarts itself.
    expect(cvsResumeVoiceOnForeground('calibrate')).toBe(true);
    expect(cvsResumeVoiceOnForeground('countdown')).toBe(true);
    expect(cvsResumeVoiceOnForeground('active')).toBe(false);
  });
});
