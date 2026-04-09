import { Innertube, UniversalCache } from 'youtubei.js';

const videoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

const yt = await Innertube.create({
  cache: new UniversalCache(false),
  retrieve_player: true,
});

console.log('[Test] Instance created.');

for (const client of ['ANDROID', 'IOS', 'TV_EMBEDDED', 'WEB', 'MWEB'] as const) {
  try {
    const info = await yt.getBasicInfo(videoId, { client });
    const fmt = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (fmt?.url) {
      console.log(`[OK] ${client}: URL found, mime: ${fmt.mime_type}`);
    } else {
      const count = info.streaming_data?.adaptive_formats?.length ?? 0;
      console.log(`[WARN] ${client}: No direct URL. Formats: ${count}`, fmt ? JSON.stringify(fmt).slice(0, 200) : 'null');
    }
  } catch (e: any) {
    console.error(`[FAIL] ${client}:`, e.message?.slice(0, 200));
  }
}
