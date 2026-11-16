# REDIO HUB EA 📻

**Sauti na Matangazo ya Afrika Mashariki, Popote Ulipo.**

Open-source, Swahili-first foundation for an East African live-radio directory, website, PWA, and Android app. **Under active construction: no verified streams or signed APK releases are available yet.**

## Anza / Getting started

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev:api
# In another terminal:
npm run dev:web
```

The API defaults to `http://localhost:8787` and web to `http://localhost:5173`. Configure `apps/web/.env` with `VITE_API_BASE_URL` when your backend is remote.

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Data / Vituo

Ten Tanzanian stations are seeded as **unverified metadata**, without guessed frequencies, logos, or stream links. The public API intentionally hides stations without an approved healthy stream. See [docs/CRAWLER.md](docs/CRAWLER.md).

## Android

The Capacitor config exists, but a working background-playback service, Android project, signing pipeline, and APK are not implemented. Please do not represent this scaffold as a downloadable Android release.

## Legal / Sheria

All station broadcasts belong to their respective publishers. See [LEGAL.md](LEGAL.md). Submit station corrections or removal requests via GitHub Issues.

## Phase 4 — Official video / TV na video rasmi

The Video tab now includes a source-approved catalogue, official YouTube iframe playback, HTTPS HLS video support, broadcaster attribution, and links to original sources. Audio playback is paused when video starts. No broadcast URLs have been invented and the initial video directory is empty until operator review.

See [Phase 4 Video Guide](docs/PHASE4_VIDEO.md) for metadata import and validation. **CI green, real-device playback, signed Android APK and production release are not yet verified.**
