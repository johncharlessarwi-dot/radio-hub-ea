# Phase 3 — Radio Player / Kicheza Redio

## What is available / Kilichopo

- Swahili-first station catalogue with English toggle.
- Premium responsive dark theme and optional light theme.
- Search by station, country or city, plus country/city/genre selectors.
- Favourites and recently played stored locally without an account.
- One global HTML5 audio player, persistent across the Radio and Video UI tabs.
- HLS playback using native browser support where available, otherwise dynamically loaded hls.js.
- Stream fallback, capped reconnect attempts, play/pause, volume, sleep timer, Media Session metadata and browser media controls.
- Report a broken station using the backend API.
- Unverified station metadata is visible but **Play is disabled** until a verified stream becomes available.

## Run locally

```sh
npm install
npm run dev:api
# Open a separate terminal
npm run dev:web
```

Check the quality gates before releasing:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

The browser calls `GET /stations?limit=100&includeUnverified=true`; only previously approved and healthy streams appear in `streamUrls`. A seed without verified URLs is **not** presented as live.

## Known limitations / Yanayosubiri

- No legitimate stream URLs have been approved for the ten seed stations yet. The real player therefore cannot be end-to-end tested with live broadcasts.
- Native Android foreground-service background playback and signed APK releases are **Phase 5** work. Browser Media Session is not sufficient for guaranteed Android background playback.
- The Video tab remains an explicit placeholder for Phase 4.
- Browser HLS support varies; autoplay requires the user to initiate playback.
- Component and hook tests are committed, but a successful CI run must be verified separately.
- This is not an offline radio service; live broadcasts require a network connection.
