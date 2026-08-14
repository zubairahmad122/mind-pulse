package expo.modules.mindpulsescreenusage

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import android.os.Build

object SmartResetReminderScheduler {
  private const val JOB_ID = 9107
  const val NOTIFICATION_ID = 9108
  const val CHANNEL_ID = "screen-balance-smart-reset-v1"
  const val CHECK_INTERVAL_MINUTES = 15

  fun schedule(context: Context) {
    val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
    val component = ComponentName(context, SmartResetReminderJobService::class.java)
    val info = buildInfo(component, persisted = true)
    val scheduled = runCatching { scheduler.schedule(info) }.isSuccess
    if (!scheduled) scheduler.schedule(buildInfo(component, persisted = false))
  }

  private fun buildInfo(component: ComponentName, persisted: Boolean): JobInfo {
    return JobInfo.Builder(JOB_ID, component)
      .setPeriodic(CHECK_INTERVAL_MINUTES * 60_000L)
      .setPersisted(persisted)
      .setRequiresBatteryNotLow(true)
      .apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          setRequiresStorageNotLow(true)
        }
      }
      .build()
  }

  fun cancel(context: Context) {
    val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
    scheduler.cancel(JOB_ID)
  }
}
