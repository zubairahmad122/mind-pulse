import type { EyeBreakReminderEvent } from '@/services/eyeBreakReminderEvents';

export interface EyeBreakReminderSummary {
  interactions: number;
  opened: number;
  snoozed: number;
  completed: number;
  abandoned: number;
  completionRate: number | null;
}

export function summarizeEyeBreakReminderEvents(
  events: EyeBreakReminderEvent[],
  since: number,
): EyeBreakReminderSummary {
  const recent = events.filter(event => event.occurredAt >= since);
  const count = (type: EyeBreakReminderEvent['type']) =>
    recent.filter(event => event.type === type).length;
  const opened = count('opened');
  const completed = count('completed');

  return {
    interactions: opened + count('snoozed'),
    opened,
    snoozed: count('snoozed'),
    completed,
    abandoned: count('abandoned'),
    completionRate: opened > 0 ? Math.min(100, Math.round((completed / opened) * 100)) : null,
  };
}
