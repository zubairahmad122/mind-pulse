import { createDuplicateSaveGuard, createSessionResultId } from '../sessionResultId';

describe('createSessionResultId', () => {
  it('generates unique ids across many calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createSessionResultId()));
    expect(ids.size).toBe(200);
  });

  it('is a non-empty string', () => {
    const id = createSessionResultId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('createDuplicateSaveGuard', () => {
  it('claims a fresh id successfully', () => {
    const guard = createDuplicateSaveGuard();
    expect(guard.claim('session_1')).toBe(true);
  });

  it('rejects the same id claimed twice', () => {
    const guard = createDuplicateSaveGuard();
    expect(guard.claim('session_1')).toBe(true);
    expect(guard.claim('session_1')).toBe(false);
  });

  it('treats different ids independently', () => {
    const guard = createDuplicateSaveGuard();
    expect(guard.claim('a')).toBe(true);
    expect(guard.claim('b')).toBe(true);
    expect(guard.claim('a')).toBe(false);
    expect(guard.claim('b')).toBe(false);
  });
});
