import type { RenderFrame } from '../../core/render/renderFrame';

/**
 * Packs a `RenderFrame` into one flat `Float32Array` for the UI thread.
 *
 * This is the single most performance-sensitive decision in the runtime. The
 * JS thread and Reanimated's UI thread are separate JS runtimes — a plain
 * object is not shared between them, so state must be *assigned* to a shared
 * value to cross over.
 *
 * The naive version writes one shared value per animated property and pays a
 * boundary crossing for each. At 150 entities that is hundreds of crossings
 * per frame, and it is the classic way a Skia game ends up at 20fps. Instead
 * the entire frame — camera and every node — is packed into a single typed
 * array and assigned **once per frame**, one crossing total.
 *
 * Node count rides in the header rather than in a second shared value, so
 * the count can never disagree with the data it describes (which would show
 * up as a flickering ghost entity on the last row).
 *
 * Layout:
 *   [0] nodeCount   [1] cameraShakeX   [2] cameraShakeY   [3] cameraZoom
 *   then, per node: x, y, rotation, size, sprite, r, g, b, a
 */
export const HEADER_LENGTH = 4;
export const NODE_STRIDE = 9;

/** Byte size of the packed buffer for a given node capacity. */
export function packedLength(capacity: number): number {
  return HEADER_LENGTH + capacity * NODE_STRIDE;
}

/**
 * Writes `frame` into `target`. Returns the number of nodes actually packed,
 * which is clamped to whatever `target` can hold — a short buffer truncates
 * rather than throwing, because dropping the tail of a particle burst is
 * always better than crashing a live session.
 */
export function packFrame(frame: RenderFrame, target: Float32Array): number {
  const capacity = Math.floor((target.length - HEADER_LENGTH) / NODE_STRIDE);
  const count = Math.min(frame.nodeCount, Math.max(0, capacity));

  target[0] = count;
  target[1] = frame.camera.shakeX;
  target[2] = frame.camera.shakeY;
  target[3] = frame.camera.zoom;

  const nodes = frame.nodes;
  for (let i = 0; i < count; i++) {
    const n = nodes[i];
    const o = HEADER_LENGTH + i * NODE_STRIDE;
    target[o] = n.x;
    target[o + 1] = n.y;
    target[o + 2] = n.rotation;
    target[o + 3] = n.size;
    target[o + 4] = n.sprite;
    target[o + 5] = n.r;
    target[o + 6] = n.g;
    target[o + 7] = n.b;
    target[o + 8] = n.a;
  }

  return count;
}
