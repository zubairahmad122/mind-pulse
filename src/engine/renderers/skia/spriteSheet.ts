import { PaintStyle, Skia, drawAsImageFromPicture, type SkCanvas, type SkImage, type SkPaint } from '@shopify/react-native-skia';
import { SPRITE_COUNT, Sprite } from '../../core/types';

/**
 * The atlas texture: every shape the runtime can draw, in one 5×4 grid.
 *
 * Everything on screen — hull, drone, asteroid, gate, particle — is one of
 * these cells, tinted per node. That constraint is what lets the renderer
 * draw the entire scene with a single `<Atlas>` call instead of one Skia
 * node per entity: the difference between ~450 draw calls a frame and one.
 * Adding a cell therefore costs nothing at runtime, which is why the
 * vocabulary is generous — recognisable silhouettes are free, and they are
 * the difference between a scene that reads as a fighter running a
 * collapsing relay corridor and one that reads as coloured dots in motion.
 *
 * Shapes are drawn white so the per-node colour can be applied with a
 * `modulate` blend, which multiplies through and preserves the soft alpha
 * falloff of the glow cell.
 *
 * Two conventions every cell follows:
 *   • **Directional shapes point up (−Y)** so a node aiming along a heading
 *     is `rotation = heading + π/2`.
 *   • **Shapes inset ≥1px from the cell edge** so antialiasing never samples
 *     the neighbouring cell.
 *
 * Built procedurally rather than shipped as a PNG: no asset to load, no
 * resolution to pick, and it stays crisp because the cell is generously
 * sized (64px) relative to typical on-screen sizes.
 */
export const SPRITE_CELL = 64;
export const SPRITE_SHEET_COLUMNS = 5;
const SPRITE_SHEET_ROWS = Math.ceil(SPRITE_COUNT / SPRITE_SHEET_COLUMNS);
const SHEET_WIDTH = SPRITE_CELL * SPRITE_SHEET_COLUMNS;
const SHEET_HEIGHT = SPRITE_CELL * SPRITE_SHEET_ROWS;

/** Top-left corner of a sprite cell in the sheet. */
export function spriteCellOrigin(sprite: number): { x: number; y: number } {
  const index = Math.max(0, Math.min(SPRITE_COUNT - 1, Math.floor(sprite)));
  return {
    x: (index % SPRITE_SHEET_COLUMNS) * SPRITE_CELL,
    y: Math.floor(index / SPRITE_SHEET_COLUMNS) * SPRITE_CELL,
  };
}

/** Builds a closed path from cell-local points, offset into `sprite`'s cell. */
function polygon(sprite: number, points: readonly (readonly [number, number])[]) {
  const { x, y } = spriteCellOrigin(sprite);
  const path = Skia.Path.Make();
  path.moveTo(x + points[0][0], y + points[0][1]);
  for (let i = 1; i < points.length; i++) path.lineTo(x + points[i][0], y + points[i][1]);
  path.close();
  return path;
}

/** Mirrors `points` about the cell's vertical centre line, reversing winding. */
function mirrorX(points: readonly (readonly [number, number])[]): (readonly [number, number])[] {
  return points.map(([px, py]) => [SPRITE_CELL - px, py] as const).reverse();
}

/** Annulus sector centred on the cell centre, sweeping symmetrically about −Y. */
function arcSegment(
  sprite: number,
  midRadius: number,
  thickness: number,
  sweepDeg: number,
) {
  const { x, y } = spriteCellOrigin(sprite);
  const cx = x + SPRITE_CELL / 2;
  const cy = y + SPRITE_CELL / 2;
  const outer = midRadius + thickness / 2;
  const inner = midRadius - thickness / 2;
  // −90° is straight up; sweep is centred on it.
  const start = -90 - sweepDeg / 2;

  const path = Skia.Path.Make();
  path.addArc(Skia.XYWHRect(cx - outer, cy - outer, outer * 2, outer * 2), start, sweepDeg);
  path.arcToOval(
    Skia.XYWHRect(cx - inner, cy - inner, inner * 2, inner * 2),
    start + sweepDeg,
    -sweepDeg,
    false,
  );
  path.close();
  return path;
}

