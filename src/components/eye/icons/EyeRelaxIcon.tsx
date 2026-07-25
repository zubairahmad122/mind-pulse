import { EyeGameIcon, GAME_ICON_COLORS } from '@/components/eye/games/icons/GameIcons';
import { RecoverySessionIcon } from '@/components/eye/icons/RecoveryIcons';

type EyeRelaxIconProps = {
  id: string;
  size?: number;
  /** Overrides the per-activity default color — pass this to keep every
   * icon on a screen in the same accent family instead of each activity's
   * own hue. */
  color?: string;
};

const GAME_IDS = new Set([
  'saccade-sniper',
  'focus-sprint',
  'comet-trace',
  'spiral',
  'dichoptic-reaction',
]);

const RECOVERY_IDS = new Set(['cvs-protocol', 'comet-trace']);

export function EyeRelaxIcon({ id, size = 36, color }: EyeRelaxIconProps) {
  if (RECOVERY_IDS.has(id)) {
    return <RecoverySessionIcon sessionId={id} size={size} color={color} />;
  }
  if (GAME_IDS.has(id) || id in GAME_ICON_COLORS) {
    return <EyeGameIcon gameId={id} size={size} color={color} />;
  }
  return <EyeGameIcon gameId="saccade-sniper" size={size} color={color} />;
}
