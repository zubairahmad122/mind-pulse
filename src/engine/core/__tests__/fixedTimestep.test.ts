import { clampFrameDelta, FixedTimestep } from '../time/fixedTimestep';

describe('FixedTimestep', () => {
  it('runs exactly one step for a 60Hz frame', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(1000 / 60)).toBe(1);
  });

  it('runs two steps for a 30fps frame', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(1000 / 30)).toBe(2);
  });

  it('banks sub-step time instead of dropping it', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(7)).toBe(0);
    expect(ts.advance(7)).toBe(0);
    // 21ms banked across three 7ms frames finally clears one 16.67ms step.
    expect(ts.advance(7)).toBe(1);
  });

  it('caps steps per frame so a long stall cannot spiral', () => {
    const ts = new FixedTimestep({ maxStepsPerFrame: 5 });
    // 2 seconds of backlog would be 120 steps at 60Hz — one frame may only
    // ever consume the cap, no matter how much time is waiting.
    expect(ts.advance(2000)).toBe(5);
    expect(ts.advance(0)).toBe(5);
  });

  it('keeps the backlog bounded after a clamped frame', () => {
    const ts = new FixedTimestep({ maxStepsPerFrame: 5 });
    // 100ms is the most `clampFrameDelta` will ever let through: 6 steps'
    // worth, capped at 5, so one step stays banked.
    expect(ts.advance(100)).toBe(5);

    // The banked step does not compound. Over a second of normal frames the
    // simulation stays within a step of real time and the accumulator never
    // grows — that boundedness is the actual spiral-of-death guarantee.
    let steps = 0;
    for (let i = 0; i < 60; i++) steps += ts.advance(1000 / 60);
    expect(steps).toBeGreaterThanOrEqual(59);
    expect(steps).toBeLessThanOrEqual(61);
    expect(ts.state().accumulatorMs).toBeLessThan(2 * ts.stepMs);
  });

  it('reports interpolation alpha between 0 and 1', () => {
    const ts = new FixedTimestep();
    ts.advance(1000 / 60 / 2);
    expect(ts.alpha()).toBeGreaterThan(0.4);
    expect(ts.alpha()).toBeLessThan(0.6);
  });

  it('keeps simulated time identical across different frame rates', () => {
    const at60 = new FixedTimestep();
    const at30 = new FixedTimestep();
    let steps60 = 0;
    let steps30 = 0;
    // One second of wall time, delivered at two different frame rates.
    for (let i = 0; i < 60; i++) steps60 += at60.advance(1000 / 60);
    for (let i = 0; i < 30; i++) steps30 += at30.advance(1000 / 30);
    expect(steps60).toBe(steps30);
  });

  it('resets accumulated state', () => {
    const ts = new FixedTimestep();
    ts.advance(100);
    ts.reset();
    expect(ts.state()).toEqual({ stepsRun: 0, accumulatorMs: 0, lastFrameDeltaMs: 0 });
  });

  it('rejects invalid configuration and negative deltas', () => {
    expect(() => new FixedTimestep({ stepMs: 0 })).toThrow();
    expect(() => new FixedTimestep({ maxStepsPerFrame: 0 })).toThrow();
    expect(() => new FixedTimestep().advance(-1)).toThrow();
  });
});

describe('clampFrameDelta', () => {
  it('bounds a huge resume delta', () => {
    expect(clampFrameDelta(60_000)).toBe(100);
  });

  it('passes normal frames through and floors negatives', () => {
    expect(clampFrameDelta(16.67)).toBeCloseTo(16.67);
    expect(clampFrameDelta(-5)).toBe(0);
  });
});
