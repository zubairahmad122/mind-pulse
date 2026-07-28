import type { EyeComfortSummary } from '@/utils/eyeComfort';
import type { EyeBreakReminderSummary } from '@/utils/eyeBreakReminderStats';

export function getEyeWeeklyRecommendation(
  comfort: EyeComfortSummary,
  reminders: EyeBreakReminderSummary,
): string {
  if (comfort.worsenedSessions > 0) {
    return 'This week: stop any activity that worsens symptoms. If discomfort persists, seek professional eye care.';
  }
  if (reminders.opened >= 2 && (reminders.completionRate ?? 0) < 50) {
    return 'This week: choose a reminder schedule you can follow and complete one guided break each workday.';
  }
  if (comfort.sessions === 0) {
    return 'This week: add one before-and-after comfort check-in to learn whether a break felt helpful.';
  }
  if (reminders.interactions === 0) {
    return 'This week: enable break reminders during your usual screen hours.';
  }
  if (comfort.improvedSessions > comfort.worsenedSessions) {
    return 'This week: keep the break routine associated with your better comfort check-ins.';
  }
  return 'This week: aim for one short screen break each day and keep tracking how you feel.';
}
