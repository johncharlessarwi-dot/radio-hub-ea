<p align="center">
  <a href="https://github.com/johncharlessarwi-dot"><img src="https://avatars.githubusercontent.com/u/263143496?v=4" width="120" height="120" alt="John Charles Sarwi" /></a>
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?lines=Redio%20Hub%20EA&amp;center=true&amp;vCenter=true&amp;width=300&amp;color=38BDF8" alt="Redio Hub EA" />
  <br />
  <a href="https://wa.me/255698170989?text=Habari%20John%2C%20nimeona%20Redio%20Hub%20EA%20kwenye%20GitHub."><img src="https://img.shields.io/badge/WhatsApp-Chat%20na%20John-168342?style=for-the-badge&amp;logo=whatsapp&amp;logoColor=white" alt="Chat na John kwenye WhatsApp" /></a>
</p>

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

## Phase 5 — PWA + Android packaging

The app now includes offline-shell PWA configuration, automatically generated 192×192 and 512×512 icons, a browser install control, and Capacitor Android build scripts. GitHub Actions can compile an Android debug APK on pull requests; a version tag triggers a workflow that requires GitHub signing secrets and a production HTTPS API URL, then signs and publishes the APK to GitHub Releases.

**Not released:** no CI/build success, signed APK, real device install, or native Android background-playback service has been verified yet. A browser Media Session implementation is not a substitute for native background audio. See [Android build and release instructions](docs/ANDROID_BUILD.md).

## Native Android background playback — implementation status

The Android target now contains an AndroidX Media3 `MediaSessionService` implementation, a local Capacitor bridge and installation scripts. The service requests audio focus, handles audio becoming noisy, exposes media-session playback controls, and supports approved HTTPS stream fallback plus a native sleep timer. These Java sources are patched into the generated Android project during `android:init`/`android:sync` and in GitHub Actions.

**Verification still required:** Android Gradle compilation, actual device background and Bluetooth control behaviour, synchronization of in-app state when notification controls are used, CI green status, signed APK, and legally verified live streams. No APK has been published as a result of these changes.

Read [Android build and testing](docs/ANDROID_BUILD.md) before making a release.
