/**
 * Process-local flag so background jobs (usage alerts, Smart Reset) can
 * avoid interrupting an in-progress eye break. Cleared on unmount / complete.
 */
let active = false;

export function setEyeBreakActive(next: boolean): void {
  active = next;
}

export function isEyeBreakActive(): boolean {
  return active;
}
