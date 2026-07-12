async function tryYouTubeScrape(query: string) {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' music')}&pbj=1`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
    },
  });

  const html = await res.text();

  const videoIds = [...html.matchAll(/"videoId":"([^"]+)"/g)].map(m => m[1]);
  const titles = [...html.matchAll(/"title":"([^"]+)"/g)].map(m => m[1]);
  const thumbs = [...html.matchAll(/ytimg\.com\/vi\/([^"\/]+)\/hqdefault/g)].map(m => m[1]);
  const channels = [...html.matchAll(/"longBylineText":"([^"]+)"/g)].map(m => m[1]);
  const durations = [...html.matchAll(/"lengthText":"([^"]+)"/g)].map(m => m[1]);

  const uniqueIds = [...new Set(videoIds)].slice(0, 20);

  return uniqueIds.map((id, i) => ({
    id,
    title: decodeHTMLEntities(titles[i * 2] || 'Unknown'),
    artist: decodeHTMLEntities(channels[i] || 'YouTube'),
    thumbnail: thumbs[i] ? `https://i.ytimg.com/vi/${thumbs[i]}/hqdefault.jpg` : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: durations[i] || '',
  }));
}

function decodeHTMLEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  if (!q) return Response.json({ error: 'Query required' }, { status: 400 });

  try {
    const tracks = await tryYouTubeScrape(q);
    return Response.json(tracks);
  } catch (err: any) {
    console.error('[Search] Error:', err.message);
    return Response.json({ error: err.message, tracks: [] }, { status: 500 });
  }
}