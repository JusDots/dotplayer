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

Recommended setup:
- Frontend: **Firebase Hosting**
- Backend API (`web/server.ts`): **Vercel**

### 1) Deploy backend API on Vercel

```bash
cd web
npm i -g vercel
npm install
vercel --prod
```

Copy backend URL from output, for example:
- `https://dotplayer-api.vercel.app`

### 2) Build frontend with backend URL

```bash
cd web
# PowerShell:
$env:VITE_API_BASE_URL="https://dotplayer-api.vercel.app"
npm run build
cd ..
```

### 3) Deploy frontend on Firebase Hosting

```bash
firebase deploy --only hosting
```

Site URL will be:
- `https://dotplayer-api.web.app` (or your project hosting URL)

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