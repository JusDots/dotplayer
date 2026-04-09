import { Innertube, UniversalCache } from 'youtubei.js';

async function testDownload() {
    console.log("Creating Innertube...");
    const yt = await Innertube.create({
      cache: new UniversalCache(true),
      retrieve_player: true,
    });
    
    console.log("Testing stream info...");
    try {
        const format = await yt.getStreamingData('lYBUbBu4W08', { type: 'audio', quality: 'best' });
        console.log("Format found:", format?.url ? "Yes" : "No", format?.mime_type);
    } catch(err: any) {
        console.error("Info getting Error:", err.message);
    }
}
testDownload();
