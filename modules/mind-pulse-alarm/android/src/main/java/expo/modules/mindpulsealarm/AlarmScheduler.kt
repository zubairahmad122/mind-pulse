package expo.modules.mindpulsealarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Single source of truth for arming/cancelling the OS alarm. Persists the next
 * alarm so it can be re-armed after a reboot (alarms are cleared on restart).
 */
object AlarmScheduler {
  private const val TAG = "MindPulseAlarm"
  private const val PREFS = "mindpulse_alarm_prefs"
  private const val KEY_TIME = "alarm_time"
  private const val KEY_LABEL = "alarm_label"
  private const val KEY_RINGTONE_ID = "alarm_ringtone_id"

  fun schedule(context: Context, triggerAtMillis: Long, label: String, ringtoneId: String?) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val resourceName = AlarmRingtoneCatalog.scheduleLogResourceName(ringtoneId)
    val resourceId = context.resources.getIdentifier(resourceName, "raw", context.packageName)
    Log.i(
      TAG,
      "SCHEDULE alarmId=${AlarmState.ALARM_REQUEST_CODE} triggerAt=$triggerAtMillis selectedRingtone=${ringtoneId ?: "null"} resolvedResource=$resourceName/$resourceId",
    )
    // setAlarmClock is exact, exempt from Doze, and shows the system alarm icon.
    val info = AlarmManager.AlarmClockInfo(triggerAtMillis, activityPendingIntent(context, label, ringtoneId))
    manager.setAlarmClock(info, broadcastPendingIntent(context, label, ringtoneId))
    persist(context, triggerAtMillis, label, ringtoneId)
  }

  fun cancel(context: Context) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.cancel(broadcastPendingIntent(context, AlarmState.DEFAULT_LABEL, null))
    clearPersisted(context)
    Log.i(TAG, "CANCEL alarmId=${AlarmState.ALARM_REQUEST_CODE}")
  }

  /** Re-arm a saved future alarm (called from BootReceiver). */
  fun rescheduleFromStorage(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val time = prefs.getLong(KEY_TIME, 0L)
    val label = prefs.getString(KEY_LABEL, AlarmState.DEFAULT_LABEL) ?: AlarmState.DEFAULT_LABEL
    val ringtoneId = prefs.getString(KEY_RINGTONE_ID, null)
    if (time > System.currentTimeMillis()) {
      Log.i(
        TAG,
        "RESTORE alarmId=${AlarmState.ALARM_REQUEST_CODE} triggerAt=$time selectedRingtone=${ringtoneId ?: "null"} resolvedResource=${AlarmRingtoneCatalog.scheduleLogResourceName(ringtoneId)}",
      )
      schedule(context, time, label, ringtoneId)
    } else {
      clearPersisted(context)
    }
  }

  fun clearPersisted(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  private fun persist(context: Context, time: Long, label: String, ringtoneId: String?) {
    val edit = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putLong(KEY_TIME, time)
      .putString(KEY_LABEL, label)
    if (ringtoneId.isNullOrBlank()) edit.remove(KEY_RINGTONE_ID) else edit.putString(KEY_RINGTONE_ID, ringtoneId)
    edit.apply()
  }

  private fun broadcastPendingIntent(context: Context, label: String, ringtoneId: String?): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = AlarmState.ACTION_START
      putExtra(AlarmState.EXTRA_LABEL, label)
      if (!ringtoneId.isNullOrBlank()) putExtra(AlarmState.EXTRA_RINGTONE_ID, ringtoneId)
    }
    return PendingIntent.getBroadcast(context, AlarmState.ALARM_REQUEST_CODE, intent, flags())
  }

  private fun activityPendingIntent(context: Context, label: String, ringtoneId: String?): PendingIntent {
    val intent = Intent(context, AlarmActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
      putExtra(AlarmState.EXTRA_LABEL, label)
      if (!ringtoneId.isNullOrBlank()) putExtra(AlarmState.EXTRA_RINGTONE_ID, ringtoneId)
    }
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
