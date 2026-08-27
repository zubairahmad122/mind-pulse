package expo.modules.mindpulsescreenusage

import expo.modules.mindpulsescreenusage.SmartResetReminderEvaluator.Reason
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SmartResetReminderEvaluatorTest {
  private val now = 10_000_000L

  private fun input(
    remindersEnabled: Boolean = true,
    usageAccessGranted: Boolean = true,
    notificationsGranted: Boolean = true,
    currentSessionMs: Long? = null,
    currentSessionAvailable: Boolean = false,
    appSwitchesLast60Min: Int? = null,
    appSwitchingAvailable: Boolean = false,
    lastResetCompletedAt: Long? = null,
    lastNotificationAt: Long? = null,
  ) = SmartResetReminderEvaluator.Input(
    remindersEnabled = remindersEnabled,
    usageAccessGranted = usageAccessGranted,
    notificationsGranted = notificationsGranted,
    currentSessionMs = currentSessionMs,
    currentSessionAvailable = currentSessionAvailable,
    appSwitchesLast60Min = appSwitchesLast60Min,
    appSwitchingAvailable = appSwitchingAvailable,
    lastResetCompletedAt = lastResetCompletedAt,
    lastNotificationAt = lastNotificationAt,
  )

  @Test
  fun `disabled reminders do not notify`() {
    val decision = SmartResetReminderEvaluator.evaluate(input(remindersEnabled = false), now)
    assertFalse(decision.eligible)
    assertEquals("disabled", decision.blockedBy)
  }

  @Test
  fun `notification permission denied does not notify`() {
    val decision = SmartResetReminderEvaluator.evaluate(input(notificationsGranted = false), now)
    assertFalse(decision.eligible)
    assertEquals("notifications", decision.blockedBy)
  }

  @Test
  fun `Usage Access denied does not notify`() {
    val decision = SmartResetReminderEvaluator.evaluate(input(usageAccessGranted = false), now)
    assertFalse(decision.eligible)
    assertEquals("usage-access", decision.blockedBy)
  }

  @Test
  fun `normal usage does not notify`() {
    val decision = SmartResetReminderEvaluator.evaluate(
      input(
        currentSessionMs = 18 * 60_000L,
        currentSessionAvailable = true,
        appSwitchesLast60Min = 8,
        appSwitchingAvailable = true,
      ),
      now,
    )
    assertFalse(decision.eligible)
    assertEquals("none", decision.blockedBy)
  }

  @Test
  fun `long session is eligible`() {
    val decision = SmartResetReminderEvaluator.evaluate(
      input(currentSessionMs = 35 * 60_000L, currentSessionAvailable = true),
      now,
    )
    assertTrue(decision.eligible)
    assertEquals(Reason.LONG_SESSION, decision.reason)
  }

  @Test
  fun `frequent switching is eligible`() {
    val decision = SmartResetReminderEvaluator.evaluate(
      input(
        currentSessionMs = 12 * 60_000L,
        currentSessionAvailable = true,
        appSwitchesLast60Min = 25,
        appSwitchingAvailable = true,
      ),
      now,
    )
    assertTrue(decision.eligible)
    assertEquals(Reason.FREQUENT_SWITCHING, decision.reason)
  }

  @Test
  fun `recent reset suppresses reminder`() {
    val decision = SmartResetReminderEvaluator.evaluate(
      input(
        currentSessionMs = 35 * 60_000L,
        currentSessionAvailable = true,
        lastResetCompletedAt = now - 10 * 60_000L,
      ),
      now,
    )
    assertFalse(decision.eligible)
    assertEquals("reset-cooldown", decision.blockedBy)
  }

  @Test
  fun `recent notification suppresses reminder`() {
    val decision = SmartResetReminderEvaluator.evaluate(
      input(
        currentSessionMs = 35 * 60_000L,
        currentSessionAvailable = true,
        lastNotificationAt = now - 10 * 60_000L,
      ),
      now,
    )
    assertFalse(decision.eligible)
    assertEquals("notification-cooldown", decision.blockedBy)
  }

  @Test
  fun `notification cooldown expiry allows eligible condition again`() {
    val decision = SmartResetReminderEvaluator.evaluate(
      input(
        currentSessionMs = 35 * 60_000L,
        currentSessionAvailable = true,
        lastNotificationAt = now - (SmartResetReminderEvaluator.NOTIFICATION_COOLDOWN_MINUTES + 1) * 60_000L,
      ),
      now,
    )
    assertTrue(decision.eligible)
    assertEquals(Reason.LONG_SESSION, decision.reason)
  }
}
