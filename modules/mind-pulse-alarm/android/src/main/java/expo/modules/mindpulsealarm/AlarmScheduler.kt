package expo.modules.mindpulsealarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Single source of truth for arming/cancelling the OS alarm. Persists the next
 * alarm so it can be re-armed after a reboot (alarms are cleared on restart).
 */
object AlarmScheduler {
  private const val PREFS = "mindpulse_alarm_prefs"
  private const val KEY_TIME = "alarm_time"
  private const val KEY_LABEL = "alarm_label"

  fun schedule(context: Context, triggerAtMillis: Long, label: String) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    // setAlarmClock is exact, exempt from Doze, and shows the system alarm icon.
    val info = AlarmManager.AlarmClockInfo(triggerAtMillis, activityPendingIntent(context))
    manager.setAlarmClock(info, broadcastPendingIntent(context, label))
    persist(context, triggerAtMillis, label)
  }

  fun cancel(context: Context) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.cancel(broadcastPendingIntent(context, AlarmState.DEFAULT_LABEL))
    clearPersisted(context)
  }

  /** Re-arm a saved future alarm (called from BootReceiver). */
  fun rescheduleFromStorage(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val time = prefs.getLong(KEY_TIME, 0L)
    val label = prefs.getString(KEY_LABEL, AlarmState.DEFAULT_LABEL) ?: AlarmState.DEFAULT_LABEL
    if (time > System.currentTimeMillis()) {
      schedule(context, time, label)
    } else {
      clearPersisted(context)
    }
  }

  fun clearPersisted(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  private fun persist(context: Context, time: Long, label: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putLong(KEY_TIME, time)
      .putString(KEY_LABEL, label)
      .apply()
  }

  private fun broadcastPendingIntent(context: Context, label: String): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = AlarmState.ACTION_START
      putExtra(AlarmState.EXTRA_LABEL, label)
    }
    return PendingIntent.getBroadcast(context, AlarmState.ALARM_REQUEST_CODE, intent, flags())
  }

  private fun activityPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, AlarmActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
    return PendingIntent.getActivity(context, 2, intent, flags())
  }

  private fun flags(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
  }
}
