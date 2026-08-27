export type EyeComfortValue = 1 | 2 | 3 | 4 | 5;

export function getComfortChange(record: {
  before: EyeComfortValue | null;
  after: EyeComfortValue | null;
}): 'better' | 'same' | 'worse' | 'unknown' {
  if (record.before === null || record.after === null) return 'unknown';
  if (record.after < record.before) return 'better';
  if (record.after > record.before) return 'worse';
  return 'same';
}

export interface EyeComfortSummary {
  sessions: number;
  comparedSessions: number;
  improvedSessions: number;
  sameSessions: number;
  worsenedSessions: number;
  averageChange: number | null;
}

export function summarizeEyeComfort(
  records: {
    completedAt: number;
    before: EyeComfortValue | null;
    after: EyeComfortValue | null;
  }[],
  since: number,
): EyeComfortSummary {
  const recent = records.filter(record => record.completedAt >= since);
  const compared = recent.filter(
    (record): record is typeof record & { before: EyeComfortValue; after: EyeComfortValue } =>
      record.before !== null && record.after !== null,
  );
  const changes = compared.map(record => record.before - record.after);

  return {
    sessions: recent.length,
    comparedSessions: compared.length,
    improvedSessions: changes.filter(change => change > 0).length,
    sameSessions: changes.filter(change => change === 0).length,
    worsenedSessions: changes.filter(change => change < 0).length,
    averageChange:
      changes.length > 0
        ? changes.reduce((total, change) => total + change, 0) / changes.length
        : null,
  };
}
