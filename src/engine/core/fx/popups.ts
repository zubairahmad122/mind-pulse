/**
 * Floating score popups ("+240", "MISS", "×4").
 *
 * These carry *text*, and text is the one thing the Atlas fast path cannot
 * draw — an atlas renders sprite cells, not glyphs. So popups are kept in
 * their own small pooled list and handed to the renderer separately, where
 * a handful of Skia text nodes can draw them without touching React state.
 *
 * Capacity is intentionally tiny (default 12). More than a dozen numbers
 * floating at once is unreadable anyway, so the cap is a design constraint
 * as much as a performance one.
 */
export interface Popup {
  active: boolean;
  x: number;
  y: number;
  /** Interpolated draw position, updated by `step`. */
  drawY: number;
  text: string;
  r: number;
  g: number;
  b: number;
  a: number;
  sizePx: number;
  ageMs: number;
  lifeMs: number;
}

export interface PopupSpec {
  x: number;
  y: number;
  text: string;
  r?: number;
  g?: number;
  b?: number;
  sizePx?: number;
  lifeMs?: number;
  /** How far the popup drifts upward over its life, before motion scaling. */
  risePx?: number;
}

export interface PopupSystem {
  readonly alive: number;
  readonly items: readonly Popup[];
  add(spec: PopupSpec): void;
  step(dtMs: number): void;
  clear(): void;
}

export interface PopupSystemOptions {
  capacity?: number;
  /** 0..1; reduced motion flattens the rise but keeps the text readable —
   *  the information is never withheld, only the movement. */
  motionScale?: number;
}

export function createPopupSystem(options: PopupSystemOptions = {}): PopupSystem {
  const capacity = options.capacity ?? 12;
  const motionScale = options.motionScale ?? 1;

  const items: Popup[] = new Array(capacity);
  const rise = new Float32Array(capacity);
  for (let i = 0; i < capacity; i++) {
    items[i] = {
      active: false, x: 0, y: 0, drawY: 0, text: '',
      r: 1, g: 1, b: 1, a: 1, sizePx: 20, ageMs: 0, lifeMs: 700,
    };
  }

  let alive = 0;
  let cursor = 0;

  return {
    get alive() { return alive; },
    items,

    add(spec) {
      let slot = -1;
      for (let scan = 0; scan < capacity; scan++) {
        const i = (cursor + scan) % capacity;
        if (!items[i].active) { slot = i; break; }
      }
      // Full: overwrite the oldest. A dropped "+240" is worse than a
      // slightly-early fade on the previous one.
      if (slot === -1) {
        let oldest = 0;
        for (let i = 1; i < capacity; i++) {
          if (items[i].ageMs > items[oldest].ageMs) oldest = i;
        }
        slot = oldest;
        alive--;
      }
      cursor = (slot + 1) % capacity;

      const p = items[slot];
      p.active = true;
      p.x = spec.x;
      p.y = spec.y;
      p.drawY = spec.y;
      p.text = spec.text;
      p.r = spec.r ?? 1;
      p.g = spec.g ?? 1;
      p.b = spec.b ?? 1;
      p.a = 1;
      p.sizePx = spec.sizePx ?? 22;
      p.ageMs = 0;
      p.lifeMs = spec.lifeMs ?? 750;
      rise[slot] = (spec.risePx ?? 46) * motionScale;
      alive++;
    },

    step(dtMs) {
      if (alive === 0) return;
      for (let i = 0; i < capacity; i++) {
        const p = items[i];
        if (!p.active) continue;
        p.ageMs += dtMs;
        if (p.ageMs >= p.lifeMs) {
          p.active = false;
          alive--;
          continue;
        }
        const t = p.ageMs / p.lifeMs;
        // Ease-out rise: fast off the target, settling as it fades.
        p.drawY = p.y - rise[i] * (1 - (1 - t) * (1 - t));
        // Hold full opacity for the first 45% so the number is actually
        // legible before it starts disappearing.
        p.a = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
      }
    },

    clear() {
      for (let i = 0; i < capacity; i++) items[i].active = false;
      alive = 0;
      cursor = 0;
    },
  };
}
