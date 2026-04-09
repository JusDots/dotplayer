import { getYTInstance } from './src/services/ytmusic';

const _origFetch = global.fetch;
global.fetch = async (input, init) => {
  let url = input as any;
  if (typeof url === 'string' && url.startsWith('/')) {
      url = 'http://localhost:5173' + url;
  }
  return _origFetch(url, init);
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
} as any;

import fs from 'fs';

async function test() {
  const instance = await getYTInstance();
  const home = await instance.music.getHomeFeed();
  const sections = home.sections as any[];
  
  const out = [];
  for (const shelf of sections) {
    const title = shelf.header?.title?.toString() || 'Untitled Shelf';
    const items = shelf.contents || shelf.items || [];
    if (items.length > 0) {
      const item = items[0];
      out.push({
         shelf: title,
         type: item.type,
         id: item.id,
         browseId: item.endpoint?.payload?.browseId,
         videoId: item.video_id || item.videoId || item.endpoint?.payload?.videoId,
         title: item.title?.toString() || '??'
      });
    }
  }
  fs.writeFileSync('recs-out.json', JSON.stringify(out, null, 2));
  console.log("Written to recs-out.json");
}

test().catch(console.error);
