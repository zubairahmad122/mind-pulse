import type { RenderFrame } from './renderFrame';

export interface SurfaceInfo {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface RendererCapabilities {
  dimensions: '2d' | '3d';
  maxNodes: number;
  supportsText: boolean;
}

/**
 * What every renderer must implement.
 *
 * `Skia2DRenderer` satisfies this today; a `Three3DRenderer` would satisfy
 * the same contract in the Phase 5 spike without the engine noticing. That
 * substitutability is the whole reason `RenderFrame` is a dumb data list
 * rather than a pile of Skia nodes.
 */
export interface RendererAdapter {
  readonly id: string;
  readonly capabilities: RendererCapabilities;

  mount(surface: SurfaceInfo): void;
  resize(surface: SurfaceInfo): void;

  /** Called once per DISPLAY frame. Must not retain `frame`. */
  publish(frame: RenderFrame): void;

  unmount(): void;
}

/** No-op renderer for headless tests and for stepping a session with no
 *  surface attached (used by the engine specs). */
export const nullRenderer: RendererAdapter = {
  id: 'null',
  capabilities: { dimensions: '2d', maxNodes: 0, supportsText: false },
  mount() {},
  resize() {},
  publish() {},
  unmount() {},
};