function fillPolygon(
  canvas: SkCanvas,
  paint: SkPaint,
  sprite: number,
  points: readonly (readonly [number, number])[],
) {
  canvas.drawPath(polygon(sprite, points), paint);
}

export function createSpriteSheet(): SkImage | null {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT));

  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color('white'));

  const half = SPRITE_CELL / 2;

  // ── Cell 0 — Glow ────────────────────────────────────────────────────────
  // Concentric rings of rising alpha approximate a radial falloff.
  // Deliberately not a gradient shader: this runs identically on every
  // backend and has no API surface to go wrong at build time.
  {
    const rings = 16;
    for (let i = rings; i >= 1; i--) {
      const t = i / rings;
      paint.setColor(Skia.Color(`rgba(255,255,255,${(0.075 * (1 - t) ** 1.6).toFixed(4)})`));
      canvas.drawCircle(half, half, half * t, paint);
    }
    paint.setColor(Skia.Color('rgba(255,255,255,0.95)'));
    canvas.drawCircle(half, half, half * 0.28, paint);
    paint.setColor(Skia.Color('white'));
  }

  // ── Cell 1 — Disc ────────────────────────────────────────────────────────
  {
    const { x, y } = spriteCellOrigin(Sprite.Disc);
    canvas.drawCircle(x + half, y + half, half - 1, paint);
  }

  // ── Cell 2 — Ring ────────────────────────────────────────────────────────
  // Stroke width is a *fraction of the cell*, so it scales with the node —
  // a ring drawn at 400px is proportionally as thick as one drawn at 40px.
  // 3/29 keeps big telegraph rings bold without turning them into donuts.
  {
    const { x, y } = spriteCellOrigin(Sprite.Ring);
    const stroke = Skia.Paint();
    stroke.setAntiAlias(true);
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeWidth(3);
    stroke.setColor(Skia.Color('white'));
    canvas.drawCircle(x + half, y + half, 29, stroke);
  }

  // ── Cell 3 — Square (rounded) ────────────────────────────────────────────
  {
    const { x, y } = spriteCellOrigin(Sprite.Square);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(x + 6, y + 6, SPRITE_CELL - 12, SPRITE_CELL - 12), 10, 10),
      paint,
    );
  }

  // ── Cell 4 — Hull ────────────────────────────────────────────────────────
  // A swept-wing dart. The silhouette has to survive at ~34px on screen, so
  // it is built from few, large angles: sharp nose, hard wing break, split
  // tail. Fine detail would just alias into a blob.
  {
    const rightHalf = [
      [32, 2], [40, 24], [45, 33], [59, 47], [59, 52], [43, 47],
      [39, 57], [34, 61], [32, 55],
    ] as const;
    fillPolygon(canvas, paint, Sprite.Hull, [...rightHalf, ...mirrorX(rightHalf)]);
  }

  // ── Cell 5 — Canopy ──────────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.Canopy, [[32, 12], [38, 30], [32, 44], [26, 30]]);
  }

  // ── Cell 6 — Drone ───────────────────────────────────────────────────────
  // Hostile read comes from the forward mandibles: an outline that reaches
  // *toward* the viewer is aggressive in a way a symmetric hull is not.
  {
    fillPolygon(canvas, paint, Sprite.Drone, [
      [32, 14], [46, 22], [50, 38], [32, 52], [14, 38], [18, 22],
    ]);
    fillPolygon(canvas, paint, Sprite.Drone, [[20, 20], [6, 3], [12, 25], [24, 30]]);
    fillPolygon(canvas, paint, Sprite.Drone, mirrorX([[20, 20], [6, 3], [12, 25], [24, 30]]));
  }

  // ── Cell 7 — Gate ────────────────────────────────────────────────────────
  // Two facing staples with a clear gap between them. The gap is the thing
  // the player aims the ship through, so it is the widest feature in the
  // cell; the legs are what make it read as hardware rather than a bar.
  {
    const staple = (flip: boolean) => {
      const at = (px: number, py: number) => [px, flip ? SPRITE_CELL - py : py] as const;
      fillPolygon(canvas, paint, Sprite.Gate, [
        at(9, 3), at(55, 3), at(55, 13), at(46, 13), at(46, 23),
        at(36, 23), at(36, 13), at(28, 13), at(28, 23), at(18, 23),
        at(18, 13), at(9, 13),
      ]);
    };
    staple(false);
    staple(true);
  }

  // ── Cell 8 — RingSeg ─────────────────────────────────────────────────────
  // Drawn about the cell centre, not filling the cell — see `Sprite.RingSeg`.
  {
    // Mid-radius 29 of 64 — see `RING_SEG_MID_RATIO`, which callers use to
    // turn a ring radius in px into a node size.
    canvas.drawPath(arcSegment(Sprite.RingSeg, 29, 3.6, 26), paint);
  }

  // ── Cell 9 — ArmorPlate ──────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.ArmorPlate, [
      [24, 8], [40, 8], [46, 22], [52, 54], [44, 58], [20, 58], [12, 54], [18, 22],
    ]);
  }

  // ── Cell 10 — Chevron ────────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.Chevron, [
      [32, 8], [58, 40], [58, 56], [32, 26], [6, 56], [6, 40],
    ]);
  }

  // ── Cell 11 — Star ───────────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.Star, [[32, 2], [38, 26], [62, 32], [38, 38], [32, 62], [26, 38], [2, 32], [26, 26]]);
  }

  // ── Cell 12 — Capsule ────────────────────────────────────────────────────
  {
    const { x, y } = spriteCellOrigin(Sprite.Capsule);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 24, y + 4, 16, SPRITE_CELL - 8), 8, 8), paint);
  }

  // ── Cell 13 — Hex ────────────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.Hex, [
      [32, 3], [57, 17], [57, 47], [32, 61], [7, 47], [7, 17],
    ]);
  }

  // ── Cell 14 — Reticle ────────────────────────────────────────────────────
  {
    const corner = (fx: boolean, fy: boolean) => {
      const at = (px: number, py: number) =>
        [fx ? SPRITE_CELL - px : px, fy ? SPRITE_CELL - py : py] as const;
      fillPolygon(canvas, paint, Sprite.Reticle, [
        at(3, 3), at(25, 3), at(25, 11), at(11, 11), at(11, 25), at(3, 25),
      ]);
    };
    corner(false, false);
    corner(true, false);
    corner(false, true);
    corner(true, true);
  }

  // ── Cell 15 — Shard ──────────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.Shard, [[32, 4], [44, 52], [32, 60], [20, 52]]);
  }

  // ── Cell 16 — Rock ───────────────────────────────────────────────────────
  // Irregular on purpose, and asymmetric on both axes: a rock that is
  // symmetric reads as a designed object, and one that tumbles while
  // symmetric barely reads as tumbling at all.
  {
    fillPolygon(canvas, paint, Sprite.Rock, [
      [30, 3], [48, 9], [58, 26], [54, 44], [40, 59], [22, 61],
      [8, 48], [4, 28], [12, 12],
    ]);
  }

  // ── Cell 17 — Strut ──────────────────────────────────────────────────────
  // A beam with heavier end caps. Caps are what make a scaled-up strut read
  // as built hardware rather than as a rounded rectangle.
  {
    fillPolygon(canvas, paint, Sprite.Strut, [
      [18, 2], [46, 2], [46, 12], [39, 16], [39, 48], [46, 52],
      [46, 62], [18, 62], [18, 52], [25, 48], [25, 16], [18, 12],
    ]);
  }

  // ── Cell 18 — Bolt ───────────────────────────────────────────────────────
  {
    fillPolygon(canvas, paint, Sprite.Bolt, [
      [32, 2], [40, 20], [38, 46], [32, 62], [26, 46], [24, 20],
    ]);
  }

  // ── Cell 19 — Pod ────────────────────────────────────────────────────────
  // A hexagonal shell with a bite out of each side, so a pickup is a
  // distinct silhouette at a glance and never mistaken for a rock.
  {
    fillPolygon(canvas, paint, Sprite.Pod, [
      [32, 3], [55, 17], [55, 27], [46, 32], [55, 37], [55, 47],
      [32, 61], [9, 47], [9, 37], [18, 32], [9, 27], [9, 17],
    ]);
  }

  const picture = recorder.finishRecordingAsPicture();
  return drawAsImageFromPicture(picture, { width: SHEET_WIDTH, height: SHEET_HEIGHT });
}
