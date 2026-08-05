import {
  Atlas,
  Canvas,
  Fill,
  Text as SkiaText,
  useColorBuffer,
  useFont,
  useRectBuffer,
  useRSXformBuffer,
  type SkImage,
} from '@shopify/react-native-skia';
import { memo, useCallback, useMemo, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { HEADER_LENGTH, NODE_STRIDE } from './frameBuffer';
import type { PackedPopup } from './Skia2DRenderer';
import { createSpriteSheet, SPRITE_CELL, SPRITE_SHEET_COLUMNS } from './spriteSheet';
import type { PointerPhase } from '../../core/input/inputManager';

const POPUP_FONT_SIZE = 22;
const WHITE = Float32Array.of(1, 1, 1, 1);
/** Parking spot for atlas slots past the live node count: zero-scaled and
 *  far off-screen, so Skia culls them without a per-frame allocation. */
const PARKED = -10_000;

export interface SkiaGameCanvasProps {
  width: number;
  height: number;
  /** Max nodes the engine may emit — must equal the renderer's `capacity`.
   *  Only used to size the packed buffer; the atlas itself is sized per
   *  frame from the live node count. */
  capacity: number;
  packed: SharedValue<Float32Array>;
  popups: SharedValue<PackedPopup[]>;
  popupCapacity?: number;
  /** Receives raw pointer events on the JS thread, ready to be queued. */
  onPointer?: (pointerId: number, phase: PointerPhase, x: number, y: number, tMs: number) => void;
  backgroundColor?: string;
}

/**
 * The 2D surface.
 *
 * The entire scene — every entity and every particle — is drawn by a single
 * `<Atlas>` node. Its three buffers are filled by worklets that read the one
 * packed shared value the engine assigns each frame, so the React tree here
 * is completely static: it renders once on mount and then never again while
 * a session runs. That is the "no React state every frame" requirement, met
 * structurally rather than by discipline.
 *
 * Popups are the one exception, because glyphs cannot be drawn by an atlas.
 * They get their own small layer of Skia text nodes, still driven by shared
 * values rather than state.
 */
function SkiaGameCanvasImpl({
  width,
  height,
  capacity,
  packed,
  popups,
  popupCapacity = 12,
  onPointer,
  backgroundColor = '#080D1A',
}: SkiaGameCanvasProps) {
  // Built exactly once, via a lazy state initialiser. The SkImage is a
  // native resource, so it must not be recreated on re-render — and a
  // `useMemo` is only a hint, which React Compiler is free to discard.
  // A lazy initialiser is the one construct React guarantees runs once per
  // component instance.
  const [sheet] = useState<SkImage | null>(() => createSpriteSheet());
  const font = useFont(require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'), POPUP_FONT_SIZE);

  // Atlas inputs, held in Skia's pooled buffers.
  //
  // These hooks allocate their backing objects once and mutate them in place
  // on the UI thread, so a running session allocates nothing here. An earlier
  // revision replaced them with `useDerivedValue` on the theory that their
  // Reanimated mapper had died; that was a misdiagnosis. The real fault was
  // `Skia2DRenderer.publish` handing Reanimated a recycled `Float32Array`,
  // whose shareable clone is cached by object identity — so the mapper was
  // faithfully reading a value that had stopped changing. With that fixed in
  // `publish` (fresh `slice()` per frame), pooling is correct here again and
  // costs 450 fewer object allocations per frame on the UI thread.
  //
  // In-place reuse is safe in *this* direction because these buffers never
  // cross a thread boundary — Skia consumes them on the UI thread where they
  // are written. `packed` is the only value that crosses, and it alone needs
  // a fresh identity every frame.
  const transforms = useRSXformBuffer(capacity, (xf, i) => {
    'worklet';
    const p = packed.value;
    const count = p[0];
    if (i >= count) {
      // Past the live count the packed array has no data at all (it is
      // trimmed), so parking must happen before any read.
      xf.set(0, 0, PARKED, PARKED);
      return;
    }
    const o = HEADER_LENGTH + i * NODE_STRIDE;
    const scale = p[o + 3] / SPRITE_CELL;
    const rotation = p[o + 2];
    const scos = Math.cos(rotation) * scale;
    const ssin = Math.sin(rotation) * scale;
    // RSXform rotates about the sprite's origin, so the translation
    // pre-compensates for the half-cell offset to land the sprite's *centre*
    // on the entity position. Camera shake rides in the header, which is why
    // shake costs nothing extra per node.
    const half = SPRITE_CELL / 2;
    xf.set(
      scos,
      ssin,
      p[o] + p[1] - (scos * half - ssin * half),
      p[o + 1] + p[2] - (ssin * half + scos * half),
    );
  });

  const sprites = useRectBuffer(capacity, (rect, i) => {
    'worklet';
    const p = packed.value;
    const index = i < p[0] ? p[HEADER_LENGTH + i * NODE_STRIDE + 4] : 0;
    const col = index % SPRITE_SHEET_COLUMNS;
    const row = Math.floor(index / SPRITE_SHEET_COLUMNS);
    rect.setXYWH(col * SPRITE_CELL, row * SPRITE_CELL, SPRITE_CELL, SPRITE_CELL);
  });

  const colors = useColorBuffer(capacity, (c, i) => {
    'worklet';
    const p = packed.value;
    if (i >= p[0]) {
      // Fully transparent, so a parked slot draws nothing even if the
      // transform above is ever wrong.
      c[0] = 0; c[1] = 0; c[2] = 0; c[3] = 0;
      return;
    }
    const o = HEADER_LENGTH + i * NODE_STRIDE;
    c[0] = p[o + 5];
    c[1] = p[o + 6];
    c[2] = p[o + 7];
    c[3] = p[o + 8];
  });

  // Timestamping lives in this callback rather than in the gesture builder
  // below: the builder body runs during render, and reading the clock there
  // would be an impure render (and would stamp every touch with the time of
  // the last re-render instead of the touch).
  const emit = useCallback(
    (phase: PointerPhase, x: number, y: number) => {
      onPointer?.(0, phase, x, y, Date.now());
    },
    [onPointer],
  );

  // `.runOnJS(true)` keeps the handlers on the JS thread, where the input
  // queue lives. Touches arrive a handful of times a second, so the boundary
  // crossing is irrelevant here — unlike the per-frame scene, which is
  // exactly why that goes the other way through a shared value.
  //
  // Pan and Tap run *simultaneously* rather than racing. A racing tap would
  // be swallowed the moment a drag was in progress, which is precisely when
  // a game most needs it: one thumb steering, a second finger tapping to
  // spend a resource. Running both means the drag is never interrupted and
  // the tap still lands, and the two arrive on separate phases so a game
  // never has to guess which one the player meant.
  const gesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Pan()
          .minDistance(0)
          .maxPointers(2)
          .runOnJS(true)
          .onBegin(e => emit('down', e.x, e.y))
          .onUpdate(e => emit('move', e.x, e.y))
          .onEnd(e => emit('up', e.x, e.y))
          .onFinalize((e, success) => {
            if (!success) emit('cancel', e.x, e.y);
          }),
        Gesture.Tap()
          .maxDuration(260)
          .maxDistance(18)
          .runOnJS(true)
          .onEnd((e, success) => {
            if (success) emit('tap', e.x, e.y);
          }),
      ),
    [emit],
  );

  const popupSlots = useMemo(
    () => Array.from({ length: popupCapacity }, (_, i) => i),
    [popupCapacity],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ width, height }}>
        <Fill color={backgroundColor} />
        <Atlas
          image={sheet}
          sprites={sprites}
          transforms={transforms}
          colors={colors}
          colorBlendMode="modulate"
        />
        {font
          ? popupSlots.map(i => <PopupSlot key={i} index={i} popups={popups} font={font} />)
          : null}
      </Canvas>
    </GestureDetector>
  );
}

function PopupSlot({
  index,
  popups,
  font,
}: {
  index: number;
  popups: SharedValue<PackedPopup[]>;
  font: NonNullable<ReturnType<typeof useFont>>;
}) {
  const text = useDerivedValue(() => popups.value[index]?.text ?? '');
  const x = useDerivedValue(() => popups.value[index]?.x ?? 0);
  const y = useDerivedValue(() => popups.value[index]?.y ?? 0);
  const opacity = useDerivedValue(() => popups.value[index]?.opacity ?? 0);
  const color = useDerivedValue(() => popups.value[index]?.color ?? WHITE);

  return <SkiaText x={x} y={y} text={text} font={font} color={color} opacity={opacity} />;
}

export const SkiaGameCanvas = memo(SkiaGameCanvasImpl);
