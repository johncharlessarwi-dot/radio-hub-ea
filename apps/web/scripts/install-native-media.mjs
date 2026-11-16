import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const androidRoot = process.env.REDIO_ANDROID_PROJECT_DIR ? resolve(process.env.REDIO_ANDROID_PROJECT_DIR) : join(webRoot,"android");
const javaRoot = join(androidRoot,"app/src/main/java/app/rediohubea/mobile");
const manifestPath = join(androidRoot,"app/src/main/AndroidManifest.xml");
const gradlePath = join(androidRoot,"app/build.gradle");
const mainActivityPath = join(javaRoot,"MainActivity.java");
function assertPath(file) { if (!existsSync(file)) throw Error("Missing Capacitor Android project file: "+file); }
for(const file of [manifestPath,gradlePath,mainActivityPath])assertPath(file);
mkdirSync(javaRoot,{recursive:true});
for(const source of ["RadioPlaybackService.java","NativeRadioPlugin.java"]) {
 copyFileSync(join(webRoot,"native/android",source),join(javaRoot,source));
}
let activity=readFileSync(mainActivityPath,"utf8");
if(!activity.includes("registerPlugin(NativeRadioPlugin.class)")){
 if(!activity.includes("public class MainActivity extends BridgeActivity"))throw Error("Unexpected MainActivity: refusing unsafe edit");
 activity=activity.replace(/public class MainActivity extends BridgeActivity\s*\{/, `public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(NativeRadioPlugin.class);
    super.onCreate(savedInstanceState);
  }`);
 writeFileSync(mainActivityPath,activity);
}
let manifest=readFileSync(manifestPath,"utf8");
for (const permission of ["android.permission.FOREGROUND_SERVICE","android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"]) {
 if (!manifest.includes(permission)) {
   const perm=`    <uses-permission android:name="${permission}" />\n`;
   if (!manifest.includes("<application"))throw Error("Unexpected AndroidManifest.xml");
   manifest=manifest.replace("<application",perm+"    <application");
 }
}
if(!manifest.includes('android:name=".RadioPlaybackService"')){
 const service=`
        <service
            android:name=".RadioPlaybackService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="false">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>
`;
 if(!manifest.includes("</application>"))throw Error("Unexpected Android manifest application tag");
 manifest=manifest.replace("</application>",service+"    </application>");
}
writeFileSync(manifestPath,manifest);
let gradle=readFileSync(gradlePath,"utf8");
if(!gradle.includes("androidx.media3:media3-exoplayer:")){
 if(!gradle.includes("dependencies {"))throw Error("Unexpected app/build.gradle");
 gradle=gradle.replace("dependencies {",`dependencies {
    implementation "androidx.media3:media3-exoplayer:1.6.1"
    implementation "androidx.media3:media3-exoplayer-hls:1.6.1"
    implementation "androidx.media3:media3-session:1.6.1"`);
 writeFileSync(gradlePath,gradle);
}
console.log("Installed native Media3 playback service and Capacitor bridge");
