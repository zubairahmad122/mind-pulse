import { PaintStyle, Skia, drawAsImageFromPicture, type SkImage } from '@shopify/react-native-skia';
import { SPRITE_COUNT } from '../../core/types';

/**
 * The atlas texture: four white shapes in a 2×2 grid.
 *
 * Everything the 2D runtime draws is one of these four cells, tinted per
 * node. That constraint is what lets the renderer draw the entire scene with
 * a single `<Atlas>` call instead of one Skia node per entity — the
 * difference between ~450 draw calls a frame and one.
 *
 * The shapes are drawn white so the per-node colour can be applied with a
 * `modulate` blend, which multiplies through and preserves the soft alpha
 * falloff of the glow cell.
 *
 * Built procedurally rather than shipped as a PNG: no asset to load, no
 * resolution to pick, and it stays crisp because the cell is generously
 * sized (64px) relative to typical on-screen sizes.
 */
export const SPRITE_CELL = 64;
export const SPRITE_SHEET_COLUMNS = 2;
const SHEET_SIZE = SPRITE_CELL * SPRITE_SHEET_COLUMNS;

/** Top-left corner of a sprite cell in the sheet. */
export function spriteCellOrigin(sprite: number): { x: number; y: number } {
  const index = Math.max(0, Math.min(SPRITE_COUNT - 1, Math.floor(sprite)));
  return {
    x: (index % SPRITE_SHEET_COLUMNS) * SPRITE_CELL,
    y: Math.floor(index / SPRITE_SHEET_COLUMNS) * SPRITE_CELL,
  };
}

export function createSpriteSheet(): SkImage | null {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, SHEET_SIZE, SHEET_SIZE));

  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  const half = SPRITE_CELL / 2;

  // Cell 0 — Glow. Concentric rings of rising alpha approximate a radial
  // falloff. Deliberately not a gradient shader: this runs identically on
  // every backend and has no API surface to go wrong at build time.
  {
    const cx = half;
    const cy = half;
    const rings = 16;
    for (let i = rings; i >= 1; i--) {
      const t = i / rings;
      paint.setColor(Skia.Color(`rgba(255,255,255,${(0.075 * (1 - t) ** 1.6).toFixed(4)})`));
      canvas.drawCircle(cx, cy, half * t, paint);
    }
    paint.setColor(Skia.Color('rgba(255,255,255,0.95)'));
    canvas.drawCircle(cx, cy, half * 0.28, paint);
  }

  // Cell 1 — Disc. Solid, the workhorse for targets and sparks.
  {
    const { x, y } = spriteCellOrigin(1);
    paint.setColor(Skia.Color('white'));
    // Inset by 1px so antialiasing never samples the neighbouring cell.
    canvas.drawCircle(x + half, y + half, half - 1, paint);
  }

  // Cell 2 — Ring. Used for lock-on reticles and telegraph pulses.
  {
    const { x, y } = spriteCellOrigin(2);
    const stroke = Skia.Paint();
    stroke.setAntiAlias(true);
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeWidth(6);
    stroke.setColor(Skia.Color('white'));
    canvas.drawCircle(x + half, y + half, half - 5, stroke);
  }

  // Cell 3 — Square (rounded). Used for HUD ticks and route segments.
  {
    const { x, y } = spriteCellOrigin(3);
    paint.setColor(Skia.Color('white'));
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(x + 6, y + 6, SPRITE_CELL - 12, SPRITE_CELL - 12), 10, 10),
      paint,
    );
  }

  const picture = recorder.finishRecordingAsPicture();
  return drawAsImageFromPicture(picture, { width: SHEET_SIZE, height: SHEET_SIZE });
}
