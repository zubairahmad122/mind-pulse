import { selectTopAppsSectionState } from '../topAppsSection';

describe('selectTopAppsSectionState', () => {
  it('is unavailable when there is no snapshot yet', () => {
    expect(selectTopAppsSectionState(null)).toEqual({ kind: 'unavailable' });
  });

  it('is unavailable when screenTimeTodayMs is null (query failed), never a fake empty/zero', () => {
    expect(selectTopAppsSectionState({ screenTimeTodayMs: null, topAppsToday: [] })).toEqual({
      kind: 'unavailable',
    });
  });

  it('is empty when the query succeeded but no app crossed the noise threshold today', () => {
    expect(selectTopAppsSectionState({ screenTimeTodayMs: 0, topAppsToday: [] })).toEqual({ kind: 'empty' });
  });

  it('is list once at least one app qualifies', () => {
    expect(
      selectTopAppsSectionState({
        screenTimeTodayMs: 60_000,
        topAppsToday: [{ packageName: 'com.a', appName: 'A', foregroundTimeMs: 60_000 }],
      }),
    ).toEqual({ kind: 'list' });
  });
});
