package com.shadnox.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager

/**
 * Private Screen on Android: a foreground service that keeps a see-through black layer
 * on top of every app. Touches pass straight through it.
 */
class OverlayService : Service() {

    private var overlay: View? = null
    private lateinit var wm: WindowManager

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                shutDown()
                return START_NOT_STICKY
            }
            ACTION_UPDATE -> {
                applyStrength()
                return START_NOT_STICKY
            }
            else -> {
                goForeground()
                if (!Settings.canDrawOverlays(this)) {
                    shutDown()
                    return START_NOT_STICKY
                }
                showOverlay()
                running = true
                onChange?.invoke()
            }
        }
        return START_NOT_STICKY
    }

    private fun goForeground() {
        val n = buildNotification()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, n)
        }
    }

    private fun showOverlay() {
        if (overlay != null) {
            applyStrength()
            return
        }
        val view = View(this)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.START
        if (Build.VERSION.SDK_INT >= 30) {
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        } else if (Build.VERSION.SDK_INT >= 28) {
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        overlay = view
        applyStrength()
        try {
            wm.addView(view, params)
        } catch (e: Exception) {
            overlay = null
            shutDown()
        }
    }

    private fun applyStrength() {
        val v = overlay ?: return
        val alpha = (strength(this).coerceIn(0, 90) / 100f * 255f).toInt()
        v.setBackgroundColor(Color.argb(alpha, 0, 0, 0))
    }

    private fun shutDown() {
        overlay?.let {
            try {
                wm.removeView(it)
            } catch (_: Exception) {
            }
        }
        overlay = null
        running = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        onChange?.invoke()
    }

    override fun onDestroy() {
        overlay?.let {
            try {
                wm.removeView(it)
            } catch (_: Exception) {
            }
        }
        overlay = null
        running = false
        onChange?.invoke()
        super.onDestroy()
    }

    private fun createChannel() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val ch = NotificationChannel(CHANNEL_ID, "Private Screen", NotificationManager.IMPORTANCE_LOW)
        ch.description = "Shown while the Private Screen overlay is on"
        nm.createNotificationChannel(ch)
    }

    private fun buildNotification(): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, OverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Private Screen is on")
            .setContentText("Tap to open Shadnox")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Turn off", stop).build())
            .build()
    }

    companion object {
        const val ACTION_START = "com.shadnox.app.START"
        const val ACTION_STOP = "com.shadnox.app.STOP"
        const val ACTION_UPDATE = "com.shadnox.app.UPDATE"
        private const val CHANNEL_ID = "private_screen"
        private const val NOTIFICATION_ID = 1

        @Volatile
        var running = false

        /** The screen listens here so its button and status stay correct. */
        var onChange: (() -> Unit)? = null

        fun strength(ctx: Context): Int =
            ctx.getSharedPreferences("shadnox", Context.MODE_PRIVATE).getInt("strength", 45)

        fun saveStrength(ctx: Context, value: Int) {
            ctx.getSharedPreferences("shadnox", Context.MODE_PRIVATE).edit().putInt("strength", value).apply()
        }
    }
}
