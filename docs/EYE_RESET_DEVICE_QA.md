# Eye Reset — Physical Android Device QA Checklist

Phase 1C adds background/lock handling to the Eye Reset (CVS Protocol) session.
The automated suites (`cvsLifecycle`, `cvsSessionTimer`, `useSessionLifecycle`,
`useSessionClock`) cover the logic, but device-level QA is required because
AppState timing, audio interruption and JS suspension are platform behaviors
that cannot be fully simulated in Jest.

**Setup:** build & install a debug APK (`npm run build:apk` / `./scripts/build-apk.sh`),
run with the screen unlocked, volume up, and a stable network (for Firestore).

---

## 1. Start Eye Reset

| Step | Expected |
| --- | --- |
| Open Eye tab → Eye Reset → Start Session | Check-in before appears |
| Select comfort (or Skip check-in) | Calibration plays; 3-2-1 countdown; first exercise starts |
| Watch first 10s | Voice guidance plays; timer counts down 1s at a time; TRACKING badge shows |

**Pass ☐ / Fail ☐**

---

## 2. Lock / unlock the phone mid-step

| Step | Expected |
| --- | --- |
| Start a step, let ~5s elapse, press the power button to lock | Step freezes |
| Wait 60s, unlock | **Paused overlay** is shown (not auto-resumed); remaining time is unchanged (e.g. still 20s) |
| Tap Resume Session | 3-2-1 beat, then the step continues from the exact remaining time — the step was NOT reset |

**Pass ☐ / Fail ☐** — record the remaining time before/after: `__s → __s`

---

## 3. Minimize / restore the app mid-step

| Step | Expected |
| --- | --- |
| Start a step, tap Home (or gesture) to minimize | Step freezes; voice pauses |
| Stay away >2 min (longer than the remaining step time) | No auto-advance: on return the SAME step is still paused at the same remaining time |
| Restore the app | Paused overlay shown; resume from exact remaining time |

**Pass ☐ / Fail ☐**

---

## 4. Answer a call / audio interruption

| Step | Expected |
| --- | --- |
| Start a step with voice playing, receive an incoming call and answer | Step freezes (AppState background); voice stops |
| End the call, return to the app | Paused overlay; voice does not play over the call |
| Resume Session | Voice resumes in sync with the step; no double narration, no stuck audio |

**Pass ☐ / Fail ☐**

---

## 5. Rapid app switching

| Step | Expected |
| --- | --- |
| Start a step, then quickly switch Home ⇄ app 10+ times | Remaining time stays frozen each time away; no time is lost or double-counted |
| Finally resume | Timer continues from the pre-switch remaining time |
| Complete the step | Exactly ONE "Complete → Next" interstitial; next step starts fresh |

**Pass ☐ / Fail ☐**

---

## 6. Manual pause, then background

| Step | Expected |
| --- | --- |
| Tap Pause Session, then background the app | Stays paused (no double pause card, no timer movement) |
| Restore the app | Still paused; Resume works from exact remaining time |
| (Also) background WITHOUT manual pause, restore, then tap End Session | Exit confirm appears; leaving discards the exercise (no completion write) |

**Pass ☐ / Fail ☐**

## 6b. Background during the 3-2-1 resume beat

| Step | Expected |
| --- | --- |
| Pause, tap Resume Session (3-2-1 starts), then immediately background the app | The resume beat cancels; the session must NOT auto-resume while away |
| Restore the app | Paused overlay is still shown (voice stays paused); tap Resume Session again to continue |
| Complete the step after resuming | Normal completion; exactly one record |

**Pass ☐ / Fail ☐**

---

## 7. Background during the "Complete → Next" interstitial

| Step | Expected |
| --- | --- |
| Let a step finish so the ✓ beat appears, immediately background the app | No step auto-advances while away |
| Restore the app | The beat finishes; you land paused on the NEXT step (or the current one completes normally if the swap already ran) — never a stuck interstitial |

**Pass ☐ / Fail ☐**

---

## 8. Background during the 20-20-20 recovery / comfort check-in

| Step | Expected |
| --- | --- |
| Background during recovery countdown | Recovery does not auto-finish while away; resumes counting on return |
| Background during the after-check-in | Check-in stays put; nothing is auto-saved |

**Pass ☐ / Fail ☐**

---

## 9. Complete the session — progress + records

| Step | Expected |
| --- | --- |
| Finish all 7 exercises + recovery, answer after-check-in, Save & Finish | Completion screen; **exactly one** record written |
| Return to the Eye landing | Recommendation marks complete; eye score updated |
| Open the exercise counter (Home weekly dots / progress) | Counter incremented by exactly **one** for the whole session |
| Check Firestore `eyeSessions` + `eyeComfort` + local AsyncStorage | One `cvs-protocol` record (no legacy `eye-reset`, no duplicates) |

**Pass ☐ / Fail ☐**

---

## 10. Duration correctness

| Step | Expected |
| --- | --- |
| Time the full session with a stopwatch (excluding pauses/background) | ~3 min 30 sec of active time (25+25+25+30+30+40+35) |
| Idle screen + summary chips | Show "3 min 30 sec" / "3m 30s" |

**Pass ☐ / Fail ☐**

---

## 11. Repeat session

| Step | Expected |
| --- | --- |
| Tap Repeat → complete again | A second `cvs-protocol` record; counter increments once more (total 2 for two sessions) |

**Pass ☐ / Fail ☐**

---

## Sign-off

| Device / Android version | Build | Date | Result |
| --- | --- | --- | --- |
|  |  |  | ☐ All pass  ☐ Issues (list): |

**Known remaining risk:** the calibrate intro voice can keep playing if the app
is backgrounded during calibration (voice-only phase); the session itself stays
frozen and safe. Track as a follow-up if it reproduces on your device.
