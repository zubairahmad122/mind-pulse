package expo.modules.mindpulsescreenusage

/**
 * A single `UsageEvents.Event` reduced to the three fields the calculators
 * below need. Kept as our own plain data class (rather than passing the
 * Android framework's `UsageEvents.Event` around) so this file has no
 * Android dependency and can be unit-tested with plain JUnit.
 */
data class UsageEventRecord(
  val type: Int,
  val timestamp: Long,
  val packageName: String?,
)

/**
 * Pure calculation logic for the Screen Balance metrics. Mirrors the
 * relevant `UsageEvents.Event` type constants locally instead of depending
 * on `android.app.usage.UsageEvents` — the module that queries real events
 * (`MindPulseScreenUsageModule`) maps them to [UsageEventRecord] and calls
 * into here.
 */
object ScreenUsageCalculator {
  /** UsageEvents.Event.MOVE_TO_FOREGROUND */
  const val EVENT_MOVE_TO_FOREGROUND = 1

  /** UsageEvents.Event.MOVE_TO_BACKGROUND */
  const val EVENT_MOVE_TO_BACKGROUND = 2

  /** UsageEvents.Event.SCREEN_INTERACTIVE (API 28+; absent on older OS versions) */
  const val EVENT_SCREEN_INTERACTIVE = 15

  /** UsageEvents.Event.SCREEN_NON_INTERACTIVE (API 28+; absent on older OS versions) */
  const val EVENT_SCREEN_NON_INTERACTIVE = 16

  /** "Most Used Today" never returns more than this many apps. */
  const val TOP_APPS_MAX = 5

  /**
   * Minimum foreground duration for a package to count toward "Most Used
   * Today" — filters event noise (a stray sub-second foreground blip), not
   * legitimate short usage.
   */
  const val TOP_APPS_MIN_DURATION_MS = 10_000L

  /**
   * Total foreground time per package (excluding [selfPackage]), from
   * MOVE_TO_FOREGROUND / MOVE_TO_BACKGROUND event pairs, clamped to
   * [startOfDayMs, nowMs]. A repeated foreground event for an already-open
   * package is ignored (keeps the earliest start), and a package still
   * open at `nowMs` keeps accruing up to `nowMs`.
   *
   * Single source of truth for both "Screen Time Today" (sum of every
   * value here) and "Most Used Today" (top entries here) — so the two
   * always reconcile exactly.
   */
  fun computePerAppForegroundMs(
    events: List<UsageEventRecord>,
    startOfDayMs: Long,
    nowMs: Long,
    selfPackage: String?,
  ): Map<String, Long> {
    val openStarts = HashMap<String, Long>()
    val totals = HashMap<String, Long>()

    fun accrue(pkg: String, start: Long, end: Long) {
      val duration = clampedDurationMs(start, end, startOfDayMs, nowMs)
      if (duration > 0) totals[pkg] = (totals[pkg] ?: 0L) + duration
    }

    for (event in events.sortedBy { it.timestamp }) {
      val pkg = event.packageName ?: continue
      if (pkg == selfPackage) continue
      when (event.type) {
        EVENT_MOVE_TO_FOREGROUND -> {
          if (!openStarts.containsKey(pkg)) openStarts[pkg] = event.timestamp
        }
        EVENT_MOVE_TO_BACKGROUND -> {
          val start = openStarts.remove(pkg) ?: continue
          accrue(pkg, start, event.timestamp)
        }
      }
    }
    for ((pkg, start) in openStarts) {
      accrue(pkg, start, nowMs)
    }
    return totals
  }

  /** "Screen Time Today" = the sum of every package's total in [computePerAppForegroundMs]. */
  fun computeScreenTimeTodayMs(
    events: List<UsageEventRecord>,
    startOfDayMs: Long,
    nowMs: Long,
    selfPackage: String?,
  ): Long = computePerAppForegroundMs(events, startOfDayMs, nowMs, selfPackage).values.sum()

  data class AppUsageTotal(
    val packageName: String,
    val foregroundTimeMs: Long,
  )

  /**
   * Top [maxCount] packages by foreground time, descending, dropping entries
   * under [minDurationMs] and any package in [excludePackages] (e.g. the
   * device's current launcher — infrastructure, not meaningful app usage).
   * Operates on the same map [computeScreenTimeTodayMs] sums, so this is a
   * filtered *subset* — it does not need to reconcile with that total.
   * Exclusion and the noise threshold are applied before the [maxCount]
   * cap, so a genuinely-used app can still surface in the top 5 once
   * excluded infrastructure stops occupying a slot.
   */
  fun computeTopApps(
    perAppMs: Map<String, Long>,
    maxCount: Int = TOP_APPS_MAX,
    minDurationMs: Long = TOP_APPS_MIN_DURATION_MS,
    excludePackages: Set<String> = emptySet(),
  ): List<AppUsageTotal> =
    perAppMs.entries
      .filter { it.value >= minDurationMs }
      .filter { it.key !in excludePackages }
      .sortedByDescending { it.value }
      .take(maxCount)
      .map { AppUsageTotal(it.key, it.value) }

