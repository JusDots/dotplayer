package com.dotplayer.music

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dotplayer.music.data.Track
import com.dotplayer.music.ui.MainViewModel
import com.dotplayer.music.ui.theme.DotPlayerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DotPlayerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    HomeScreen()
                }
            }
        }
    }
}

@Composable
fun HomeScreen(viewModel: MainViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(
                text = "DOT.PLAYER",
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            when (val state = uiState) {
                is MainViewModel.UiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                is MainViewModel.UiState.Success -> {
                    TrackGrid(state.tracks)
                }
                is MainViewModel.UiState.Error -> {
                    Text(text = "Error: ${state.message}")
                }
            }
        }
        
        // Mini Player Bar
        NowPlayingBar(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        )
    }
}

@Composable
fun NowPlayingBar(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium),
        shape = MaterialTheme.shapes.medium,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier.padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(text = "Now Playing...", style = MaterialTheme.typography.bodySmall)
                Text(text = "Select a track", style = MaterialTheme.typography.labelSmall)
            }
            DotButton(text = "▶", onClick = {}, modifier = Modifier.size(40.dp))
        }
    }
}

@Composable
fun TrackGrid(tracks: List<Track>) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 128.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(tracks) { track ->
            TrackCard(track)
        }
    }
}

@Composable
fun TrackCard(track: Track) {
    Column {
        Box(
            modifier = Modifier
                .aspectRatio(1f)
                .background(MaterialTheme.colorScheme.primaryContainer)
        )
        Text(text = track.title, style = MaterialTheme.typography.bodyMedium)
        Text(text = track.artist, style = MaterialTheme.typography.labelSmall)
    }
}
