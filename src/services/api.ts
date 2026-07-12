const API = '/api';

export async function getStreamUrl(videoId: string): Promise<{ url: string; mimeType: string }> {
  const res = await fetch(`${API}/stream/${videoId}`);
  if (!res.ok) throw new Error(`Stream error: ${res.status}`);
  return res.json();
}

export async function searchTracks(query: string) {
  const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search error: ${res.status}`);
  return res.json();
}