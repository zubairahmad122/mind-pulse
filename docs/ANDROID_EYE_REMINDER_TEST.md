# Android Eye Reminder Reliability Test

The automated preflight command is:

```bash
npm run validate:eye-reminders:android
```

No Android device was connected when this package was created. A real-device pass
is required before notification reliability can be marked complete.

## Required devices

- Google Pixel or Android One device
- Samsung device
- Xiaomi, Oppo, Vivo, or another vendor with aggressive battery management
- At least Android 13 and one older supported Android version when available

## Test matrix

Run each row with a 20-minute reminder interval.

| Scenario | Expected result | Pass |
|---|---|---|
| App foreground | Reminder appears and opens Eye Break | [ ] |
| App background | Reminder appears within the expected OS tolerance | [ ] |
| App force-stopped, then reopened | Schedule repairs after reopening | [ ] |
| Screen locked | Reminder appears on lock screen if OS settings allow | [ ] |
| Battery Saver enabled | Behavior and delay are recorded | [ ] |
| App battery mode set to Restricted | Limitation is recorded for the user | [ ] |
| Device rebooted | Scheduled reminders resume or repair on next launch | [ ] |
| Weekday 9–5 schedule | Nothing appears outside selected hours | [ ] |
| Custom selected days | Nothing appears on excluded days | [ ] |
| Snooze action | One reminder appears roughly 10 minutes later | [ ] |
| Permission revoked | App toggle repairs to off on next launch | [ ] |

## Evidence to record

- device manufacturer/model;
- Android version;
- app build and commit;
- battery mode;
- expected and actual delivery timestamps;
- screenshot of notification;
- output from `scripts/validate-eye-reminders-android.sh`;
- failures after reboot, force-stop, or battery restriction.

## Release gate

Do not describe reminders as guaranteed. Pass on Pixel and Samsung, document
vendor-specific battery instructions, and retain the in-app self-healing schedule.
