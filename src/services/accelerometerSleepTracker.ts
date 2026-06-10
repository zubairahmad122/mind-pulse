import { Accelerometer } from 'expo-sensors';

let subscription: { remove: () => void } | null = null;

export type SleepStage = 'deep' | 'rem' | 'light';

export interface SleepMovementData {
  timestamp: number;
  magnitude: number;
}

export async function isAccelerometerAvailable(): Promise<boolean> {
  try {
    return await Accelerometer.isAvailableAsync();
  } catch {
    return false;
  }
}

export function startAccelerometerSensing(
  onMovement: (data: SleepMovementData) => void,
  updateIntervalMs = 1000,
): (() => void) | null {
  try {
    Accelerometer.setUpdateInterval(updateIntervalMs);

    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let firstFrame = true;

    subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;

      if (firstFrame) {
        lastX = x;
        lastY = y;
        lastZ = z;
        firstFrame = false;
        return;
      }

      const deltaX = x - lastX;
      const deltaY = y - lastY;
      const deltaZ = z - lastZ;

      lastX = x;
      lastY = y;
      lastZ = z;

      const diffMagnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

      onMovement({
        timestamp: Date.now(),
        magnitude: diffMagnitude,
      });
    });

    return () => {
      stopAccelerometerSensing();
    };
  } catch {
    return null;
  }
}

export function stopAccelerometerSensing(): void {
  try {
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
  } catch {
    subscription = null;
  }
}

export function classifySleepStage(magnitudes: number[]): SleepStage {
  if (magnitudes.length === 0) return 'deep';
  const sum = magnitudes.reduce((acc, val) => acc + val, 0);
  const avg = sum / magnitudes.length;

  if (avg > 0.06) return 'light';
  if (avg > 0.015) return 'rem';
  return 'deep';
}
