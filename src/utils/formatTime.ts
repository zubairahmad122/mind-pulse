export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateSleepDurationHours(bedtime: string, wakeTime: string): number {
  const bed = parseTimeToMinutes(bedtime);
  let wake = parseTimeToMinutes(wakeTime);
  if (wake <= bed) wake += 24 * 60;
  return Math.round(((wake - bed) / 60) * 10) / 10;
}

export function adjustTime(time: string, deltaMinutes: number): string {
  return formatMinutesToTime(parseTimeToMinutes(time) + deltaMinutes);
}

export function formatDurationSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
