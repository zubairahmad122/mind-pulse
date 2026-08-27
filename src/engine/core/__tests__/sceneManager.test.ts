import { createSceneManager, type Scene } from '../scene/sceneManager';

interface Ctx {
  log: string[];
  stepsInB: number;
}

function scene(id: string, step: Scene<Ctx>['step']): Scene<Ctx> {
  return {
    id,
    enter: ctx => ctx.log.push(`enter:${id}`),
    exit: ctx => ctx.log.push(`exit:${id}`),
    step,
  };
}

describe('createSceneManager', () => {
  it('enters the first scene on goTo', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    sm.register(scene('a', () => {}));
    sm.goTo('a', ctx);
    expect(sm.activeId).toBe('a');
    expect(ctx.log).toEqual(['enter:a']);
  });

  it('exits the old scene before entering the new one', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    sm.register(scene('a', () => ({ type: 'replace', scene: 'b' })));
    sm.register(scene('b', () => {}));
    sm.goTo('a', ctx);
    sm.step(ctx, 16, 16);
    expect(ctx.log).toEqual(['enter:a', 'exit:a', 'enter:b']);
    expect(sm.activeId).toBe('b');
  });

  it('gives each scene its own clock', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    let lastElapsed = -1;
    sm.register(scene('a', (_c, _dt, elapsed) =>
      elapsed >= 50 ? { type: 'replace', scene: 'b' } : undefined,
    ));
    sm.register(scene('b', (_c, _dt, elapsed) => { lastElapsed = elapsed; }));
    sm.goTo('a', ctx);
    for (let i = 0; i < 4; i++) sm.step(ctx, 20, 0);
    // Scene b's clock restarts at its own transition, not the session's.
    expect(lastElapsed).toBeLessThan(50);
  });

  it('ends the session and stops stepping', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    let steps = 0;
    sm.register(scene('a', () => {
      steps++;
      return { type: 'end', reason: 'completed' };
    }));
    sm.goTo('a', ctx);
    sm.step(ctx, 16, 16);
    sm.step(ctx, 16, 32);
    expect(steps).toBe(1);
    expect(sm.ended).toBe(true);
    expect(sm.endReason).toBe('completed');
    expect(sm.activeId).toBeNull();
    expect(ctx.log).toContain('exit:a');
  });

  it('performs at most one transition per step', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    sm.register(scene('a', () => ({ type: 'replace', scene: 'b' })));
    sm.register(scene('b', () => ({ type: 'replace', scene: 'a' })));
    sm.goTo('a', ctx);
    // A transition loop must burn one step per hop, never hang the frame.
    sm.step(ctx, 16, 16);
    expect(sm.activeId).toBe('b');
  });

  it('rejects duplicate registration and unknown scenes', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    sm.register(scene('a', () => {}));
    expect(() => sm.register(scene('a', () => {}))).toThrow(/duplicate/);
    expect(() => sm.goTo('nope', ctx)).toThrow(/unknown scene/);
  });

  it('reset exits the active scene and clears end state', () => {
    const sm = createSceneManager<Ctx>();
    const ctx: Ctx = { log: [], stepsInB: 0 };
    sm.register(scene('a', () => ({ type: 'end', reason: 'quit' })));
    sm.goTo('a', ctx);
    sm.step(ctx, 16, 16);
    sm.reset(ctx);
    expect(sm.ended).toBe(false);
    expect(sm.endReason).toBeNull();
  });
});
