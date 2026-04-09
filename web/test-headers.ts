async function test() {
  await fetch('http://localhost:3001/api/stream/dQw4w9WgXcQ');
  const res = await fetch('http://localhost:3001/api/stream-proxy/dQw4w9WgXcQ', {
    headers: { 'Range': 'bytes=0-100' }
  });
  console.log('Status code:', res.status);
  const text = await res.text();
  console.log('Response excerpt:', text.slice(0, 50));
}
test().catch(console.error);
