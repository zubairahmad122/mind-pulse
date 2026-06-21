package expo.modules.mindpulsealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arms a saved future alarm after a reboot or app update. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmScheduler.rescheduleFromStorage(context)
  }
}
