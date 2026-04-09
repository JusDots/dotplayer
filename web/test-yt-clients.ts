import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
    console.log("Creating Innertube...");
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: false,
    });
    const clients = ['WEB', 'MWEB', 'ANDROID', 'IOS', 'TV_EMBEDDED'];
    for (const c of clients) {
        try {
            const info = await yt.getBasicInfo('lYBUbBu4W08', { client: c as any });
            const format = info.chooseFormat({ type: 'audio', quality: 'best' });
            console.log(c, "Success:", !!format?.url, !!format?.signature_cipher);
        } catch(err: any) {
            console.error(c, "Error:", err.message);
        }
    }
}
test();
