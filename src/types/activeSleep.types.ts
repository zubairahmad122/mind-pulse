/** Persisted in-progress sleep + alarm (survives app restart). */
export type ActiveSleepRecord = {
  presetId: string;
  startTime: number;
  wakeAt: number;
  alarmLabel: string;
  smartAlarmEnabled?: boolean;
};
