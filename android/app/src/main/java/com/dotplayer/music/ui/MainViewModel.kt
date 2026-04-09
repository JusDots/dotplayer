package com.dotplayer.music.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dotplayer.music.data.Track
import com.dotplayer.music.data.YTMusicService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {
    private val service = YTMusicService()
    
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState

    init {
        loadRecommendations()
    }

    private fun loadRecommendations() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            service.getRecommendations { tracks ->
                _uiState.value = UiState.Success(tracks)
            }
        }
    }

    sealed class UiState {
        object Loading : UiState()
        data class Success(val tracks: List<Track>) : UiState()
        data class Error(val message: String) : UiState()
    }
}
