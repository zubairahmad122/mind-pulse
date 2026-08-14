package expo.modules.mindpulsescreenusage

object SmartResetReminderEvaluator {
  const val LONG_SESSION_MINUTES = 30
  const val APP_SWITCH_HIGH_THRESHOLD = 20
  const val RESET_COOLDOWN_MINUTES = 30
  const val NOTIFICATION_COOLDOWN_MINUTES = 90

  enum class Reason {
    LONG_SESSION,
    FREQUENT_SWITCHING,
  }

  data class Input(
    val remindersEnabled: Boolean,
    val usageAccessGranted: Boolean,
    val notificationsGranted: Boolean,
    val currentSessionMs: Long?,
    val currentSessionAvailable: Boolean,
    val appSwitchesLast60Min: Int?,
    val appSwitchingAvailable: Boolean,
    val lastResetCompletedAt: Long?,
    val lastNotificationAt: Long?,
  )

  data class Decision(
    val eligible: Boolean,
    val reason: Reason? = null,
    val blockedBy: String? = null,
  )

  fun evaluate(input: Input, nowMs: Long): Decision {
    if (!input.remindersEnabled) return Decision(false, blockedBy = "disabled")
    if (!input.usageAccessGranted) return Decision(false, blockedBy = "usage-access")
    if (!input.notificationsGranted) return Decision(false, blockedBy = "notifications")

    if (input.lastNotificationAt != null &&
      nowMs - input.lastNotificationAt < NOTIFICATION_COOLDOWN_MINUTES * 60_000L
    ) {
      return Decision(false, blockedBy = "notification-cooldown")
    }

    if (input.lastResetCompletedAt != null &&
      nowMs - input.lastResetCompletedAt < RESET_COOLDOWN_MINUTES * 60_000L
    ) {
      return Decision(false, blockedBy = "reset-cooldown")
    }

    val longSession = input.currentSessionAvailable &&
      input.currentSessionMs != null &&
      input.currentSessionMs >= LONG_SESSION_MINUTES * 60_000L
    if (longSession && input.lastResetCompletedAt == null) {
      return Decision(true, Reason.LONG_SESSION)
    }

    val frequentSwitching = input.appSwitchingAvailable &&
      input.appSwitchesLast60Min != null &&
      input.appSwitchesLast60Min >= APP_SWITCH_HIGH_THRESHOLD
    if (frequentSwitching) {
      return Decision(true, Reason.FREQUENT_SWITCHING)
    }

    if (longSession) {
      return Decision(true, Reason.LONG_SESSION)
    }

    return Decision(false, blockedBy = "none")
  }
}
