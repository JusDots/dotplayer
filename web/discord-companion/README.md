# Discord Rich Presence Companion

This local helper lets the web player update Discord Rich Presence.

## Run

1. Create a Discord app and copy its client ID.
2. In this folder:
   - `npm install`
   - `set DISCORD_CLIENT_ID=your_client_id` (PowerShell: `$env:DISCORD_CLIENT_ID="..."`)
   - `npm start`
3. Keep Discord desktop app running.

The web app posts playback updates to `http://127.0.0.1:3789/rich-presence`.
