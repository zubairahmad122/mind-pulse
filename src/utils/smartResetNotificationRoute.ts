import type { ResetType } from '@/services/screenBalancePersistence';

const RESET_TYPES: ResetType[] = ['eye-break', 'breathe', 'move', 'offline'];

export function smartResetNotificationKey(notificationId?: string | string[] | null): string {
  if (Array.isArray(notificationId)) return notificationId[0] ?? 'smart-reset';
  return notificationId ?? 'smart-reset';
}

export function recommendedResetFromParam(value?: string | string[] | null): ResetType | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && RESET_TYPES.includes(raw as ResetType) ? (raw as ResetType) : undefined;
}
