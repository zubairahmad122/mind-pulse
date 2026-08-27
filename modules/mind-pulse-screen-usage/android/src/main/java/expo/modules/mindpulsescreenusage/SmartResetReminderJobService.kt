package expo.modules.mindpulsescreenusage

import android.app.AppOpsManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobParameters
import android.app.job.JobService
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import java.util.Calendar

private const val SESSION_LOOKBACK_MS = 6 * 60 * 60 * 1000L
private const val APP_SWITCH_WINDOW_MS = 60 * 60 * 1000L
private const val SYSTEM_UI_PACKAGE = "com.android.systemui"

class SmartResetReminderJobService : JobService() {
  override fun onStartJob(params: JobParameters): Boolean {
    Thread {
      runCatching { evaluateAndNotify() }
      jobFinished(params, false)
    }.start()
    return true
  }

  override fun onStopJob(params: JobParameters): Boolean = true

  private fun evaluateAndNotify() {
    val now = System.currentTimeMillis()
    val state = SmartResetReminderState.load(this)
    val usageAccess = hasUsageAccess()
    val notifications = notificationsEnabled()
    val snapshot = if (usageAccess) readSnapshot(now) else UsageSnapshot.empty()
    val decision = SmartResetReminderEvaluator.evaluate(
      SmartResetReminderEvaluator.Input(
        remindersEnabled = state.enabled,
        usageAccessGranted = usageAccess,
        notificationsGranted = notifications,
        currentSessionMs = snapshot.currentSessionMs,
        currentSessionAvailable = snapshot.currentSessionAvailable,
        appSwitchesLast60Min = snapshot.appSwitchesLast60Min,
        appSwitchingAvailable = snapshot.appSwitchingAvailable,
        lastResetCompletedAt = state.lastResetCompletedAt,
        lastNotificationAt = state.lastNotificationAt,
      ),
      now,
    )
    val reason = decision.reason ?: return
    postNotification(reason, now)
    SmartResetReminderState.markNotificationSent(this, now, reason)
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun notificationsEnabled(): Boolean {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return manager.areNotificationsEnabled()
  }

  private fun readSnapshot(now: Long): UsageSnapshot {
    val startOfDay = startOfLocalDayMs(now)
    val queryStart = minOf(startOfDay, now - SESSION_LOOKBACK_MS, now - APP_SWITCH_WINDOW_MS)
    val events = queryEvents(queryStart, now)
    val sessionAvailable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
    val session = if (sessionAvailable) {
      ScreenUsageCalculator.computeSession(events, now)
    } else {
      ScreenUsageCalculator.SessionResult(null, null, available = false)
    }
    val appSwitches = if (sessionAvailable) {
      ScreenUsageCalculator.computeAppSwitches(
        events,
        windowStart = now - APP_SWITCH_WINDOW_MS,
        windowEnd = now,
        excludedPackages = setOf(packageName),
        launcherPackages = setOfNotNull(currentLauncherPackage(), SYSTEM_UI_PACKAGE),
      )
    } else {
      null
    }
    return UsageSnapshot(
      currentSessionMs = session.currentSessionMs,
      currentSessionAvailable = session.available,
      appSwitchesLast60Min = appSwitches,
      appSwitchingAvailable = sessionAvailable,
    )
  }

  private fun queryEvents(startMs: Long, endMs: Long): List<UsageEventRecord> {
    val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val usageEvents = usageStatsManager.queryEvents(startMs, endMs)
    val out = ArrayList<UsageEventRecord>()
    val event = UsageEvents.Event()
    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)
      out.add(UsageEventRecord(event.eventType, event.timeStamp, event.packageName))
    }
    return out
  }

  private fun currentLauncherPackage(): String? {
    val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return runCatching {
      packageManager.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
    }.getOrNull()
  }

  private fun startOfLocalDayMs(nowMs: Long): Long {
    val calendar = Calendar.getInstance()
    calendar.timeInMillis = nowMs
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
  }

  private fun postNotification(reason: SmartResetReminderEvaluator.Reason, now: Long) {
    createChannel()
    val (title, body, reset) = when (reason) {
      SmartResetReminderEvaluator.Reason.FREQUENT_SWITCHING ->
        Triple("Take a moment to reset", "You've been moving between apps frequently.", "offline")
      SmartResetReminderEvaluator.Reason.LONG_SESSION ->
        Triple("Time for a quick reset", "You've been on screen for a while.", "eye-break")
    }
    val uri = Uri.parse(
      "mindpulse:///smart-reset?reason=${reason.name.lowercase()}&recommendedReset=$reset&notificationId=$now",
    )
    val pending = PendingIntent.getActivity(
      this,
      SmartResetReminderScheduler.NOTIFICATION_ID,
      Intent(Intent.ACTION_VIEW, uri).apply {
        setPackage(packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      },
      pendingFlags(),
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, SmartResetReminderScheduler.CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
        .setPriority(Notification.PRIORITY_DEFAULT)
    }

    val notification = builder
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setContentIntent(pending)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_REMINDER)
      .build()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(SmartResetReminderScheduler.NOTIFICATION_ID, notification)
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(
        SmartResetReminderScheduler.CHANNEL_ID,
        "Smart Reset reminders",
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = "Gentle Screen Balance reset reminders"
      },
    )
  }

  private fun pendingFlags(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
  }

  private data class UsageSnapshot(
    val currentSessionMs: Long?,
    val currentSessionAvailable: Boolean,
    val appSwitchesLast60Min: Int?,
    val appSwitchingAvailable: Boolean,
  ) {
    companion object {
      fun empty() = UsageSnapshot(null, false, null, false)
    }
  }
}
