import type { SharedValue } from 'react-native-reanimated';
import type { PopupSystem } from '../../core/fx/popups';
import type { RenderFrame } from '../../core/render/renderFrame';
import type { RendererAdapter, RendererCapabilities, SurfaceInfo } from '../../core/render/rendererAdapter';
import { HEADER_LENGTH, NODE_STRIDE, packedLength, packFrame } from './frameBuffer';

/** One popup as the UI thread sees it. Built on the JS thread when the
 *  popup is created, so nothing here allocates per frame except the array. */
export interface PackedPopup {
  text: string;
  x: number;
  y: number;
  opacity: number;
  size: number;
  color: Float32Array;
}

export interface Skia2DRendererOptions {
  /** Max nodes per frame — must match the canvas's atlas capacity. */
  capacity: number;
  /** Receives the packed scene, reassigned once per frame. */
  packed: SharedValue<Float32Array>;
  /** Receives popup text. Separate because glyphs can't ride in a
   *  Float32Array and can't be drawn by the atlas. */
  popups: SharedValue<PackedPopup[]>;
  popupCapacity?: number;
}

/**
 * The Skia implementation of `RendererAdapter`.
 *
 * **Every publish must hand Reanimated a brand-new array instance.**
 *
 * This is not a style choice, it is the transport's hard constraint, and
 * getting it wrong produces the single nastiest bug this engine has hit.
 * Reanimated caches an object's shareable clone keyed by *JS object
 * identity*. A recycled buffer — mutated in place and re-assigned — is a
 * cache hit, so the UI thread keeps receiving the clone captured the first
 * time that instance was seen and silently ignores every later mutation.
 *
 * The original implementation here pooled two buffers and alternated them,
 * specifically so the assigned reference would always differ from the
 * previous one. That defeated nothing: it just cycled between two poisoned
 * cache entries, and the canvas froze on frame two while the game loop,
 * the packing, and every performance metric carried on looking perfectly
 * healthy. Adding more pooled buffers would only postpone the freeze.
 *
 * So `publish` allocates. `staging` is still reused for the packing work,
 * but what crosses the boundary is a fresh `slice()` sized to the live node
 * count — roughly 5KB for a 150-node scene rather than the full capacity.
 * If that allocation ever shows up as measurable GC jitter, the fix is to
 * move packing onto the UI thread, **not** to reintroduce pooling here.
 */
export class Skia2DRenderer implements RendererAdapter {
  readonly id = 'skia-2d';
  readonly capabilities: RendererCapabilities;

  /** Scratch space for packing. Never handed to Reanimated directly. */
  private readonly staging: Float32Array;
  private readonly packed: SharedValue<Float32Array>;
  private readonly popupsValue: SharedValue<PackedPopup[]>;
  private readonly popupCapacity: number;
  private surface: SurfaceInfo = { width: 0, height: 0, pixelRatio: 1 };
  private mounted = false;

  /** Nodes dropped by the last publish because capacity was reached. */
  lastOverflow = 0;
  lastNodeCount = 0;
  /** Diagnostic: how many times the scene actually crossed to the UI thread. */
  publishCount = 0;

  constructor(options: Skia2DRendererOptions) {
    const { capacity, packed, popups } = options;
    this.capabilities = { dimensions: '2d', maxNodes: capacity, supportsText: true };
    this.packed = packed;
    this.popupsValue = popups;
    this.popupCapacity = options.popupCapacity ?? 12;
    this.staging = new Float32Array(packedLength(capacity));
  }

  mount(surface: SurfaceInfo): void {
    this.surface = surface;
    this.mounted = true;
  }

  resize(surface: SurfaceInfo): void {
    this.surface = surface;
  }

  publish(frame: RenderFrame): void {
    if (!this.mounted) return;

    this.lastNodeCount = packFrame(frame, this.staging);
    this.lastOverflow = frame.overflow;

    // The one boundary crossing per frame. `slice` is load-bearing: it is
    // what gives Reanimated an identity it has never seen, and it trims the
    // copy to the live nodes so an empty scene costs almost nothing.
    this.packed.value = this.staging.slice(
      0,
      HEADER_LENGTH + this.lastNodeCount * NODE_STRIDE,
    );
    this.publishCount++;
  }

  /** Publishes popup text. Called only when the popup set changes shape;
   *  positions travel with it, so this is at most a few times a second. */
  publishPopups(popups: PopupSystem): void {
    if (!this.mounted) return;
    const out: PackedPopup[] = [];
    const items = popups.items;
    for (let i = 0; i < items.length && out.length < this.popupCapacity; i++) {
      const p = items[i];
      if (!p.active) continue;
      out.push({
        text: p.text,
        x: p.x,
        y: p.drawY,
        opacity: p.a,
        size: p.sizePx,
        color: Float32Array.of(p.r, p.g, p.b, 1),
      });
    }
    this.popupsValue.value = out;
  }

  getSurface(): SurfaceInfo {
    return this.surface;
  }

  unmount(): void {
    this.mounted = false;
    this.staging.fill(0);
    // A fresh empty array, for the same identity reason as `publish`.
    this.packed.value = new Float32Array(HEADER_LENGTH);
    this.popupsValue.value = [];
  }
}
