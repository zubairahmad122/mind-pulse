import { eyeSessionTypeToRecoveryId } from '@/utils/eyeSessionIds';

describe('eyeSessionTypeToRecoveryId', () => {
  it("maps the legacy 'eye-reset' type to the 'cvs-protocol' activity id", () => {
    expect(eyeSessionTypeToRecoveryId('eye-reset')).toBe('cvs-protocol');
  });

  it("keeps 'cvs-protocol' as itself", () => {
    expect(eyeSessionTypeToRecoveryId('cvs-protocol')).toBe('cvs-protocol');
  });

  it('passes unknown types through unchanged', () => {
    expect(eyeSessionTypeToRecoveryId('focus-sprint')).toBe('focus-sprint');
  });

  it('never resolves to the removed Comet Trace activity', () => {
    expect(eyeSessionTypeToRecoveryId('eye-reset')).not.toBe('comet-trace');
    expect(eyeSessionTypeToRecoveryId('cvs-protocol')).not.toBe('comet-trace');
  });

  it('old and new records both count as the same Eye Reset completion', () => {
    // Legacy 'eye-reset' records and the normalised 'cvs-protocol'
    // records must both resolve to the one recovery id, so a day with a mix
    // of old + new writes is never double-counted.
    const todayRecords = ['eye-reset', 'cvs-protocol'];
    const resolved = new Set(todayRecords.map(eyeSessionTypeToRecoveryId));
    expect(resolved).toEqual(new Set(['cvs-protocol']));
  });
});
