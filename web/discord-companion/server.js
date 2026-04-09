import express from 'express';
import cors from 'cors';
import RPC from 'discord-rpc';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '000000000000000000';
const PORT = Number(process.env.PORT || 3789);

const app = express();
app.use(cors());
app.use(express.json());

const rpc = new RPC.Client({ transport: 'ipc' });
let ready = false;
let lastPresence = null;
let loginInFlight = false;

rpc.on('ready', () => {
  ready = true;
  console.log('[Discord] Connected to Discord RPC');
});

rpc.on('disconnected', () => {
  ready = false;
  console.warn('[Discord] RPC disconnected');
});

rpc.on('error', (err) => {
  ready = false;
  console.warn(`[Discord] RPC error: ${err.message}`);
});

const ensureDiscord = async () => {
  if (ready) return true;
  if (loginInFlight) return false;
  loginInFlight = true;
  try {
    await rpc.login({ clientId: CLIENT_ID });
    loginInFlight = false;
    return true;
  } catch (e) {
    loginInFlight = false;
    console.warn('[Discord] Login failed. Set DISCORD_CLIENT_ID and run Discord app.');
    return false;
  }
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, ready, hasPresence: !!lastPresence });
});

app.post('/rich-presence', async (req, res) => {
  lastPresence = req.body;
  const ok = await ensureDiscord();
  if (!ok) return res.status(202).json({ ok: false, message: 'Companion received payload, Discord not connected.' });

  const { title, artist, playing, startedAt } = req.body || {};
  try {
    await rpc.setActivity({
      details: title || 'Listening on DotPlayer',
      state: artist || 'Unknown artist',
      startTimestamp: playing ? Math.floor((startedAt || Date.now()) / 1000) : undefined,
      largeImageKey: 'dotplayer',
      largeImageText: 'DotPlayer',
      instance: false,
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Discord] Companion listening on http://127.0.0.1:${PORT}`);
});

const shutdown = async () => {
  try {
    if (ready) await rpc.clearActivity();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
