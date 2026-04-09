async function testCobaltv7() {
  try {
      const res = await fetch("https://api.cobalt.tools/", {
          method: "POST",
          headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              url: "https://www.youtube.com/watch?v=lYBUbBu4W08",
              audioFormat: "mp3",
              isAudioOnly: true
          })
      });
      console.log(res.status);
      const data = await res.json();
      console.log(data);
  } catch (e: any) {
      console.log("Error:", e.message);
  }
}
testCobaltv7();
