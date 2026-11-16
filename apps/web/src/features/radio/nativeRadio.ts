import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativeRadio {
  play(options:{url:string;title:string;urls:string[]}):Promise<void>;
  pause():Promise<void>;
  stop():Promise<void>;
  setVolume(options:{volume:number}):Promise<void>;
  setSleepTimer(options:{minutes:number}):Promise<void>;
}
const bridge=registerPlugin<NativeRadio>("NativeRadio");
export const isNativeRadio=():boolean=>Capacitor.getPlatform()==="android" && Capacitor.isNativePlatform();
export const nativeRadio={
  async play(url:string,title:string,urls:string[]){
    if(!/^https:\/\/[^\s]+$/i.test(url))throw Error("HTTPS radio streams only");
    const approved=urls.filter(s=>/^https:\/\/[^\s]+$/i.test(s)).slice(0,8);
    await bridge.play({url,title,urls:approved});
  },
  pause:()=>bridge.pause(),
  stop:()=>bridge.stop(),
  setVolume:(volume:number)=>bridge.setVolume({volume}),
  setSleepTimer:(minutes:number)=>bridge.setSleepTimer({minutes})
};
