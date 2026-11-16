# Phase 4 — Live TV & Video / TV na Video Mubashara

## Usage / Matumizi
The Video tab fetches `GET /videos` from the Fastify API. Only manually approved rows with verification timestamps are exposed. No video IDs, logos, broadcasts, or permissions are invented. The initial `data/videos.seed.json` remains an empty array.

**Permitted media:** official YouTube watch/live/embed URLs shown using the standard iframe player (with privacy-enhanced YouTube host); and HTTPS .m3u8 HLS feeds published by broadcasters that permit embedding. No YouTube ripping, stream recording or rehosting.

**Player controls:** the viewer starts only when a user selects a video, and browser audio is paused. Starting radio playback closes the video viewer to avoid competing media. A direct link to the official broadcaster is always visible. If the viewer fails, users are directed to that source; some YouTube channels disable embedding.

## Adding a broadcaster
1. Identify an official broadcaster and obtain permission or confirm terms that allow embedding, playback, and attribution.
2. Record exact metadata, official source URL, country code, attribution and UTC verification timestamp in `data/videos.seed.json`.
3. Use the schema in `apps/crawler/src/video/sources.ts`. Each entry requires `id`, `title`, `broadcaster`, `country` (TZ/KE/UG/RW/BI), `type` (youtube/hls), `sourceUrl`, `officialWebsite`, `attribution`, `verifiedAt`. Entries must have `approved:false`.
4. From the project root, run:

```bash
npm install
npm run import:videos -w @redio/crawler -- ./data/videos.seed.json
```

5. Review source rights, official ownership, HTTPS and iframe restrictions. Import never approves records. A trusted database operator must set `approved=1` **only after review**; do not expose an unauthenticated admin API.
6. Restart the browser or refresh the Video tab.

## API
- `GET /videos`: list verified, approved source records.
- `GET /videos?country=TZ`: filter by supported country codes.

## Validation (required before Phase 4 PASS)
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The presence of test files is not evidence they passed. CI and actual browser/device checks must be verified on a connected environment. Streaming requires a live internet connection; there is no offline video. Android APK and background playback are Phase 5 work.

## Legal
Broadcast media belongs to the broadcaster. This project provides attribution and official links but not a license to re-distribute. Do not bypass access restrictions, DRM, CORS policies, YouTube policies, or iframe embedding restrictions.
