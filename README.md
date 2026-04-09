# DotPlayer

A modern YouTube Music-style player with:
- Android app code (`android/`)
- Web app (`web/`) with multi-source stream fallback
- Rich playback controls, keybinds, theming, and settings

## Repository Structure

- `android/` — Android app (Kotlin/Gradle)
- `web/` — React + Vite web app + Node stream server
- `web/discord-companion/` — local Discord Rich Presence companion

## Web Quick Start

```bash
cd web
npm install
npm run dev
```

Runs:
- Vite app at `http://localhost:5173`
- API/stream server at `http://localhost:3001`

## Production Hosting (No local dev needed)

Recommended setup (free + reliable):
- Frontend + Backend: **Vercel** (single deployment)

### 1) Deploy full web app on Vercel

```bash
cd web
npm i -g vercel
npm install
vercel --prod
```

Copy site URL from output, for example:
- `https://dotplayer-api.vercel.app`

API and frontend are served from the same domain:
- `https://dotplayer-api.vercel.app/`
- `https://dotplayer-api.vercel.app/api/home`

## Discord Rich Presence (Optional)

```bash
cd web/discord-companion
npm install
# PowerShell:
$env:DISCORD_CLIENT_ID="your_discord_app_client_id"
npm start
```

Then play music in the web app; it will post now-playing updates to the companion.

## Settings Highlights

- Theme presets: Default, Night, Nord, Light
- Custom theme override mode
- Color controls (accent, background, text, dot grid)
- Keybind customization
- UI sliders (scale, radius, offsets, blur, grid size)

## Build

```bash
cd web
npm run build
```

## Notes

- Public stream instances can be unstable; playback includes fallback + retry behavior.
- Keep local `.env`/secrets out of git.
- Free-tier path: deploy on Vercel only (no Firebase Functions/Blaze required).