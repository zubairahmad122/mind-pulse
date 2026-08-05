import { createCameraShake } from '../fx/cameraShake';
import { createParticleSystem } from '../fx/particles';
import { createPopupSystem } from '../fx/popups';
import { createRenderFrame } from '../render/renderFrame';
import { createSeededRandom } from '../rng';

describe('createParticleSystem', () => {
  const rng = () => createSeededRandom(0xbeef);

  it('spawns and expires particles', () => {
    const p = createParticleSystem({ capacity: 64, rng: rng() });
    p.burst({ x: 0, y: 0, count: 10, lifeMs: 100 });
    expect(p.alive).toBe(10);
    p.step(200);
    expect(p.alive).toBe(0);
  });

  it('never exceeds capacity', () => {
    const p = createParticleSystem({ capacity: 8, rng: rng() });
    p.burst({ x: 0, y: 0, count: 50 });
    expect(p.alive).toBeLessThanOrEqual(8);
  });

  it('scales a burst by the budget', () => {
    const p = createParticleSystem({ capacity: 64, rng: rng(), budgetScale: 0.5 });
    p.burst({ x: 0, y: 0, count: 20 });
    expect(p.alive).toBe(10);
  });

  it('is deterministic under a fixed seed', () => {
    const run = () => {
      const p = createParticleSystem({ capacity: 32, rng: createSeededRandom(7) });
      p.burst({ x: 50, y: 50, count: 12 });
      p.step(50);
      const frame = createRenderFrame(64);
      p.writeTo(frame);
      return frame.nodes.slice(0, frame.nodeCount).map(n => `${n.x.toFixed(4)},${n.y.toFixed(4)}`);
    };
    expect(run()).toEqual(run());
  });

  it('writes fading nodes into the frame', () => {
    const p = createParticleSystem({ capacity: 16, rng: rng() });
    p.burst({ x: 10, y: 10, count: 4, lifeMs: 1000 });
    p.step(500);
    const frame = createRenderFrame(16);
    p.writeTo(frame);
    expect(frame.nodeCount).toBe(4);
    for (let i = 0; i < frame.nodeCount; i++) {
      expect(frame.nodes[i].a).toBeGreaterThan(0);
      expect(frame.nodes[i].a).toBeLessThan(1);
    }
  });

  it('clear removes everything', () => {
    const p = createParticleSystem({ capacity: 16, rng: rng() });
    p.burst({ x: 0, y: 0, count: 8 });
    p.clear();
    expect(p.alive).toBe(0);
  });
});

describe('createCameraShake', () => {
  it('decays to rest', () => {
    const shake = createCameraShake();
    shake.kick(1, 200);
    shake.step(16);
    expect(Math.abs(shake.offsetX) + Math.abs(shake.offsetY)).toBeGreaterThan(0);
    shake.step(300);
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
    expect(shake.active).toBe(false);
  });

  it('stays within the configured amplitude', () => {
    const shake = createCameraShake({ maxAmplitudePx: 10 });
    shake.kick(1, 500);
    for (let i = 0; i < 30; i++) {
      shake.step(16);
      expect(Math.abs(shake.offsetX)).toBeLessThanOrEqual(10.0001);
      expect(Math.abs(shake.offsetY)).toBeLessThanOrEqual(10.0001);
    }
  });

  it('takes the stronger of two stacked kicks rather than summing', () => {
    const strong = createCameraShake({ maxAmplitudePx: 10 });
    strong.kick(1, 300);
    strong.step(16);
    const strongPeak = Math.abs(strong.offsetX);

    const stacked = createCameraShake({ maxAmplitudePx: 10 });
    stacked.kick(1, 300);
    stacked.kick(0.3, 300);
    stacked.step(16);
    expect(Math.abs(stacked.offsetX)).toBeCloseTo(strongPeak, 5);
  });

  it('is deterministic', () => {
    const run = () => {
      const s = createCameraShake();
      s.kick(0.8, 300);
      const out: number[] = [];
      for (let i = 0; i < 10; i++) { s.step(16); out.push(s.offsetX, s.offsetY); }
      return out;
    };
    expect(run()).toEqual(run());
  });
});

describe('createPopupSystem', () => {
  it('adds, rises and expires', () => {
    const p = createPopupSystem({ capacity: 4 });
    p.add({ x: 0, y: 100, text: '+100' });
    expect(p.alive).toBe(1);
    p.step(300);
    const item = p.items.find(i => i.active)!;
    expect(item.drawY).toBeLessThan(100);
    p.step(1000);
    expect(p.alive).toBe(0);
  });

  it('holds full opacity before fading', () => {
    const p = createPopupSystem({ capacity: 2 });
    p.add({ x: 0, y: 0, text: 'MISS', lifeMs: 1000 });
    p.step(300);
    expect(p.items.find(i => i.active)!.a).toBe(1);
    p.step(500);
    expect(p.items.find(i => i.active)!.a).toBeLessThan(1);
  });

  it('overwrites the oldest when full instead of dropping the newest', () => {
    const p = createPopupSystem({ capacity: 2 });
    p.add({ x: 0, y: 0, text: 'first' });
    p.step(100);
    p.add({ x: 0, y: 0, text: 'second' });
    p.add({ x: 0, y: 0, text: 'third' });
    const texts = p.items.filter(i => i.active).map(i => i.text);
    expect(texts).toContain('third');
    expect(texts).not.toContain('first');
    expect(p.alive).toBe(2);
  });

  it('flattens travel under reduced motion but keeps the popup', () => {
    const p = createPopupSystem({ capacity: 2, motionScale: 0 });
    p.add({ x: 0, y: 50, text: '+10' });
    p.step(300);
    const item = p.items.find(i => i.active)!;
    expect(item.drawY).toBe(50);
    expect(item.text).toBe('+10');
  });
});
