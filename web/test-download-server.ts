import express from 'express';
import { Innertube, UniversalCache } from 'youtubei.js';

const app = express();
let yt: Innertube;

app.get('/test/:id', async (req, res) => {
  const { id } = req.params;
  if (!yt) {
    yt = await Innertube.create({ cache: new UniversalCache(false), retrieve_player: true });
  }

  try {
     console.log('Downloading', id);
     // Try to get info first for content length if possible
     const info = await yt.getBasicInfo(id, { client: 'IOS' });
     const format = info.chooseFormat({ type: 'audio', quality: 'best' });
     
     let start = 0;
     let end = 0;
     if (req.headers.range) {
         const parts = req.headers.range.replace(/bytes=/, "").split("-");
         start = parseInt(parts[0], 10);
         end = parts[1] ? parseInt(parts[1], 10) : 0;
     }

     const stream = await yt.download(id, {
         type: 'audio',
         quality: 'best',
         client: 'IOS',
     });

     if (format?.mime_type) res.setHeader('Content-Type', format.mime_type);
     res.setHeader('Accept-Ranges', 'bytes');
     if (format?.content_length) {
         const total = parseInt(format.content_length, 10);
         if (req.headers.range) {
             end = end || total - 1;
             res.status(206);
             res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
             res.setHeader('Content-Length', (end - start + 1).toString());
         } else {
             res.setHeader('Content-Length', total.toString());
         }
     }

     for await (const chunk of stream) {
         if (!res.write(chunk)) {
             await new Promise((resolve) => res.once('drain', resolve));
         }
     }
     res.end();
  } catch (e: any) {
     console.error("error", e.message);
     res.status(500).json({ error: e.message });
  }
});

app.listen(4000, () => console.log('Test server on 4000'));
