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