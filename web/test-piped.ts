async function findPiped() {
  const p = await fetch("https://raw.githubusercontent.com/TeamPiped/Piped-Instances/main/instances.json");
  const instances = await p.json();
  const up = instances.filter((i: any) => i.up && i.api_url);
  for (const i of up.slice(0, 15)) {
    try {
      const res = await fetch(`${i.api_url}/streams/lYBUbBu4W08`);
      if (res.ok) {
        const data = await res.json();
        const url = data.audioStreams?.find((s: any) => s.mimeType?.includes('audio'))?.url;
        if (url) {
           console.log(`WORKING: ${i.api_url}`);
        }
      }
    } catch(e) {}
  }
}
findPiped();
