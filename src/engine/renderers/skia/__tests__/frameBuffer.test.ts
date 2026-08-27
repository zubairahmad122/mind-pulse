import { createRenderFrame } from '@/engine/core/render/renderFrame';
import { HEADER_LENGTH, NODE_STRIDE, packedLength, packFrame } from '../frameBuffer';

describe('packFrame', () => {
  it('writes the header and every node field', () => {
    const frame = createRenderFrame(4);
    frame.camera.shakeX = 3;
    frame.camera.shakeY = -4;
    frame.camera.zoom = 1.5;

    const node = frame.push()!;
    node.x = 100; node.y = 200; node.rotation = 0.5; node.size = 32;
    node.sprite = 2; node.r = 0.1; node.g = 0.2; node.b = 0.3; node.a = 0.4;

    const target = new Float32Array(packedLength(4));
    expect(packFrame(frame, target)).toBe(1);

    expect(target[0]).toBe(1);
    expect(target[1]).toBe(3);
    expect(target[2]).toBe(-4);
    expect(target[3]).toBe(1.5);

    const o = HEADER_LENGTH;
    expect(target[o]).toBe(100);
    expect(target[o + 1]).toBe(200);
    expect(target[o + 2]).toBeCloseTo(0.5);
    expect(target[o + 3]).toBe(32);
    expect(target[o + 4]).toBe(2);
    expect(target[o + 5]).toBeCloseTo(0.1);
    expect(target[o + 8]).toBeCloseTo(0.4);
  });

  it('lays nodes out at a fixed stride', () => {
    const frame = createRenderFrame(3);
    for (let i = 0; i < 3; i++) {
      const n = frame.push()!;
      n.x = i * 10;
    }
    const target = new Float32Array(packedLength(3));
    packFrame(frame, target);
    expect(target[HEADER_LENGTH]).toBe(0);
    expect(target[HEADER_LENGTH + NODE_STRIDE]).toBe(10);
    expect(target[HEADER_LENGTH + NODE_STRIDE * 2]).toBe(20);
  });

  it('truncates rather than throwing when the target is short', () => {
    const frame = createRenderFrame(10);
    for (let i = 0; i < 10; i++) frame.push();
    const target = new Float32Array(packedLength(4));
    // Dropping the tail of a burst is always better than crashing a session.
    expect(packFrame(frame, target)).toBe(4);
    expect(target[0]).toBe(4);
  });

  it('writes a zero count for an empty frame', () => {
    const frame = createRenderFrame(4);
    const target = new Float32Array(packedLength(4));
    expect(packFrame(frame, target)).toBe(0);
    expect(target[0]).toBe(0);
  });

  it('sizes the buffer as header plus stride per node', () => {
    expect(packedLength(0)).toBe(HEADER_LENGTH);
    expect(packedLength(10)).toBe(HEADER_LENGTH + 10 * NODE_STRIDE);
  });
});
