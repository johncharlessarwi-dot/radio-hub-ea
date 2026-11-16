# Android APK & PWA / Kusakinisha REDIO HUB EA

## Status / Hali
The source includes a PWA offline shell, generated PNG icons, Capacitor 7 config, and an Android APK release workflow. A **signed release has not been published or verified yet**. Browser Media Session playback does **not** guarantee continued audio under Android screen lock. Media3 background playback service source and the Capacitor bridge are now included; device-level playback and notification behavior still require verification.

## Local web/PWA setup
Requires Node 20+, HTTPS for production PWA installation, and a separately deployed Fastify backend.

```bash
npm install
npm run build -w @redio/web
npm run dev:web
```

The build runs `apps/web/scripts/generate-icons.mjs` and emits `icon-192.png` and `icon-512.png` from the original SVG. Verify service worker behavior with a production preview. Only the **application shell** works offline; radio and video always require connectivity.

## Android build (development)
Capacitor 7 requires Android Studio with an Android SDK and Java 21 (for CLI build). In a machine with the Android SDK installed:

```bash
npm install
npm run android:init -w @redio/web
# Later web changes:
npm run android:sync -w @redio/web
cd apps/web/android
./gradlew assembleDebug
```

The first command creates `apps/web/android` locally from Capacitor (not committed). The generated Android project is patched by `apps/web/scripts/install-native-media.mjs`, which registers `NativeRadioPlugin`, installs a `MediaSessionService`, adds Media3 dependencies, and declares narrowly scoped foreground playback permissions. Review the generated Android project, package ID, and permissions. Do not enable unrestricted HTTP cleartext network traffic.

## Signed GitHub Release (not Play Store)
Configure GitHub repository variable:

- `VITE_API_BASE_URL` — production HTTPS URL of your running backend (no API key).

Configure four GitHub Actions encrypted secrets:

- `APK_KEYSTORE_BASE64` — Base64-encoded release signing keystore file.
- `APK_KEYSTORE_PASSWORD` — keystore password.
- `APK_KEY_PASSWORD` — private key password.
- `APK_KEY_ALIAS` — alias used when generating the key.

Create a local signing key and **retain an encrypted private backup**. Example:

```bash
keytool -genkeypair -v -keystore redio-release.jks -alias redio-hub-ea -keyalg RSA -keysize 3072 -validity 10000
base64 -w 0 redio-release.jks
```

Never commit or share the keystore/private key or credentials. Use your platform's alternative `base64` syntax where needed. Configure secrets through the repository's GitHub Actions settings.

When all required validation passes, create and push a version tag (e.g. `v0.1.0`). GitHub Actions `android-release.yml` will build the web assets, create the Android project, compile the release, align and sign it, verify the signature, generate SHA-256 checksums, and publish to **GitHub Releases**. The workflow intentionally fails if signing secrets or HTTPS backend configuration are missing.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Do not tag or release before tests and legal stream verification are complete. This workflow regenerates and patches the Android project on each run. **Native Media3 background playback source code is included but actual APK/device/lock-screen behavior is not yet verified.**

## Download and update
Download from the project's official GitHub Releases page only. Compare the checksum of the APK against `SHA256SUMS.txt`. Updates require the **same signing key**; losing the key can prevent in-place upgrades. Verify supported Android versions and installation prompts on a physical device before recommending it to users.

## Further acceptance gates
- Green GitHub CI and Android build logs
- Signed APK verified using `apksigner`
- Android device install, launch, playback and process lifecycle testing
- Background playback using a native foreground media service, proper audio focus, and lock-screen controls
- Manual approval of legitimate stream/video sources
- Confirm user permissions and privacy disclosures

Related: [Phase 3](PHASE3_PLAYER.md), [Phase 4](PHASE4_VIDEO.md), [Legal](../LEGAL.md).

## Native audio architecture (in progress)

The Android version uses `RadioPlaybackService.java` based on AndroidX Media3 ExoPlayer + MediaSessionService. Capacitor `NativeRadioPlugin.java` sends commands from React, while browser users retain HTML5 audio and hls.js. Notification controls are served by Android's MediaSession infrastructure. The app can select a secondary approved HTTPS stream after a fatal player error and uses bounded retries. The service is not exported to other applications. The Java/Gradle/manifest installer has isolation and idempotency regression tests.

The native service still needs confirmation on a physical Android device for screen lock, Bluetooth, audio focus, HLS variations, interrupted networks, battery restrictions, and media notification behavior. In-app playback state may not yet stay perfectly synchronized with notification controls. Do not describe the APK as production-ready until these checks pass.