  /**
   * Last-resort app label when no installed-app label could be resolved
   * (see `MindPulseScreenUsageModule.resolveAppLabel`) — the package name's
   * last segment, capitalized, so at least something readable shows
   * instead of the raw dotted package id.
   */
  fun humanizePackageName(packageName: String): String =
    packageName.substringAfterLast('.').replaceFirstChar { it.uppercase() }

  private fun clampedDurationMs(start: Long, end: Long, lo: Long, hi: Long): Long {
    val clampedStart = start.coerceIn(lo, hi)
    val clampedEnd = end.coerceIn(lo, hi)
    return (clampedEnd - clampedStart).coerceAtLeast(0L)
  }

  /**
   * Meaningful app-to-app transitions with an arrival timestamp inside
   * [windowStart, windowEnd] — "how many times did the user switch to a
   * different app recently?" A package in [excludedPackages] (MindPulse) or
   * [launcherPackages] (launcher/System UI) never becomes the tracked
   * "current app" and is never itself a switch destination, but passing
   * through one doesn't break continuity either — Chrome → launcher →
   * YouTube is still one switch, same as Chrome → MindPulse → YouTube.
   * SCREEN_NON_INTERACTIVE (lock/screen-off) does break continuity: nothing
   * before it is compared against whatever foregrounds after the next
   * unlock.
   *
   * Walks the full event list (not just events after [windowStart]) so the
   * "last known app" carries in correctly from before the window — only
   * whether a transition's own timestamp falls inside the window decides
   * if it's counted.
   */
  fun computeAppSwitches(
    events: List<UsageEventRecord>,
    windowStart: Long,
    windowEnd: Long,
    excludedPackages: Set<String>,
    launcherPackages: Set<String>,
  ): Int {
    var lastMeaningfulPackage: String? = null
    var switchCount = 0

    for (event in events.sortedBy { it.timestamp }) {
      if (event.timestamp > windowEnd) continue
      when (event.type) {
        EVENT_SCREEN_NON_INTERACTIVE -> lastMeaningfulPackage = null
        EVENT_MOVE_TO_FOREGROUND -> {
          val pkg = event.packageName ?: continue
          if (pkg in excludedPackages || pkg in launcherPackages) continue

          if (lastMeaningfulPackage != null && lastMeaningfulPackage != pkg && event.timestamp >= windowStart) {
            switchCount++
          }
          lastMeaningfulPackage = pkg
        }
      }
    }
    return switchCount
  }

  data class SessionResult(
    val currentSessionMs: Long?,
    val lastSessionMs: Long?,
    /** False when session boundaries can't be reliably determined — never fabricate a number in that case. */
    val available: Boolean,
  )

  /**
   * The continuous screen-on session: begins at SCREEN_INTERACTIVE, ends at
   * SCREEN_NON_INTERACTIVE. App switches inside one interactive stretch
   * (Instagram → Chrome → Messages, screen never off) never end a session —
   * only the screen-interactive boundary does.
   *
   * Returns `available = false` (never a fabricated duration) when no such
   * events are present in [events] — including on pre-Android-9 devices,
   * which never emit them.
   */
  fun computeSession(events: List<UsageEventRecord>, nowMs: Long): SessionResult {
    val screenEvents = events
      .filter { it.type == EVENT_SCREEN_INTERACTIVE || it.type == EVENT_SCREEN_NON_INTERACTIVE }
      .sortedBy { it.timestamp }
    if (screenEvents.isEmpty()) return SessionResult(null, null, available = false)

    var openStart: Long? = null
    var lastCompletedSessionMs: Long? = null

    for (event in screenEvents) {
      if (event.type == EVENT_SCREEN_INTERACTIVE) {
        openStart = event.timestamp
      } else {
        val start = openStart
        if (start != null) lastCompletedSessionMs = (event.timestamp - start).coerceAtLeast(0L)
        openStart = null
      }
    }

    val start = openStart
    return if (start != null) {
      SessionResult(currentSessionMs = (nowMs - start).coerceAtLeast(0L), lastSessionMs = null, available = true)
    } else {
      SessionResult(currentSessionMs = null, lastSessionMs = lastCompletedSessionMs, available = lastCompletedSessionMs != null)
    }
  }
}
