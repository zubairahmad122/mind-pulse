import { getMondayISO, parseLocalISO } from '@/utils/dateUtils';

/** True if any Mon–Sun week represented in the activity log has all 7 days present. */
export function computeHasPerfectWeek(activityLog: string[]): boolean {
  const counts = new Map<string, number>();
  for (const date of activityLog) {
    const monday = getMondayISO(parseLocalISO(date));
    counts.set(monday, (counts.get(monday) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 7);
}
