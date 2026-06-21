package expo.modules.mindpulsealarm

/**
 * Process-wide state shared between the [AlarmService], [AlarmActivity],
 * [AlarmReceiver] and [MindPulseAlarmModule]. The native pieces run even when no
 * React context is alive (e.g. the alarm fires while the app is killed), so the
 * source of truth lives here rather than in the JS bridge.
 */
object AlarmState {
  const val DEFAULT_LABEL = "Time to wake up"

  // Intent extras / actions shared across components.
  const val EXTRA_LABEL = "expo.modules.mindpulsealarm.LABEL"
  const val ACTION_START = "expo.modules.mindpulsealarm.START"
  const val ACTION_STOP = "expo.modules.mindpulsealarm.STOP"

  // JS event names — must match ALARM_NATIVE_EVENTS in src/types/alarm.types.ts.
  const val EVENT_FIRED = "MindPulseAlarmFired"
  const val EVENT_STOPPED = "MindPulseAlarmStopped"

  // AlarmManager / notification identifiers.
  const val ALARM_REQUEST_CODE = 7710
  const val NOTIFICATION_ID = 7711
  const val CHANNEL_ID = "mindpulse-alarm-ringing-v1"

  @Volatile
  var isRinging: Boolean = false
    private set

  @Volatile
  var label: String = DEFAULT_LABEL
    private set

  /** Set by the module while a React context is alive so events reach JS. */
  @Volatile
  var listener: ((event: String, label: String) -> Unit)? = null

  fun markRinging(label: String) {
    this.label = label.ifBlank { DEFAULT_LABEL }
    isRinging = true
    listener?.invoke(EVENT_FIRED, this.label)
  }

  fun markStopped() {
    isRinging = false
    listener?.invoke(EVENT_STOPPED, label)
  }
}
