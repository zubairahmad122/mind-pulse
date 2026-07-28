import {
  getEyeSymptomGuidance,
  summarizeEyeSymptoms,
} from '@/utils/eyeSymptomGuidance';

describe('eye symptom guidance', () => {
  it('escalates sudden or painful symptoms', () => {
    expect(getEyeSymptomGuidance(['sudden-change']).level).toBe('urgent');
    expect(getEyeSymptomGuidance(['pain']).level).toBe('urgent');
  });

  it('recommends an eye-care assessment for recurring blur', () => {
    expect(getEyeSymptomGuidance(['blurred']).level).toBe('professional');
  });

  it('does not diagnose routine discomfort', () => {
    const result = getEyeSymptomGuidance(['dryness', 'tired']);
    expect(result.level).toBe('routine');
    expect(result.message).toContain('screen break');
  });

  it('summarizes recent symptom check-ins', () => {
    const summary = summarizeEyeSymptoms([
      { recordedAt: 200, symptoms: ['dryness'] },
      { recordedAt: 300, symptoms: ['dryness', 'blurred'] },
      { recordedAt: 50, symptoms: ['pain'] },
    ], 100);
    expect(summary).toEqual({
      checkIns: 2,
      symptomCheckIns: 2,
      concerningCheckIns: 1,
      mostFrequent: 'dryness',
    });
  });
});
