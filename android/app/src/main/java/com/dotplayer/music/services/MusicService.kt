package com.dotplayer.music.services

import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.dotplayer.music.data.Track

class MusicService : Service() {
    private var currentTrack: Track? = null
    private var isPlaying = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        when (action) {
            "PLAY" -> {
                // Handle play logic
            }
            "PAUSE" -> {
                // Handle pause logic
            }
        }
        return START_NOT_STICKY
    }
}
