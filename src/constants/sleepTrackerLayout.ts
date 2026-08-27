/** Circular sleep / wake tracker ring dimensions (home screen) */
export const SLEEP_TRACK_RING = {
  CONTAINER_SIZE: 250,
  RING_SIZE: 204,
} as const;

export const SLEEP_TRACK_RING_OFFSET =
  (SLEEP_TRACK_RING.CONTAINER_SIZE - SLEEP_TRACK_RING.RING_SIZE) / 2;
