/**
 * Maps a persisted eye-session type (as stored by `eyeProgressPersistence`)
 * to the recovery-activity ID surfaced in the UI.
 *
 * Both `eye-reset` (the session type recorded by CVSProtocolScreen when an
 * Eye Reset completes) and `cvs-protocol` represent the same guided Eye
 * Reset activity. They must resolve to a single ID so "done today" checks
 * (e.g. the Eye landing screen's recommendation logic) treat a completed
 * reset as the Eye Reset being done — previously `eye-reset` mapped to the
 * removed Comet Trace activity, so a completed reset never counted.
 */
const SESSION_TYPE_TO_RECOVERY_ID: Record<string, string> = {
  'eye-reset': 'cvs-protocol',
  'cvs-protocol': 'cvs-protocol',
};

/** Resolves a stored eye-session type to its UI recovery-activity ID. */
export function eyeSessionTypeToRecoveryId(type: string): string {
  return SESSION_TYPE_TO_RECOVERY_ID[type] ?? type;
}
