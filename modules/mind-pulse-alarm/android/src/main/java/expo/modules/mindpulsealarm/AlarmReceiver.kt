package expo.modules.mindpulsealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Triggered by AlarmManager at the scheduled wake time.
 *
 * The receiver starts the foreground ringing service. The service notification
 * owns the full-screen intent so Android can choose lock-screen full-screen UI
 * or an unlocked heads-up notification without a forced Activity launch.
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == AlarmState.ACTION_WAKE_UP) {
      AlarmDismissal.wakeUp(context, "notification")
      return
    }

    val label = intent.getStringExtra(AlarmState.EXTRA_LABEL) ?: AlarmState.DEFAULT_LABEL
    val ringtoneId = intent.getStringExtra(AlarmState.EXTRA_RINGTONE_ID)
    val resourceName = AlarmRingtoneCatalog.scheduleLogResourceName(ringtoneId)

    // One-shot alarm has fired — drop the saved schedule so a reboot won't re-arm it.
    AlarmScheduler.clearPersisted(context)
    AlarmDismissal.resetForNewAlarm()

    Log.i(
      "MindPulseAlarm",
      "FIRE alarmId=${AlarmState.ALARM_REQUEST_CODE} ringtoneKey=${ringtoneId ?: "null"} resolvedResource=$resourceName",
    )

    // Start the foreground service for the looping tone, vibration and the
    // full-screen-intent notification. Android decides whether to present the
    // full-screen Activity immediately (locked/screen-off) or a heads-up
    // notification (unlocked/user-active).
    val serviceIntent = Intent(context, AlarmService::class.java).apply {
      action = AlarmState.ACTION_START
      putExtra(AlarmState.EXTRA_LABEL, label)
      if (!ringtoneId.isNullOrBlank()) putExtra(AlarmState.EXTRA_RINGTONE_ID, ringtoneId)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }
}
