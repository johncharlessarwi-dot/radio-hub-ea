import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { isNativeRadio, nativeRadio } from "./nativeRadio";
import type { Station, PlaybackStatus } from "./types";

export function useRadioPlayer() {
  const native=isNativeRadio();
  const audio=useRef<HTMLAudioElement|null>(null);
  const hls=useRef<Hls|null>(null);
  const retry=useRef<ReturnType<typeof setTimeout>|null>(null);
  const sleep=useRef<ReturnType<typeof setTimeout>|null>(null);
  const attempts=useRef(0);
  const current=useRef<Station|null>(null);
  const sourceIndex=useRef(0);
  const startSource=useRef<(index:number)=>Promise<void>>(async()=>{});
  const [station,setStation]=useState<Station|null>(null);
  const [status,setStatus]=useState<PlaybackStatus>("idle");
  const [volume,setVolume]=useState(0.8);
  const [sleepMinutes,setSleepMinutes]=useState(0);
  const [expanded,setExpanded]=useState(false);
  const stopTimers=useCallback(()=>{
    if(retry.current){clearTimeout(retry.current);retry.current=null;}
    if(sleep.current){clearTimeout(sleep.current);sleep.current=null;}
  },[]);
  const cleanSource=useCallback(()=>{
    hls.current?.destroy();hls.current=null;
    if(audio.current){audio.current.pause();audio.current.removeAttribute("src");audio.current.load();}
  },[]);
  const stop=useCallback(()=>{
    stopTimers();cleanSource();if(native)void nativeRadio.stop();current.current=null;attempts.current=0;
    setStation(null);setStatus("idle");setSleepMinutes(0);setExpanded(false);
    if("mediaSession" in navigator)navigator.mediaSession.metadata=null;
  },[cleanSource,stopTimers,native]);
  const recover=useCallback(()=>{
    const s=current.current;
    if(!s)return;
    const next=sourceIndex.current+1;
    if(next<s.streamUrls.length){attempts.current=0;void startSource.current(next);return;}
    if(attempts.current>=3){setStatus("unavailable");return;}
    const delay=Math.min(15000,1500*2**attempts.current++);
    setStatus("reconnecting");
    if(retry.current)clearTimeout(retry.current);
    retry.current=setTimeout(()=>void startSource.current(0),delay);
  },[]);
  const start=useCallback(async(index:number)=>{
    const s=current.current,el=audio.current;
    if((!native&&!el)||!s||!s.streamUrls[index]){setStatus("unavailable");return;}
    if(retry.current){clearTimeout(retry.current);retry.current=null;}
    cleanSource();sourceIndex.current=index;setStatus("loading");
    const url=s.streamUrls[index];
    try{
      if(native){
        await nativeRadio.play(url,s.name,s.streamUrls);
        if(current.current===s&&sourceIndex.current===index){attempts.current=0;setStatus("playing");}
        return;
      }
      if(/\.m3u8(?:[?#]|$)/i.test(url)&&!el!.canPlayType("application/vnd.apple.mpegurl")){
        const {default:Hls}=await import("hls.js");
        if(current.current!==s||sourceIndex.current!==index)return;
        if(!Hls.isSupported())throw Error("HLS unsupported");
        const player=new Hls({enableWorker:false,lowLatencyMode:false,maxBufferLength:12});
        hls.current=player;
        await new Promise<void>((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error("HLS manifest timed out")),12000);
          player.on(Hls.Events.MANIFEST_PARSED,()=>{clearTimeout(timeout);resolve();});
          player.on(Hls.Events.ERROR,(_event,data)=>{
            if(data.fatal){clearTimeout(timeout);reject(new Error("HLS media error"));}
          });
          player.attachMedia(el!);
          player.loadSource(url);
        });
        player.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)recover();});
      }else{el!.src=url;}
      await el!.play();
      if(current.current!==s||sourceIndex.current!==index)return;
      attempts.current=0;setStatus("playing");
    }catch{
      if(current.current===s&&sourceIndex.current===index)recover();
    }
  },[cleanSource,recover,native]);
  startSource.current=start;
  const play=useCallback((next:Station)=>{
    if(!next.streamUrls.length){setStatus("unavailable");return;}
    if(current.current?.id===next.id){
      if(status==="playing"){if(native)void nativeRadio.pause();else audio.current?.pause();setStatus("paused");return;}
      void startSource.current(sourceIndex.current);return;
    }
    stopTimers();current.current=next;sourceIndex.current=0;attempts.current=0;
    setStation(next);setStatus("loading");void startSource.current(0);
    if(!native && "mediaSession" in navigator){
      navigator.mediaSession.metadata=new MediaMetadata({title:next.name,artist:"REDIO HUB EA",album:"Live Radio",artwork:next.logo?[{src:next.logo}]:[]});
    }
  },[status,stopTimers,native]);
  const pause=useCallback(()=>{if(native)void nativeRadio.pause();else audio.current?.pause();setStatus("paused");if(retry.current){clearTimeout(retry.current);retry.current=null;}},[native]);
  const resume=useCallback(()=>{if(current.current)void startSource.current(sourceIndex.current);},[]);
  const setPlayerVolume=useCallback((v:number)=>{const safe=Math.max(0,Math.min(1,v));setVolume(safe);if(native)void nativeRadio.setVolume(safe);else if(audio.current)audio.current.volume=safe;},[native]);
  const setTimer=useCallback((minutes:number)=>{
    if(sleep.current)clearTimeout(sleep.current);
    sleep.current=null;setSleepMinutes(minutes);
    if(native){void nativeRadio.setSleepTimer(minutes);return;}
    if(minutes>0)sleep.current=setTimeout(()=>{pause();setSleepMinutes(0);},minutes*60000);
  },[pause,native]);
  useEffect(()=>{
    if(native)return;
    const el=new Audio();el.preload="none";el.volume=volume;audio.current=el;
    const onError=()=>{if(current.current)recover();};
    const onPlaying=()=>setStatus("playing");
    const onStalled=()=>{if(current.current&& !el.paused)recover();};
    el.addEventListener("error",onError);el.addEventListener("playing",onPlaying);el.addEventListener("stalled",onStalled);
    if("mediaSession" in navigator){
      navigator.mediaSession.setActionHandler("play",resume);
      navigator.mediaSession.setActionHandler("pause",pause);
      navigator.mediaSession.setActionHandler("stop",stop);
    }
    return ()=>{
      stopTimers();hls.current?.destroy();el.pause();el.removeAttribute("src");el.load();
      el.removeEventListener("error",onError);el.removeEventListener("playing",onPlaying);el.removeEventListener("stalled",onStalled);
      if("mediaSession" in navigator){for(const action of ["play","pause","stop"] as const){navigator.mediaSession.setActionHandler(action,null);}}
      audio.current=null;
    };
  // A single audio engine must survive UI tab switches.
  },[native]);
  return {station,status,volume,sleepMinutes,expanded,setExpanded,play,pause,resume,stop,setPlayerVolume,setTimer,nextSource:()=>void startSource.current(sourceIndex.current+1<(current.current?.streamUrls.length??0)?sourceIndex.current+1:0)};
}
