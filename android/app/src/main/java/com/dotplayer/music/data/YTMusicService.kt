package com.dotplayer.music.data

import retrofit2.Call
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.Callback
import retrofit2.Response

data class Track(
    val id: String,
    val title: String,
    val artist: String,
    val thumbnail: String
)

interface DotPlayerApi {
    @GET("home") // We will add a /home route locally, or we reuse our backend
    fun getRecommendations(): Call<List<Track>>
}

class YTMusicService {
    // Note: use 10.0.2.2 for Android emulator to connect to localhost on PC
    private val retrofit = Retrofit.Builder()
        .baseUrl("http://10.0.2.2:3001/api/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val api = retrofit.create(DotPlayerApi::class.java)

    fun getRecommendations(callback: (List<Track>) -> Unit) {
        api.getRecommendations().enqueue(object : Callback<List<Track>> {
            override fun onResponse(call: Call<List<Track>>, response: Response<List<Track>>) {
                if (response.isSuccessful && response.body() != null) {
                    callback(response.body()!!)
                } else {
                    callback(emptyList())
                }
            }

            override fun onFailure(call: Call<List<Track>>, t: Throwable) {
                t.printStackTrace()
                // Mock fallback if network fails
                val mockData = listOf(
                    Track("1", "Neon Lights", "DotArtist", "https://picsum.photos/200"),
                    Track("9qnqYL0eMNI", "Electronic Pulse", "Android Phone", "https://picsum.photos/201")
                )
                callback(mockData)
            }
        })
    }
}
