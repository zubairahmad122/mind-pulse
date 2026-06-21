package expo.modules.mindpulsealarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MindPulseAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val alarmManager: AlarmManager
    get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  override fun definition() = ModuleDefinition {
    Name("MindPulseAlarm")

    Events(AlarmState.EVENT_FIRED, AlarmState.EVENT_STOPPED)

    OnCreate {
      AlarmState.listener = { event, label ->
        runCatching { sendEvent(event, mapOf("label" to label)) }
      }
    }

    OnDestroy {
      AlarmState.listener = null
    }

    AsyncFunction("scheduleAlarm") { timestampMillis: Double, label: String ->
      val triggerAt = timestampMillis.toLong()
      AlarmScheduler.schedule(context, triggerAt, label)
      triggerAt.toString()
    }

    AsyncFunction("cancelAlarm") {
      AlarmScheduler.cancel(context)
      AlarmService.stop(context)
    }

    AsyncFunction("stopRinging") {
      AlarmService.stop(context)
    }

    AsyncFunction("isAlarmRinging") {
      AlarmState.isRinging
    }

    AsyncFunction("getRingingLabel") {
      AlarmState.label
    }

    AsyncFunction("getPermissionStatus") {
      permissionStatus()
    }

    AsyncFunction("requestAlarmPermissions") {
      requestPermissions()
      permissionStatus()
    }

    AsyncFunction("openAutostartSettings") {
      openAutostart()
    }
  }

  private fun hasNotifications(): Boolean {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return manager.areNotificationsEnabled()
  }

  private fun hasExactAlarm(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      alarmManager.canScheduleExactAlarms()
    } else {
      true
    }
  }

  private fun hasFullScreenIntent(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.canUseFullScreenIntent()
    } else {
      true
    }
  }

  private fun hasBatteryUnrestricted(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return pm.isIgnoringBatteryOptimizations(context.packageName)
  }

  private fun permissionStatus(): Map<String, Any> {
    val notifications = hasNotifications()
    val exactAlarm = hasExactAlarm()
    val fullScreenIntent = hasFullScreenIntent()
    return mapOf(
      "notifications" to notifications,
      "exactAlarm" to exactAlarm,
      "fullScreenIntent" to fullScreenIntent,
      "batteryUnrestricted" to hasBatteryUnrestricted(),
      "nativeAvailable" to true,
      // Battery exemption is strongly recommended but not strictly required for
      // setAlarmClock to fire, so it does not gate `ready`.
      "ready" to (notifications && exactAlarm && fullScreenIntent),
    )
  }

  private fun requestPermissions() {
    val activity = appContext.currentActivity

    // Runtime POST_NOTIFICATIONS prompt (Android 13+).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotifications()) {
      activity?.let {
        runCatching {
          it.requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"), 9921)
        }
      }
    }

    // Exact-alarm access is a settings screen, not a runtime prompt.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasExactAlarm()) {
      launchSettings(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, withPackage = true)
      return
    }

    // Full-screen-intent access (Android 14+) is also a settings screen.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !hasFullScreenIntent()) {
      launchSettings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, withPackage = true)
      return
    }

    // Battery-optimization exemption keeps the alarm alive through Doze.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !hasBatteryUnrestricted()) {
      launchSettings(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, withPackage = true)
    }
  }

  /** Best-effort deep link into OEM autostart settings (Xiaomi/Oppo/Vivo…). */
  private fun openAutostart(): Boolean {
    val candidates = listOf(
      "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
      "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
      "com.samsung.android.lool" to "com.samsung.android.sm.ui.battery.BatteryActivity",
      "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
    )
    for ((pkg, cls) in candidates) {
      val intent = Intent().apply {
        setClassName(pkg, cls)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      if (runCatching { context.startActivity(intent); true }.getOrDefault(false)) return true
    }
    // Fall back to the app details page.
    return runCatching {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
          .setData(Uri.fromParts("package", context.packageName, null))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
      true
    }.getOrDefault(false)
  }

  private fun launchSettings(action: String, withPackage: Boolean) {
    val intent = Intent(action).apply {
      if (withPackage) data = Uri.fromParts("package", context.packageName, null)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    runCatching { context.startActivity(intent) }
  }
}
