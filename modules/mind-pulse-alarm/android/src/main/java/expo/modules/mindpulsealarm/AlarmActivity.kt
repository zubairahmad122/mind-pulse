package expo.modules.mindpulsealarm

import android.app.Activity
import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextClock
import android.widget.TextView
import java.util.Calendar

/**
 * Full-screen wake-up screen shown by the alarm's full-screen-intent
 * notification. Mirrors the in-app WakeUpAlarmScreen: a daytime-sky gradient,
 * greeting, live clock, SNOOZE and a long-press WAKE UP.
 */
class AlarmActivity : Activity() {
  private var density = 1f
  private fun dp(value: Int) = (value * density).toInt()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    density = resources.displayMetrics.density
    showWhenLockedAndTurnScreenOn()
    setContentView(buildContentView())
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    if (!AlarmState.isRinging) finish()
  }

  private fun buildContentView(): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      background = GradientDrawable(
        GradientDrawable.Orientation.TOP_BOTTOM,
        intArrayOf(
          Color.parseColor("#2B6CB0"),
          Color.parseColor("#4A90D9"),
          Color.parseColor("#7FB5E6"),
          Color.parseColor("#A9D0F0"),
        ),
      )
      setPadding(dp(28), dp(72), dp(28), dp(36))
    }

    val greeting = TextView(this).apply {
      text = greetingForNow()
      textSize = 24f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
    }

    val clock = TextClock(this).apply {
      format12Hour = "hh : mm a"
      format24Hour = "HH : mm"
      textSize = 64f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
    }

    val date = TextClock(this).apply {
      format12Hour = "EEE, MMM d"
      format24Hour = "EEE, MMM d"
      textSize = 17f
      setTextColor(Color.parseColor("#F0FFFFFF"))
      gravity = Gravity.CENTER
    }

    val spacer = View(this)

    val snooze = pillButton("SNOOZE", Color.parseColor("#0E1116"), Color.WHITE).apply {
      setOnClickListener { snoozeAlarm() }
    }

    val wake = pillButton("WAKE UP", Color.WHITE, Color.parseColor("#0E1116")).apply {
      setOnLongClickListener {
        stopAlarm()
        true
      }
    }

    val hint = TextView(this).apply {
      text = "Long press to wake up"
      textSize = 13f
      setTextColor(Color.parseColor("#E6FFFFFF"))
      gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, 0)
    }

    root.addView(greeting)
    root.addView(clock, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) })
    root.addView(date, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4) })
    root.addView(spacer, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
    root.addView(snooze, pillParams().apply { bottomMargin = dp(14) })
    root.addView(wake, pillParams())
    root.addView(hint)
    return root
  }

  private fun pillButton(label: String, bg: Int, fg: Int): TextView {
    return TextView(this).apply {
      text = label
      textSize = 17f
      setTextColor(fg)
      gravity = Gravity.CENTER
      letterSpacing = 0.12f
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setPadding(0, dp(20), 0, dp(20))
      background = GradientDrawable().apply {
        cornerRadius = dp(36).toFloat()
        setColor(bg)
      }
    }
  }

  private fun pillParams() = LinearLayout.LayoutParams(
    LinearLayout.LayoutParams.MATCH_PARENT,
    LinearLayout.LayoutParams.WRAP_CONTENT,
  )

  private fun greetingForNow(): String {
    return when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
      in 0..11 -> "Good Morning!"
      in 12..16 -> "Good Afternoon!"
      in 17..20 -> "Good Evening!"
      else -> "Good Night!"
    }
  }

  private fun stopAlarm() {
    AlarmService.stop(this)
    finish()
  }

  private fun snoozeAlarm() {
    AlarmService.stop(this)
    val triggerAt = System.currentTimeMillis() + 9 * 60 * 1000L
    val intent = Intent(this, AlarmReceiver::class.java).apply {
      action = AlarmState.ACTION_START
      putExtra(AlarmState.EXTRA_LABEL, AlarmState.label)
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    val pending = PendingIntent.getBroadcast(this, AlarmState.ALARM_REQUEST_CODE, intent, flags)
    val manager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
    runCatching { manager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, pending), pending) }
    finish()
  }

  private fun showWhenLockedAndTurnScreenOn() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      (getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)
        ?.requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
}
