package expo.modules.mindpulsealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Triggered by AlarmManager at the scheduled wake time.
 *
 * A `setAlarmClock` alarm grants THIS receiver a short background-activity-launch
 * privilege when it fires. Modern Android (12+, and strictly enforced on 14/16)
 * blocks a foreground *service* from launching an activity, so we must start the
 * wake-up [AlarmActivity] here, in the receiver, while the grant is live — then
 * hand sound/vibration off to the [AlarmService].
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val label = intent.getStringExtra(AlarmState.EXTRA_LABEL) ?: AlarmState.DEFAULT_LABEL

    // One-shot alarm has fired — drop the saved schedule so a reboot won't re-arm it.
    AlarmScheduler.clearPersisted(context)

    // 1) Launch the wake-up screen from the receiver (it holds the BAL grant).
    val activityIntent = Intent(context, AlarmActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TASK or
          Intent.FLAG_ACTIVITY_NO_USER_ACTION,
      )
      putExtra(AlarmState.EXTRA_LABEL, label)
    }
    runCatching { context.startActivity(activityIntent) }

    // 2) Start the foreground service for the looping tone, vibration and the
    //    full-screen-intent notification (lock-screen fallback).
    val serviceIntent = Intent(context, AlarmService::class.java).apply {
      action = AlarmState.ACTION_START
      putExtra(AlarmState.EXTRA_LABEL, label)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }
}
