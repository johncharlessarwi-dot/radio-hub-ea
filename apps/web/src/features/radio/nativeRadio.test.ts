import {describe,expect,it,vi} from "vitest";
const {play,pause}=vi.hoisted(()=>({play:vi.fn(async()=>{}),pause:vi.fn(async()=>{})}));
vi.mock("@capacitor/core",()=>({
  Capacitor:{getPlatform:()=>"android",isNativePlatform:()=>true},
  registerPlugin:()=>({play,pause,stop:vi.fn(),setVolume:vi.fn(),setSleepTimer:vi.fn()})
}));
import {isNativeRadio,nativeRadio} from "./nativeRadio";

describe("Capacitor native audio bridge",()=>{
 it("detects Android native runtime",()=>expect(isNativeRadio()).toBe(true));
 it("rejects non-HTTPS streams without calling the native plugin",async()=>{
   await expect(nativeRadio.play("http://station.example/live","Station",[])).rejects.toThrow("HTTPS");
   expect(play).not.toHaveBeenCalled();
 });
 it("sends only HTTPS fallback URLs",async()=>{
   await nativeRadio.play("https://radio.example/live","Test FM",["https://radio.example/live","http://insecure.example/live"]);
   expect(play).toHaveBeenCalledWith({url:"https://radio.example/live",title:"Test FM",urls:["https://radio.example/live"]});
 });
});
