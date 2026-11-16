// @vitest-environment node
import {describe,it,expect} from "vitest";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const installer=fileURLToPath(new URL("../../../scripts/install-native-media.mjs",import.meta.url));
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),"redio-android-"));
 const java=join(dir,"app/src/main/java/app/rediohubea/mobile");
 mkdirSync(java,{recursive:true});
 const manifest=join(dir,"app/src/main/AndroidManifest.xml");
 const gradle=join(dir,"app/build.gradle");
 const activity=join(java,"MainActivity.java");
 writeFileSync(manifest,'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:label="REDIO HUB EA"></application></manifest>');
 writeFileSync(gradle,'plugins {}\ndependencies {\n}\n');
 writeFileSync(activity,'package app.rediohubea.mobile;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {}');
 return {dir,manifest,gradle,activity};
}
describe("Native Android patcher",()=>{
 it("installs service and plugin exactly once across repeated runs",()=>{
   const f=fixture();
   try{
     for(let n=0;n<2;n++)execFileSync(process.execPath,[installer],{env:{...process.env,REDIO_ANDROID_PROJECT_DIR:f.dir}});
     const manifest=readFileSync(f.manifest,"utf8");
     const activity=readFileSync(f.activity,"utf8");
     const gradle=readFileSync(f.gradle,"utf8");
     expect((manifest.match(/android:name="\.RadioPlaybackService"/g)??[])).toHaveLength(1);
     expect(manifest).toContain("android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK");
     expect(manifest).toContain('android:exported="false"');
     expect((activity.match(/registerPlugin\(NativeRadioPlugin.class\)/g)??[])).toHaveLength(1);
     expect((gradle.match(/androidx.media3:media3-session:/g)??[])).toHaveLength(1);
   }finally{rmSync(f.dir,{recursive:true,force:true});}
 });
 it("fails closed for a missing generated Android project",()=>{
   const dir=mkdtempSync(join(tmpdir(),"redio-empty-"));
   try{
     expect(()=>execFileSync(process.execPath,[installer],{env:{...process.env,REDIO_ANDROID_PROJECT_DIR:dir},stdio:"pipe"})).toThrow();
   }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
