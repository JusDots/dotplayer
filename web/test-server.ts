async function testServer() {
    console.log("Calling /api/stream/lYBUbBu4W08");
    const r1 = await fetch("http://localhost:3001/api/stream/lYBUbBu4W08");
    console.log(r1.status, await r1.text());

    console.log("Calling /api/stream-proxy/lYBUbBu4W08");
    const r2 = await fetch("http://localhost:3001/api/stream-proxy/lYBUbBu4W08");
    console.log(r2.status);
    const text2 = await r2.text();
    if(r2.status !== 200 && r2.status !== 206) {
        console.log("Error:", text2);
    } else {
        console.log("Stream looks ok! Length:", text2.length);
    }
}
testServer();
