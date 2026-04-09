import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
    console.log("Creating Innertube...");
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: true,
    });
    
    console.log("Testing stream info...");
    try {
        const info = await yt.getBasicInfo('lYBUbBu4W08');
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        console.log("Format found:", format);
    } catch(err: any) {
        console.error("Info getting Error:", err.message);
    }
}
test();
