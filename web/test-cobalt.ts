async function testCobalt() {
  try {
      const res = await fetch("https://api.cobalt.tools/api/json", {
          method: "POST",
          headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              url: "https://www.youtube.com/watch?v=lYBUbBu4W08",
              isAudioOnly: true,
              aFormat: "mp3", 
          })
      });
      const data = await res.json();
      console.log(data);
  } catch (e: any) {
      console.log("Error:", e.message);
  }
}
testCobalt();
