package expo.modules.mindpulsealarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * Foreground service that actually wakes the user: it loops a loud alarm
 * ringtone over the alarm audio stream, vibrates, holds a wake lock and posts a
 * full-screen-intent notification that launches [AlarmActivity]. Runs whether or
 * not the JS bundle / app process is alive.
 */
class AlarmService : Service() {
  private val tag = "MindPulseAlarm"
  private var mediaPlayer: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var resourcesReleased = true

  private val vibrator: Vibrator by lazy {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == AlarmState.ACTION_STOP) {
      stopRinging()
      return START_NOT_STICKY
    }

    if (intent == null || intent.action != AlarmState.ACTION_START) {
      Log.i(tag, "SERVICE ignored action=${intent?.action ?: "null"}")
      return START_NOT_STICKY
    }

    AlarmDismissal.resetForNewAlarm()
    val label = intent?.getStringExtra(AlarmState.EXTRA_LABEL) ?: AlarmState.DEFAULT_LABEL
    val ringtoneId = intent?.getStringExtra(AlarmState.EXTRA_RINGTONE_ID)

    createChannel()
    startForegroundCompat(buildNotification(label, ringtoneId))

    resourcesReleased = false
    acquireWakeLock()
    startRingtone(ringtoneId)
    startVibration()

    AlarmState.markRinging(label, ringtoneId)

    // Android decides whether the full-screen intent opens AlarmActivity
    // immediately or stays as a heads-up notification while the service rings.

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    releaseResources()
    super.onDestroy()
  }

  /** Public entry used by both ACTION_STOP and onDestroy. */
  private fun stopRinging() {
    releaseResources()
    AlarmState.markStopped()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  private fun releaseResources() {
    if (resourcesReleased) return
    resourcesReleased = true
    runCatching {
      mediaPlayer?.let {
        if (it.isPlaying) it.stop()
        it.release()
      }
    }
    mediaPlayer = null
    runCatching { vibrator.cancel() }
    runCatching {
      wakeLock?.let { if (it.isHeld) it.release() }
    }
    wakeLock = null
  }

  private fun startRingtone(ringtoneId: String?) {
    val resolution = AlarmRingtoneResolver.resolve(this, ringtoneId)
    Log.i(
      tag,
      "FIRE selectedRingtone=${ringtoneId ?: "null"} resolvedResource=${resolution.resolvedResourceName ?: "none"}/${resolution.resolvedResourceId} resolvedUri=${resolution.resolvedUri} fallbackUsed=${resolution.fallbackUsed} fallbackReason=${resolution.fallbackReason ?: "none"}",
    )

    val soundUri = resolution.resolvedUri ?: return

    mediaPlayer = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build(),
      )
      isLooping = true
      setDataSource(applicationContext, soundUri)
      setOnPreparedListener { if (!resourcesReleased) it.start() }
      prepareAsync()
    }

    // Make sure the alarm stream is audible even if the user lowered it.
    runCatching {
      val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      audio.setStreamVolume(AudioManager.STREAM_ALARM, max, 0)
    }
  }

  private fun startVibration() {
    val pattern = longArrayOf(0, 700, 250, 700, 250, 1200)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(pattern, 0)
    }
  }

  private fun acquireWakeLock() {
    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = power.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "mindpulse:alarm",
    ).apply {
      setReferenceCounted(false)
      acquire(10 * 60 * 1000L /* 10 min safety timeout */)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      AlarmState.CHANNEL_ID,
      "Wake-up alarm",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Rings when it is time to wake up"
      setBypassDnd(true)
      // We play sound + vibration ourselves so the channel stays silent.
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(label: String, ringtoneId: String?): Notification {
    val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
      putExtra(AlarmState.EXTRA_LABEL, label)
      if (!ringtoneId.isNullOrBlank()) putExtra(AlarmState.EXTRA_RINGTONE_ID, ringtoneId)
    }
    val fullScreenPending = PendingIntent.getActivity(
      this,
      0,
      fullScreenIntent,
      pendingFlags(),
    )

    val wakeIntent = Intent(this, AlarmReceiver::class.java).apply {
      action = AlarmState.ACTION_WAKE_UP
    }
    val wakePending = PendingIntent.getBroadcast(
      this,
      1,
      wakeIntent,
      pendingFlags(),
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, AlarmState.CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
        .setPriority(Notification.PRIORITY_MAX)
    }

    return builder
      .setContentTitle(AlarmState.DEFAULT_LABEL)
      .setContentText(label)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreenPending, true)
      .setContentIntent(fullScreenPending)
      .addAction(
        android.R.drawable.ic_lock_silent_mode_off,
        "Wake Up",
        wakePending,
      )
      .build()
  }

  private fun startForegroundCompat(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        AlarmState.NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(AlarmState.NOTIFICATION_ID, notification)
    }
  }

  private fun pendingFlags(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
  }

  companion object {
    fun stop(context: Context) {
      val intent = Intent(context, AlarmService::class.java).apply {
        action = AlarmState.ACTION_STOP
      }
      runCatching { context.startService(intent) }
    }
  }
}
