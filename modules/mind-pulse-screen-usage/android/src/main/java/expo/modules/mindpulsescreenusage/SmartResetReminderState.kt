package expo.modules.mindpulsescreenusage

import android.content.Context

object SmartResetReminderState {
  private const val PREFS = "mindpulse_screen_balance_reminders"
  private const val KEY_ENABLED = "smart_reset_reminders_enabled"
  private const val KEY_LAST_NOTIFICATION_AT = "last_smart_reset_notification_at"
  private const val KEY_LAST_NOTIFICATION_REASON = "last_smart_reset_notification_reason"
  private const val KEY_LAST_RESET_COMPLETED_AT = "last_reset_completed_at"

  data class Status(
    val enabled: Boolean,
    val lastNotificationAt: Long?,
    val lastNotificationReason: String?,
    val lastResetCompletedAt: Long?,
  )

  fun load(context: Context): Status {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val lastNotificationAt = prefs.getLong(KEY_LAST_NOTIFICATION_AT, 0L).takeIf { it > 0L }
    val lastResetCompletedAt = prefs.getLong(KEY_LAST_RESET_COMPLETED_AT, 0L).takeIf { it > 0L }
    return Status(
      enabled = prefs.getBoolean(KEY_ENABLED, false),
      lastNotificationAt = lastNotificationAt,
      lastNotificationReason = prefs.getString(KEY_LAST_NOTIFICATION_REASON, null),
      lastResetCompletedAt = lastResetCompletedAt,
    )
  }

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .apply()
  }

  fun setLastResetCompletedAt(context: Context, timestampMs: Long?) {
    val edit = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
    if (timestampMs != null && timestampMs > 0L) {
      edit.putLong(KEY_LAST_RESET_COMPLETED_AT, timestampMs)
    } else {
      edit.remove(KEY_LAST_RESET_COMPLETED_AT)
    }
    edit.apply()
  }

  fun markNotificationSent(
    context: Context,
    timestampMs: Long,
    reason: SmartResetReminderEvaluator.Reason,
  ) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putLong(KEY_LAST_NOTIFICATION_AT, timestampMs)
      .putString(KEY_LAST_NOTIFICATION_REASON, reason.name.lowercase())
      .apply()
  }
}
