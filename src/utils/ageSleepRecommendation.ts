/** Age-based sleep duration guidance (display only) */
export function sleepHoursRecommendation(age: number): string {
  if (age < 13) return '9 – 12 hours';
  if (age < 18) return '8 – 10 hours';
  if (age < 65) return '7 – 9 hours';
  return '7 – 8 hours';
}
