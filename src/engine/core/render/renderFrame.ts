import type { SpriteId } from '../types';

/**
 * The engine → renderer handoff.
 *
 * The engine never knows what draws it. Once per display frame it fills a
 * flat list of draw nodes; an adapter turns that into Skia primitives (or,
 * later, three.js meshes) without a single line of engine code changing.
 *
 * Nodes are **pooled and mutated in place**. `push()` hands back a recycled
 * node to overwrite rather than a fresh object, so building a 450-node frame
 * 60 times a second allocates nothing. The trade-off is that a frame is only
 * valid until the next `reset()` — adapters must consume it immediately and
 * never retain a reference.
 */
export interface RenderNode {
  x: number;
  y: number;
  rotation: number;
  /** Diameter in px for disc/ring/square sprites. */
  size: number;
  sprite: SpriteId;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface CameraState {
  shakeX: number;
  shakeY: number;
  zoom: number;
}

export interface RenderFrame {
  readonly camera: CameraState;
  readonly nodes: readonly RenderNode[];
  readonly nodeCount: number;
  readonly capacity: number;
  /** Nodes dropped this frame because capacity was reached. Surfaced by the
   *  benchmark so an over-budget effect is visible, not silently truncated. */
  readonly overflow: number;

  reset(): void;
  /** Next writable node, or null when the frame is full. */
  push(): RenderNode | null;
}

export function createRenderFrame(capacity: number): RenderFrame {
  const nodes: RenderNode[] = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    nodes[i] = { x: 0, y: 0, rotation: 0, size: 0, sprite: 1, r: 1, g: 1, b: 1, a: 1 };
  }

  const camera: CameraState = { shakeX: 0, shakeY: 0, zoom: 1 };
  let count = 0;
  let overflow = 0;

  return {
    camera,
    nodes,
    capacity,
    get nodeCount() { return count; },
    get overflow() { return overflow; },

    reset() {
      count = 0;
      overflow = 0;
      camera.shakeX = 0;
      camera.shakeY = 0;
      camera.zoom = 1;
    },

    push() {
      if (count >= capacity) {
        overflow++;
        return null;
      }
      return nodes[count++];
    },
  };
}
