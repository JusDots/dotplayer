import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
    console.log("Creating Innertube...");
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: false,
    });
    console.log("Testing MWEB...");
    try {
        const info = await yt.getBasicInfo('jNQXAC9IVRw', { client: 'MWEB' });
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        console.log("IOS Success:", format?.url ? "Yes" : "No url");
    } catch(err: any) {
        console.error("IOS Error:", err.message);
    }
}
test();
