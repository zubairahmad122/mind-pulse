import { createRenderFrame } from '../render/renderFrame';
import { nullRenderer } from '../render/rendererAdapter';
import { createPerfSampler } from '../diagnostics/perfSampler';

describe('createRenderFrame', () => {
  it('hands out nodes up to capacity then reports overflow', () => {
    const frame = createRenderFrame(3);
    expect(frame.push()).not.toBeNull();
    expect(frame.push()).not.toBeNull();
    expect(frame.push()).not.toBeNull();
    expect(frame.push()).toBeNull();
    expect(frame.nodeCount).toBe(3);
    expect(frame.overflow).toBe(1);
  });

  it('recycles the same node objects across frames', () => {
    const frame = createRenderFrame(2);
    const first = frame.push();
    frame.reset();
    const second = frame.push();
    // Identity equality is the point: a frame must not allocate.
    expect(second).toBe(first);
  });

  it('reset clears the count, overflow and camera', () => {
    const frame = createRenderFrame(1);
    frame.push();
    frame.push();
    frame.camera.shakeX = 12;
    frame.reset();
    expect(frame.nodeCount).toBe(0);
    expect(frame.overflow).toBe(0);
    expect(frame.camera.shakeX).toBe(0);
    expect(frame.camera.zoom).toBe(1);
  });
});

describe('nullRenderer', () => {
  it('satisfies the adapter contract without a surface', () => {
    const frame = createRenderFrame(1);
    expect(() => {
      nullRenderer.mount({ width: 100, height: 100, pixelRatio: 2 });
      nullRenderer.publish(frame);
      nullRenderer.unmount();
    }).not.toThrow();
    expect(nullRenderer.capabilities.dimensions).toBe('2d');
  });
});

describe('createPerfSampler', () => {
  it('reports a median close to the steady frame rate', () => {
    const perf = createPerfSampler(60);
    for (let i = 0; i < 60; i++) perf.frame(1000 / 60, 1);
    expect(perf.snapshot().fpsMedian).toBeGreaterThanOrEqual(59);
  });

  it('separates the p5 from the median when frames are spiky', () => {
    const perf = createPerfSampler(100);
    for (let i = 0; i < 90; i++) perf.frame(16.6, 1);
    for (let i = 0; i < 10; i++) perf.frame(120, 7);
    const s = perf.snapshot();
    // An average would hide this; the low percentile is the whole point.
    expect(s.fpsMedian).toBeGreaterThan(55);
    expect(s.fpsP5).toBeLessThan(20);
  });

  it('counts long and stalling frames separately', () => {
    const perf = createPerfSampler(20);
    perf.frame(16, 1);
    perf.frame(40, 2);
    perf.frame(150, 5);
    const s = perf.snapshot();
    expect(s.longFrames).toBe(2);
    expect(s.stallFrames).toBe(1);
    expect(s.worstFrameMs).toBeCloseTo(150);
    expect(s.totalFrames).toBe(3);
  });

  it('reports the tail as a p95 frame time, not a percentile FPS', () => {
    const perf = createPerfSampler(100);
    for (let i = 0; i < 95; i++) perf.frame(16.6, 1);
    for (let i = 0; i < 5; i++) perf.frame(50, 3);
    const s = perf.snapshot();
    // 95% of frames were <= this; the slow tail sits just above it.
    expect(s.p95FrameMs).toBeGreaterThanOrEqual(16.6);
    expect(s.p95FrameMs).toBeLessThanOrEqual(50);
    expect(s.worstFrameMs).toBeCloseTo(50);
  });

  it('reports long frames as a percentage of all frames', () => {
    const perf = createPerfSampler(200);
    for (let i = 0; i < 99; i++) perf.frame(16, 1);
    perf.frame(40, 2);
    expect(perf.snapshot().longFramePct).toBeCloseTo(1, 5);
  });

  it('p95 and percentages survive an empty window', () => {
    const s = createPerfSampler(10).snapshot();
    expect(s.p95FrameMs).toBe(0);
    expect(s.longFramePct).toBe(0);
    expect(s.totalFrames).toBe(0);
  });

  it('tracks scene counts and overflow', () => {
    const perf = createPerfSampler(10);
    perf.frame(16, 1);
    perf.counts(150, 300, 450, 7);
    const s = perf.snapshot();
    expect(s.entityCount).toBe(150);
    expect(s.particleCount).toBe(300);
    expect(s.nodeCount).toBe(450);
    expect(s.overflow).toBe(7);
  });

  it('handles an empty window without dividing by zero', () => {
    const s = createPerfSampler(10).snapshot();
    expect(s.fpsMedian).toBe(0);
    expect(s.samples).toBe(0);
  });

  it('reset clears the window', () => {
    const perf = createPerfSampler(10);
    for (let i = 0; i < 10; i++) perf.frame(200, 5);
    perf.reset();
    expect(perf.snapshot().longFrames).toBe(0);
    expect(perf.snapshot().samples).toBe(0);
  });
});
