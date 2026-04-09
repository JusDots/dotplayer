import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create({ cache: new UniversalCache(false), retrieve_player: true });

  console.log('[Test] Downloading dQw... range 1000-2000');
  try {
      const stream = await yt.download('dQw4w9WgXcQ', {
          type: 'audio',
          quality: 'best',
          client: 'IOS',
          range: { start: 1000, end: 2000 }
      } as any);
      
      let chunks = 0;
      let bytes = 0;
      for await (const chunk of stream) {
          chunks++;
          bytes += chunk.length;
      }
      console.log(`Success! Got ${chunks} chunks, ${bytes} bytes`);
  } catch (err: any) {
      console.log('Download error:', err.message);
  }
}

test().catch(console.error);
