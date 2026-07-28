export type EyeSymptomId =
  | 'dryness'
  | 'tired'
  | 'headache'
  | 'blurred'
  | 'double'
  | 'pain'
  | 'sudden-change'
  | 'after-injury';

export type EyeSymptomGuidanceLevel = 'routine' | 'professional' | 'urgent';

export interface EyeSymptomSummary {
  checkIns: number;
  symptomCheckIns: number;
  concerningCheckIns: number;
  mostFrequent: EyeSymptomId | null;
}

export function getEyeSymptomGuidance(
  symptoms: EyeSymptomId[],
): { level: EyeSymptomGuidanceLevel; message: string } {
  if (
    symptoms.includes('sudden-change')
    || symptoms.includes('after-injury')
    || symptoms.includes('pain')
    || symptoms.includes('double')
  ) {
    return {
      level: 'urgent',
      message:
        'Do not continue eye activities. Sudden vision changes, eye pain, new double vision, or symptoms after an injury need prompt assessment by a qualified eye-care or medical professional. Use local urgent or emergency care for severe or sudden symptoms.',
    };
  }
  if (symptoms.includes('blurred')) {
    return {
      level: 'professional',
      message:
        'Pause screen activities. If blurred vision is new, persistent, or recurring, arrange an assessment with a qualified eye-care professional.',
    };
  }
  if (symptoms.length > 0) {
    return {
      level: 'routine',
      message:
        'Take a screen break, blink normally, and rest your eyes. Stop if symptoms worsen, and seek professional care if they persist.',
    };
  }
  return {
    level: 'routine',
    message: 'No symptoms selected. Keep taking regular screen breaks.',
  };
}

export function summarizeEyeSymptoms(
  records: { recordedAt: number; symptoms: EyeSymptomId[] }[],
  since: number,
): EyeSymptomSummary {
  const recent = records.filter(record => record.recordedAt >= since);
  const counts = new Map<EyeSymptomId, number>();
  let concerningCheckIns = 0;
  for (const record of recent) {
    if (getEyeSymptomGuidance(record.symptoms).level !== 'routine') {
      concerningCheckIns += 1;
    }
    for (const symptom of record.symptoms) {
      counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
    }
  }
  const mostFrequent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    checkIns: recent.length,
    symptomCheckIns: recent.filter(record => record.symptoms.length > 0).length,
    concerningCheckIns,
    mostFrequent,
  };
}
