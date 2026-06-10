import AsyncStorage from '@react-native-async-storage/async-storage';

/** Anaglyph dichoptic color config — what each eye sees through 3D glasses */
export interface DichopticColors {
  /** Color visible to the LEFT eye (standard: red filter) */
  left: string;
  /** Color visible to the RIGHT eye (standard: cyan/blue filter) */
  right: string;
  /** Label shown to user for the left eye color */
  leftLabel: string;
  /** Label shown to user for the right eye color */
  rightLabel: string;
}

/** Default anaglyph colors */
export const DEFAULT_DICHOPTIC_COLORS: DichopticColors = {
  left: '#FF3366',
  right: '#00D4FF',
  leftLabel: 'Red',
  rightLabel: 'Cyan',
};

const STORAGE_KEY = '@mindpulse/dichoptic/colors';

/** Load saved calibration, or return defaults */
export async function loadDichopticColors(): Promise<DichopticColors> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DichopticColors;
  } catch { /* ignore */ }
  return DEFAULT_DICHOPTIC_COLORS;
}

/** Persist calibration */
export async function saveDichopticColors(colors: DichopticColors): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

/** Reset to defaults */
export async function resetDichopticColors(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Blend a dichoptic color into the dark background.
 * Used for the calibration target — the user adjusts until the indicator blends in.
 */
export function blendIntoBackground(hex: string, alpha: number = 0.35): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
