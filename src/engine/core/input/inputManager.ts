/**
 * Pointer queue.
 *
 * Gestures arrive whenever the OS delivers them; game logic runs on a fixed
 * 60Hz step. Handling a tap the instant it arrives would make the same input
 * resolve differently depending on where it landed inside a frame — and
 * would make a recorded session impossible to replay.
 *
 * So input is **queued on arrival and drained inside the fixed step**. Every
 * tap is processed at a well-defined point in the simulation, which is what
 * makes reaction times comparable between devices and sessions reproducible
 * under a fixed seed.
 *
 * Events are pooled: `enqueue` writes into a ring buffer rather than
 * allocating, so a frantic multi-touch burst can't trigger GC mid-session.
 */
/**
 * `tap` is deliberately *not* derivable from down/up.
 *
 * A game where one finger is already holding a drag still needs a discrete
 * "press" for a second action (a special attack, a bomb). Reconstructing
 * that from the drag stream means guessing at durations and travel
 * thresholds, and guessing wrong steers the ship on what the player meant as
 * a tap. So the platform's own tap recogniser gets its own phase, and games
 * treat it as a separate control rather than as a short drag.
 */
export type PointerPhase = 'down' | 'move' | 'up' | 'cancel' | 'tap';

export interface PointerEvent {
  pointerId: number;
  phase: PointerPhase;
  x: number;
  y: number;
  /** Timestamp from the gesture system, in ms. */
  tMs: number;
}

export interface InputManager {
  /** Called from the gesture handler, off the fixed step. */
  enqueue(pointerId: number, phase: PointerPhase, x: number, y: number, tMs: number): void;
  /** Returns queued events in arrival order. Valid only until the next
   *  `drain()`; the backing objects are recycled. */
  drain(): readonly PointerEvent[];
  readonly pending: number;
  clear(): void;
}

export function createInputManager(capacity = 64): InputManager {
  const pool: PointerEvent[] = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    pool[i] = { pointerId: -1, phase: 'down', x: 0, y: 0, tMs: 0 };
  }
  // `out` is reused across drains — callers iterate it immediately inside the
  // step and never retain it.
  const out: PointerEvent[] = [];
  let head = 0;
  let size = 0;

  return {
    enqueue(pointerId, phase, x, y, tMs) {
      // Full queue drops the OLDEST event: under a burst, the most recent
      // intent is the one the player still cares about.
      const index = (head + size) % capacity;
      const e = pool[index];
      e.pointerId = pointerId;
      e.phase = phase;
      e.x = x;
      e.y = y;
      e.tMs = tMs;
      if (size < capacity) size++;
      else head = (head + 1) % capacity;
    },

    drain() {
      out.length = 0;
      for (let i = 0; i < size; i++) out.push(pool[(head + i) % capacity]);
      head = 0;
      size = 0;
      return out;
    },

    get pending() {
      return size;
    },

    clear() {
      head = 0;
      size = 0;
    },
  };
}
