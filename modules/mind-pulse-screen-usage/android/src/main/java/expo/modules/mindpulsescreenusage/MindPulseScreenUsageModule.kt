package expo.modules.mindpulsescreenusage

import android.app.AppOpsManager
import android.app.NotificationManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

/**
 * Bounds the raw `queryEvents` window: today's total only ever sums events
 * from local midnight onward, but the continuous-session boundary can start
 * before midnight (e.g. still on screen at 12:05am after a late session) —
 * this look-back catches that without pulling a full day+ of history when
 * it's the small hours already.
 */
private const val SESSION_LOOKBACK_MS = 6 * 60 * 60 * 1000L

/** "App Switches" only ever looks at the last hour — see `ScreenUsageCalculator.computeAppSwitches`. */
private const val APP_SWITCH_WINDOW_MS = 60 * 60 * 1000L

/** Well-known AOSP System UI package — stable across OEMs, unlike the launcher. */
private const val SYSTEM_UI_PACKAGE = "com.android.systemui"

class MindPulseScreenUsageModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MindPulseScreenUsage")

    // AsyncFunction bodies run off the JS/UI thread by default — UsageStatsManager
    // queries never block React Native's UI thread.
    AsyncFunction("hasUsageAccess") {
      hasUsageAccess()
    }

    AsyncFunction("openUsageAccessSettings") {
      openUsageAccessSettings()
    }

    AsyncFunction("getScreenUsageSnapshot") {
      snapshot()
    }

    AsyncFunction("getSmartResetReminderStatus") {
      smartResetReminderStatus()
    }

    AsyncFunction("setSmartResetRemindersEnabled") { enabled: Boolean, lastResetCompletedAt: Double? ->
      SmartResetReminderState.setEnabled(context, enabled)
      SmartResetReminderState.setLastResetCompletedAt(context, lastResetCompletedAt?.toLong())
      if (enabled) {
        SmartResetReminderScheduler.schedule(context.applicationContext)
      } else {
        SmartResetReminderScheduler.cancel(context.applicationContext)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(SmartResetReminderScheduler.NOTIFICATION_ID)
      }
      smartResetReminderStatus()
    }

    AsyncFunction("setSmartResetLastResetCompletedAt") { lastResetCompletedAt: Double? ->
      SmartResetReminderState.setLastResetCompletedAt(context, lastResetCompletedAt?.toLong())
    }
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun smartResetReminderStatus(): Map<String, Any?> {
    val state = SmartResetReminderState.load(context)
    return mapOf(
      "enabled" to state.enabled,
      "lastNotificationAt" to state.lastNotificationAt,
      "lastNotificationReason" to state.lastNotificationReason,
      "lastResetCompletedAt" to state.lastResetCompletedAt,
      "notificationsGranted" to notificationsEnabled(),
      "usageAccessGranted" to hasUsageAccess(),
      "checkIntervalMinutes" to SmartResetReminderScheduler.CHECK_INTERVAL_MINUTES,
      "notificationCooldownMinutes" to SmartResetReminderEvaluator.NOTIFICATION_COOLDOWN_MINUTES,
      "nativeAvailable" to true,
    )
  }

  private fun notificationsEnabled(): Boolean {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return manager.areNotificationsEnabled()
  }

  /** Best-effort deep link into MindPulse's own row in Usage Access settings. */
  private fun openUsageAccessSettings() {
    val direct = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      data = Uri.fromParts("package", context.packageName, null)
    }
    if (runCatching { context.startActivity(direct); true }.getOrDefault(false)) return

    // Some OEMs don't support the package-scoped deep link — fall back to
    // the general Usage Access list.
    runCatching {
      context.startActivity(
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
  }

  /** See [ScreenUsageCalculator] for the exact per-metric calculation rules. */
  private fun snapshot(): Map<String, Any?> {
    val now = System.currentTimeMillis()
    if (!hasUsageAccess()) return emptySnapshot(hasPermission = false, now = now)

    val startOfDay = startOfLocalDayMs(now)
    // Dominated by SESSION_LOOKBACK_MS today (6h > 1h), but computed
    // explicitly so a future retune of either window can't silently
    // under-fetch the other's context.
    val queryStart = minOf(startOfDay, now - SESSION_LOOKBACK_MS, now - APP_SWITCH_WINDOW_MS)

    val events = runCatching { queryEvents(queryStart, now) }.getOrNull()
      ?: return emptySnapshot(hasPermission = true, now = now)

    val perAppMs = ScreenUsageCalculator.computePerAppForegroundMs(
      events, startOfDay, now, context.packageName,
    )
    val screenTimeTodayMs = perAppMs.values.sum()
    val launcherPackage = currentLauncherPackage()
    val topApps = ScreenUsageCalculator.computeTopApps(
      perAppMs, excludePackages = setOfNotNull(launcherPackage),
    )
    val sessionAvailable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
    val session = if (sessionAvailable) {
      ScreenUsageCalculator.computeSession(events, now)
    } else {
      ScreenUsageCalculator.SessionResult(currentSessionMs = null, lastSessionMs = null, available = false)
    }
    val appSwitchesLast60Min = if (sessionAvailable) {
      ScreenUsageCalculator.computeAppSwitches(
        events,
        windowStart = now - APP_SWITCH_WINDOW_MS,
        windowEnd = now,
        excludedPackages = setOf(context.packageName),
        launcherPackages = setOfNotNull(launcherPackage, SYSTEM_UI_PACKAGE),
      )
    } else {
      null
    }

    return mapOf(
      "hasPermission" to true,
      "screenTimeTodayMs" to screenTimeTodayMs,
      "currentSessionMs" to session.currentSessionMs,
      "lastSessionMs" to session.lastSessionMs,
      "currentSessionAvailable" to session.available,
      "topAppsToday" to topApps.map(::resolveAppUsageItem),
      "appSwitchesLast60Min" to appSwitchesLast60Min,
      "appSwitchingAvailable" to sessionAvailable,
      "calculatedAt" to now,
    )
  }

  private fun emptySnapshot(hasPermission: Boolean, now: Long): Map<String, Any?> = mapOf(
    "hasPermission" to hasPermission,
    "screenTimeTodayMs" to null,
    "currentSessionMs" to null,
    "lastSessionMs" to null,
    "currentSessionAvailable" to false,
    "topAppsToday" to emptyList<Map<String, Any?>>(),
    "appSwitchesLast60Min" to null,
    "appSwitchingAvailable" to false,
    "calculatedAt" to now,
  )

  /**
   * Resolves the human-readable app label for one top-app entry — only ever
   * called for the final ≤[ScreenUsageCalculator.TOP_APPS_MAX] entries, not
   * every package used today. No icon bytes are resolved/transmitted (see
   * `AppUsageItem` in `screenUsage.types.ts`); the UI renders a monogram.
   */
  private fun resolveAppUsageItem(app: ScreenUsageCalculator.AppUsageTotal): Map<String, Any?> = mapOf(
    "packageName" to app.packageName,
    "appName" to resolveAppLabel(app.packageName),
    "foregroundTimeMs" to app.foregroundTimeMs,
    "iconAvailable" to true,
  )

  /**
   * Tries progressively looser strategies before giving up on a real label:
   * the app's own label, then its launcher activity's label (some apps only
   * set a label on their launch activity, not `<application>` itself), then
   * a humanized package name. A resolved label equal to the raw package
   * name (some OEM builds return that instead of throwing) is treated as
   * "not resolved" so the next strategy still gets a chance.
   */
  private fun resolveAppLabel(packageName: String): String {
    val pm = context.packageManager

    runCatching {
      val info = pm.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
      pm.getApplicationLabel(info).toString().trim()
    }.getOrNull()?.takeIf { it.isNotEmpty() && it != packageName }?.let { return it }

    runCatching {
      val component = pm.getLaunchIntentForPackage(packageName)?.component ?: return@runCatching null
      pm.getActivityInfo(component, 0).loadLabel(pm).toString().trim()
    }.getOrNull()?.takeIf { it.isNotEmpty() && it != packageName }?.let { return it }

    return ScreenUsageCalculator.humanizePackageName(packageName)
  }

  /** The device's current default HOME/launcher package, if resolvable — infrastructure, not meaningful app usage. */
  private fun currentLauncherPackage(): String? {
    val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return runCatching {
      context.packageManager.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
    }.getOrNull()
  }

  private fun queryEvents(startMs: Long, endMs: Long): List<UsageEventRecord> {
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val usageEvents = usageStatsManager.queryEvents(startMs, endMs)
    val out = ArrayList<UsageEventRecord>()
    val event = UsageEvents.Event()
    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)
      out.add(UsageEventRecord(event.eventType, event.timeStamp, event.packageName))
    }
    return out
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
}
