import { EyeGameIcon, GAME_ICON_COLORS } from '@/components/eye/games/icons/GameIcons';
import { RecoverySessionIcon } from '@/components/eye/icons/RecoveryIcons';

type EyeRelaxIconProps = {
  id: string;
  size?: number;
};

const GAME_IDS = new Set([
  'saccade-sniper',
  'focus-sprint',
  'comet-trace',
  'spiral',
  'dichoptic-reaction',
]);

const RECOVERY_IDS = new Set(['cvs-protocol', 'comet-trace']);

export function gameIconBg(gameId: string): string {
  const hex = GAME_ICON_COLORS[gameId] ?? '#a78bfa';
  return hexToRgba(hex, 0.14);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function EyeRelaxIcon({ id, size = 36 }: EyeRelaxIconProps) {
  if (RECOVERY_IDS.has(id)) {
    return <RecoverySessionIcon sessionId={id} size={size} />;
  }
  if (GAME_IDS.has(id) || id in GAME_ICON_COLORS) {
    return <EyeGameIcon gameId={id} size={size} />;
  }
  return <EyeGameIcon gameId="saccade-sniper" size={size} />;
}

export function eyeRelaxIconBg(id: string): string {
  if (id === 'cvs-protocol') return 'rgba(123, 97, 255, 0.15)';
  if (id === 'comet-trace') return 'rgba(52, 211, 153, 0.15)';
  return gameIconBg(id);
}
