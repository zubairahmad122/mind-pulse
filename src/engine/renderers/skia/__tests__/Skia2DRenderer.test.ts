import { createRenderFrame } from '@/engine/core/render/renderFrame';
import { HEADER_LENGTH, NODE_STRIDE } from '../frameBuffer';
import { Skia2DRenderer } from '../Skia2DRenderer';
import type { PackedPopup } from '../Skia2DRenderer';

/**
 * Guards the one rule that froze the canvas on device: Reanimated caches a
 * shareable clone per JS object identity, so a recycled buffer re-assigned
 * to a shared value silently delivers stale data forever. Every publish must
 * therefore produce an array instance Reanimated has never seen.
 *
 * These assertions look pedantic. They are the only thing standing between
 * this engine and a bug whose symptom is "everything reports healthy and
 * nothing moves".
 */

/** Minimal stand-in for a Reanimated shared value. */
function fakeShared<T>(initial: T) {
  return { value: initial };
}

function rendererWith(capacity: number) {
  const packed = fakeShared<Float32Array>(new Float32Array(0));
  const popups = fakeShared<PackedPopup[]>([]);
  const renderer = new Skia2DRenderer({
    capacity,
    packed: packed as any,
    popups: popups as any,
  });
  renderer.mount({ width: 100, height: 100, pixelRatio: 1 });
  return { renderer, packed, popups };
}

function frameWith(count: number, xBase: number) {
  const frame = createRenderFrame(16);
  for (let i = 0; i < count; i++) {
    const n = frame.push()!;
    n.x = xBase + i;
    n.y = 5;
    n.size = 10;
    n.sprite = 1;
    n.a = 1;
  }
  return frame;
}

describe('Skia2DRenderer publish transport', () => {
  it('assigns a NEW array identity on every publish', () => {
    const { renderer, packed } = rendererWith(16);
    const seen: Float32Array[] = [];

    for (let i = 0; i < 5; i++) {
      renderer.publish(frameWith(3, i * 100));
      seen.push(packed.value);
    }

    // Any repeat here is the exact defect: Reanimated would hand the UI
    // thread the clone it cached the first time it saw that instance.
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        expect(seen[i]).not.toBe(seen[j]);
      }
    }
  });

  it('publishes the current frame contents, not a stale snapshot', () => {
    const { renderer, packed } = rendererWith(16);

    renderer.publish(frameWith(2, 10));
    const first = packed.value[HEADER_LENGTH];

    renderer.publish(frameWith(2, 900));
    const second = packed.value[HEADER_LENGTH];

    expect(first).toBe(10);
    expect(second).toBe(900);
  });

  it('trims the payload to the live node count', () => {
    const { renderer, packed } = rendererWith(200);
    renderer.publish(frameWith(3, 0));
    expect(packed.value.length).toBe(HEADER_LENGTH + 3 * NODE_STRIDE);
    expect(packed.value[0]).toBe(3);
  });

  it('publishes an empty scene without carrying stale nodes', () => {
    const { renderer, packed } = rendererWith(16);
    renderer.publish(frameWith(4, 0));
    renderer.publish(frameWith(0, 0));
    expect(packed.value[0]).toBe(0);
    expect(packed.value.length).toBe(HEADER_LENGTH);
  });

  it('ignores publishes before mount and after unmount', () => {
    const packed = fakeShared<Float32Array>(new Float32Array(0));
    const popups = fakeShared<PackedPopup[]>([]);
    const renderer = new Skia2DRenderer({
      capacity: 16,
        packed: packed as any,
        popups: popups as any,
    });

    renderer.publish(frameWith(2, 0));
    expect(renderer.publishCount).toBe(0);

    renderer.mount({ width: 10, height: 10, pixelRatio: 1 });
    renderer.publish(frameWith(2, 0));
    expect(renderer.publishCount).toBe(1);

    renderer.unmount();
    renderer.publish(frameWith(2, 0));
    expect(renderer.publishCount).toBe(1);
    // Unmount must also hand over a fresh empty identity, or the last live
    // frame would linger on the canvas after teardown.
    expect(packed.value.length).toBe(HEADER_LENGTH);
  });

  it('reports overflow from the frame', () => {
    const { renderer } = rendererWith(2);
    const frame = createRenderFrame(2);
    frame.push();
    frame.push();
    frame.push(); // overflows
    renderer.publish(frame);
    expect(renderer.lastOverflow).toBe(1);
    expect(renderer.lastNodeCount).toBe(2);
  });
});
