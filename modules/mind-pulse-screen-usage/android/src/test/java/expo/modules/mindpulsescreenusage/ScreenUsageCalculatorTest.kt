package expo.modules.mindpulsescreenusage

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScreenUsageCalculatorTest {

  private val selfPackage = "com.zubzen.mindpulse"
  private val dayStart = 1_000_000L
  private val hour = 60 * 60 * 1000L

  @Test
  fun `zero usage returns zero, not an error`() {
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(
      events = emptyList(),
      startOfDayMs = dayStart,
      nowMs = dayStart + hour,
      selfPackage = selfPackage,
    )
    assertEquals(0L, total)
  }

  @Test
  fun `sums a single foreground-background pair`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.other.app"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 5 * 60_000, "com.other.app"),
    )
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, dayStart + hour, selfPackage)
    assertEquals(5 * 60_000L, total)
  }

  @Test
  fun `excludes MindPulse's own foreground time from the total`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, selfPackage),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 10 * 60_000, selfPackage),
    )
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, dayStart + hour, selfPackage)
    assertEquals(0L, total)
  }

  @Test
  fun `does not double-count a duplicate foreground event for the same package`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.other.app"),
      // Duplicate MOVE_TO_FOREGROUND some devices emit without an interleaved background event.
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 60_000, "com.other.app"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 5 * 60_000, "com.other.app"),
    )
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, dayStart + hour, selfPackage)
    // Duration is measured from the earliest (first) foreground start, not re-started.
    assertEquals(5 * 60_000L, total)
  }

  @Test
  fun `an app still foregrounded at now keeps accruing up to now`() {
    val now = dayStart + 3 * 60_000
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.other.app"),
      // no matching MOVE_TO_BACKGROUND yet — still in the foreground
    )
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, now, selfPackage)
    assertEquals(3 * 60_000L, total)
  }

  @Test
  fun `clamps a session that started before local midnight to the day boundary`() {
    val beforeMidnight = dayStart - hour
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, beforeMidnight, "com.other.app"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 10 * 60_000, "com.other.app"),
    )
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, dayStart + hour, selfPackage)
    // Only the portion at/after dayStart counts, not the hour before midnight.
    assertEquals(10 * 60_000L, total)
  }

  @Test
  fun `sums multiple apps without cross-package interference`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 2 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 2 * 60_000, "com.b"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 9 * 60_000, "com.b"),
    )
    val total = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, dayStart + hour, selfPackage)
    assertEquals(9 * 60_000L, total)
  }

  // ── Continuous session ──────────────────────────────────────────────

  @Test
  fun `no screen events at all means session data is unavailable, not zero`() {
    val result = ScreenUsageCalculator.computeSession(emptyList(), dayStart + hour)
    assertFalse(result.available)
    assertNull(result.currentSessionMs)
    assertNull(result.lastSessionMs)
  }

  @Test
  fun `an open interactive stretch is the current session, measured to now`() {
    val now = dayStart + 32 * 60_000
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_INTERACTIVE, dayStart, null),
    )
    val result = ScreenUsageCalculator.computeSession(events, now)
    assertTrue(result.available)
    assertEquals(32 * 60_000L, result.currentSessionMs)
    assertNull(result.lastSessionMs)
  }

  @Test
  fun `app switches inside one interactive stretch do not end the session`() {
    // App-switch events (MOVE_TO_FOREGROUND/BACKGROUND) mixed in must be
    // ignored by the session calculator — only SCREEN_(NON_)INTERACTIVE matters.
    val now = dayStart + 32 * 60_000
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_INTERACTIVE, dayStart, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 5_000, "com.instagram"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 10 * 60_000, "com.instagram"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 10 * 60_000, "com.chrome"),
    )
    val result = ScreenUsageCalculator.computeSession(events, now)
    assertEquals(32 * 60_000L, result.currentSessionMs)
  }

  @Test
  fun `a closed interactive stretch is the last session, no current session`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_INTERACTIVE, dayStart, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_NON_INTERACTIVE, dayStart + 20 * 60_000, null),
    )
    val result = ScreenUsageCalculator.computeSession(events, dayStart + hour)
    assertTrue(result.available)
    assertNull(result.currentSessionMs)
    assertEquals(20 * 60_000L, result.lastSessionMs)
  }

  @Test
  fun `a new session after screen-off is tracked independently of the previous one`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_INTERACTIVE, dayStart, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_NON_INTERACTIVE, dayStart + 20 * 60_000, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_INTERACTIVE, dayStart + 50 * 60_000, null),
    )
    val now = dayStart + 55 * 60_000
    val result = ScreenUsageCalculator.computeSession(events, now)
    assertEquals(5 * 60_000L, result.currentSessionMs)
    assertNull(result.lastSessionMs)
  }

  // ── Top Apps Today ───────────────────────────────────────────────────

  @Test
  fun `per-app map attributes each package's own foreground time only`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 2 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 2 * 60_000, "com.b"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 9 * 60_000, "com.b"),
    )
    val perApp = ScreenUsageCalculator.computePerAppForegroundMs(events, dayStart, dayStart + hour, selfPackage)
    assertEquals(2 * 60_000L, perApp["com.a"])
    assertEquals(7 * 60_000L, perApp["com.b"])
  }

  @Test
  fun `repeated foreground-background cycles for the same app accumulate`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 3 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 10 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 14 * 60_000, "com.a"),
    )
    val perApp = ScreenUsageCalculator.computePerAppForegroundMs(events, dayStart, dayStart + hour, selfPackage)
    // Two separate 3-minute and 4-minute visits to the same app on the same day.
    assertEquals(7 * 60_000L, perApp["com.a"])
  }

  @Test
  fun `MindPulse itself never appears in the per-app map`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, selfPackage),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 10 * 60_000, selfPackage),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 10 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 12 * 60_000, "com.a"),
    )
    val perApp = ScreenUsageCalculator.computePerAppForegroundMs(events, dayStart, dayStart + hour, selfPackage)
    assertFalse(perApp.containsKey(selfPackage))
    assertEquals(setOf("com.a"), perApp.keys)
  }

  @Test
  fun `top apps are sorted descending by foreground time`() {
    val perApp = mapOf("com.a" to 5 * 60_000L, "com.b" to 20 * 60_000L, "com.c" to 12 * 60_000L)
    val top = ScreenUsageCalculator.computeTopApps(perApp)
    assertEquals(listOf("com.b", "com.c", "com.a"), top.map { it.packageName })
  }

  @Test
  fun `top apps caps at 5 even with many packages used today`() {
    val perApp = (1..12).associate { "com.app$it" to (it * 60_000L) }
    val top = ScreenUsageCalculator.computeTopApps(perApp)
    assertEquals(5, top.size)
    // The 5 highest values: app12..app8.
    assertEquals(listOf("com.app12", "com.app11", "com.app10", "com.app9", "com.app8"), top.map { it.packageName })
  }

  @Test
  fun `top apps drops entries under the noise threshold`() {
    val perApp = mapOf(
      "com.real" to 60_000L,
      "com.noise" to 2_000L, // a stray sub-threshold blip
    )
    val top = ScreenUsageCalculator.computeTopApps(perApp)
    assertEquals(listOf("com.real"), top.map { it.packageName })
  }

  @Test
  fun `a currently-foregrounded app with no background event yet still ranks in top apps`() {
    val now = dayStart + 8 * 60_000
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.stillopen"),
    )
    val perApp = ScreenUsageCalculator.computePerAppForegroundMs(events, dayStart, now, selfPackage)
    val top = ScreenUsageCalculator.computeTopApps(perApp)
    assertEquals(listOf("com.stillopen"), top.map { it.packageName })
    assertEquals(8 * 60_000L, top.first().foregroundTimeMs)
  }

  @Test
  fun `malformed event ordering (background with no matching foreground) is ignored, not crashed on`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 60_000, "com.orphan"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 2 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 5 * 60_000, "com.a"),
    )
    val perApp = ScreenUsageCalculator.computePerAppForegroundMs(events, dayStart, dayStart + hour, selfPackage)
    assertEquals(setOf("com.a"), perApp.keys)
    assertEquals(3 * 60_000L, perApp["com.a"])
  }

  @Test
  fun `sum of all top apps (unlimited) reconciles exactly with Screen Time Today`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, selfPackage),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 4 * 60_000, selfPackage),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 4 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 9 * 60_000, "com.a"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 9 * 60_000, "com.b"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 20 * 60_000, "com.b"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 20 * 60_000, "com.c"),
      // com.c still open at `now` — no matching background event.
    )
    val now = dayStart + 25 * 60_000
    val screenTimeTodayMs = ScreenUsageCalculator.computeScreenTimeTodayMs(events, dayStart, now, selfPackage)
    val perApp = ScreenUsageCalculator.computePerAppForegroundMs(events, dayStart, now, selfPackage)
    val allApps = ScreenUsageCalculator.computeTopApps(perApp, maxCount = Int.MAX_VALUE, minDurationMs = 0L)
    assertEquals(screenTimeTodayMs, allApps.sumOf { it.foregroundTimeMs })
    // And the top-5-only view is a subset that never exceeds the total.
    val top5 = ScreenUsageCalculator.computeTopApps(perApp)
    assertTrue(top5.sumOf { it.foregroundTimeMs } <= screenTimeTodayMs)
  }

  @Test
  fun `excludes only the given launcher package, not other apps like Settings`() {
    val perApp = mapOf(
      "com.android.settings" to 4 * 60_000L,
      "com.miui.home" to 20 * 60_000L,
      "com.tapmad.tapmadtv" to 19 * 60_000L,
    )
    val top = ScreenUsageCalculator.computeTopApps(perApp, excludePackages = setOf("com.miui.home"))
    assertEquals(listOf("com.tapmad.tapmadtv", "com.android.settings"), top.map { it.packageName })
  }

  @Test
  fun `exclusion is applied before the top-5 cap, so a real app can surface after excluding the launcher`() {
    val perApp = mapOf(
      "com.launcher" to 100 * 60_000L, // would occupy the #1 spot if not excluded
      "com.app1" to 50 * 60_000L,
      "com.app2" to 40 * 60_000L,
      "com.app3" to 30 * 60_000L,
      "com.app4" to 20 * 60_000L,
      "com.app5" to 10 * 60_000L,
    )
    val top = ScreenUsageCalculator.computeTopApps(perApp, excludePackages = setOf("com.launcher"))
    assertEquals(listOf("com.app1", "com.app2", "com.app3", "com.app4", "com.app5"), top.map { it.packageName })
  }

  @Test
  fun `MindPulse stays excluded from top apps alongside launcher exclusion`() {
    val perApp = mapOf(
      selfPackage to 30 * 60_000L, // would already be absent from perAppMs in practice — defensive check
      "com.launcher" to 20 * 60_000L,
      "com.a" to 10 * 60_000L,
    )
    val top = ScreenUsageCalculator.computeTopApps(
      perApp.filterKeys { it != selfPackage },
      excludePackages = setOf("com.launcher"),
    )
    assertEquals(listOf("com.a"), top.map { it.packageName })
  }

  @Test
  fun `humanizes a package name when no installed-app label can be resolved`() {
    assertEquals("Tapmadtv", ScreenUsageCalculator.humanizePackageName("com.tapmad.tapmadtv"))
    assertEquals("Settings", ScreenUsageCalculator.humanizePackageName("com.android.settings"))
    assertEquals("Singleword", ScreenUsageCalculator.humanizePackageName("singleword"))
  }

  // ── App Switches ─────────────────────────────────────────────────────

  private val launcherPkg = "com.launcher"
  private val systemUiPkg = "com.android.systemui"
  private val infra = setOf(launcherPkg, systemUiPkg)

  @Test
  fun `Chrome to YouTube is one switch`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(1, switches)
  }

  @Test
  fun `staying in the same app is not a switch`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart + 30_000, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 60_000, "com.chrome"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(0, switches)
  }

  @Test
  fun `Chrome to YouTube to WhatsApp is two switches`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 5 * 60_000, "com.youtube"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 10 * 60_000, "com.whatsapp"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(2, switches)
  }

  @Test
  fun `passing through the launcher between two real apps is still one switch`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 5 * 60_000, launcherPkg),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 6 * 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(1, switches)
  }

  @Test
  fun `going to the launcher and then locking does not invent a switch`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 5 * 60_000, launcherPkg),
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_NON_INTERACTIVE, dayStart + 6 * 60_000, null),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(0, switches)
  }

  @Test
  fun `a lock boundary breaks continuity — nothing after unlock counts against what came before`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_NON_INTERACTIVE, dayStart + 5 * 60_000, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_SCREEN_INTERACTIVE, dayStart + 10 * 60_000, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 11 * 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(0, switches)
  }

  @Test
  fun `MindPulse in between two real apps does not distort the switch count`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 5 * 60_000, selfPackage),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 6 * 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    // Documented rule: MindPulse is invisible to this metric, same as the
    // launcher — Chrome → YouTube still counts as exactly one switch, not
    // inflated by the user checking Screen Balance in between.
    assertEquals(1, switches)
  }

  @Test
  fun `duplicate foreground events for the same app never inflate the count`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.whatsapp"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 60_000, "com.whatsapp"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(0, switches)
  }

  @Test
  fun `transitions older than the 60-minute window are not counted`() {
    val windowStart = dayStart + 2 * hour
    val windowEnd = windowStart + hour
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 5 * 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = windowStart, windowEnd = windowEnd,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(0, switches)
  }

  @Test
  fun `a transition before the window still establishes context for one inside it`() {
    val windowStart = dayStart + hour
    val windowEnd = windowStart + hour
    val events = listOf(
      // Before the window: establishes "last app" context only, not counted itself.
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      // Inside the window: a genuinely new transition.
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, windowStart + 5 * 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = windowStart, windowEnd = windowEnd,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(1, switches)
  }

  @Test
  fun `System UI passing through does not count as a switch destination`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart, "com.chrome"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 60_000, systemUiPkg),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 2 * 60_000, "com.youtube"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(1, switches)
  }

  @Test
  fun `malformed event sequence does not crash and yields a safe result`() {
    val events = listOf(
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_BACKGROUND, dayStart, "com.orphan"),
      UsageEventRecord(999, dayStart + 30_000, "com.unknown-event-type"),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 60_000, null),
      UsageEventRecord(ScreenUsageCalculator.EVENT_MOVE_TO_FOREGROUND, dayStart + 90_000, "com.chrome"),
    )
    val switches = ScreenUsageCalculator.computeAppSwitches(
      events, windowStart = dayStart, windowEnd = dayStart + hour,
      excludedPackages = setOf(selfPackage), launcherPackages = infra,
    )
    assertEquals(0, switches)
  }
}
