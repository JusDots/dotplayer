interface PresencePayload {
  title: string;
  artist: string;
  artwork?: string;
  playing: boolean;
  startedAt?: number;
}

export const updateDiscordPresence = async (payload: PresencePayload) => {
  try {
    await fetch('http://127.0.0.1:3789/rich-presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors',
    });
  } catch {
    // Companion may not be running; ignore silently.
  }
};
