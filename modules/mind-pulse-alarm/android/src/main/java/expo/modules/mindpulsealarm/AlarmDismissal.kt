package expo.modules.mindpulsealarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

object AlarmDismissal {
  private const val TAG = "MindPulseAlarm"
  private val wakeHandled = AtomicBoolean(false)

  fun resetForNewAlarm() {
    wakeHandled.set(false)
  }

  fun stopOnly(context: Context, source: String) {
    requestServiceStop(context)
    cancelNotification(context)
    AlarmState.markStopped()
    Log.i(TAG, "STOP source=$source serviceStopRequested=true notificationCancelled=true")
  }

  fun wakeUp(context: Context, source: String): Boolean {
    if (!wakeHandled.compareAndSet(false, true)) {
      Log.i(TAG, "WAKE_UP source=$source ignored=alreadyHandled")
      return false
    }

    requestServiceStop(context)
    cancelNotification(context)
    AlarmScheduler.clearPersisted(context)
    AlarmState.markStopped()
    val launched = launchMindPulse(context)
    Log.i(
      TAG,
      "WAKE_UP source=$source serviceStopRequested=true notificationCancelled=true mainAppLaunchAttempted=true launchResult=$launched",
    )
    return launched
  }

  private fun requestServiceStop(context: Context) {
    val intent = Intent(context, AlarmService::class.java).apply {
      action = AlarmState.ACTION_STOP
    }
    runCatching { context.startService(intent) }
      .onFailure { runCatching { context.stopService(Intent(context, AlarmService::class.java)) } }
  }

  private fun cancelNotification(context: Context) {
    runCatching {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.cancel(AlarmState.NOTIFICATION_ID)
    }
  }

  private fun launchMindPulse(context: Context): Boolean {
    val flags = Intent.FLAG_ACTIVITY_NEW_TASK or
      Intent.FLAG_ACTIVITY_CLEAR_TOP or
      Intent.FLAG_ACTIVITY_SINGLE_TOP

    val sleepIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mindpulse://sleep")).apply {
      setPackage(context.packageName)
      addFlags(flags)
      putExtra(AlarmState.EXTRA_OPEN_SOURCE, "alarm_wake_up")
    }

    if (sleepIntent.resolveActivity(context.packageManager) != null) {
      return runCatching {
        context.startActivity(sleepIntent)
        true
      }.getOrDefault(false)
    }

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?.apply {
        addFlags(flags)
        putExtra(AlarmState.EXTRA_OPEN_SOURCE, "alarm_wake_up")
      }

    return launchIntent?.let {
      runCatching {
        context.startActivity(it)
        true
      }.getOrDefault(false)
    } ?: false
  }
}
