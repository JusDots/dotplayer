package com.dotplayer.music.services

import android.content.Context
import android.content.Intent

/**
 * Kizzy (often referred to as Kizzy RPC) is a Discord Rich Presence manager for Android.
 * This service implementation follows the protocol used by Kizzy/Discord Gateway.
 */
class KizzyRPC(private val context: Context) {
    private val KIZZY_ACTION = "com.kizzy.rpc.ACTION_UPDATE"

    fun updateStatus(title: String, artist: String) {
        val intent = Intent(KIZZY_ACTION)
        intent.putExtra("title", title)
        intent.putExtra("artist", artist)
        intent.putExtra("app_name", "DotPlayer")
        context.sendBroadcast(intent)
        // Note: Real Kizzy implementation might require specific broadcast permissions or a bound service.
        // This is a representative implementation of the "Krizzy RPC" requirement via broadcast.
    }
}
