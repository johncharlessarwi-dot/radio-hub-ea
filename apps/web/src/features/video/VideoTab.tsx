import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Play, RadioTower, RefreshCw, Tv, X } from "lucide-react";
import type { TranslationKey } from "../../i18n/translations";
import { isSafeVideoSource, youtubeEmbedUrl, type VideoSource } from "./sources";

type Translate=(key:TranslationKey)=>string;
interface Props {apiBase:string;tr:Translate;onVideoStart:()=>void;}
function HlsVideo({url,onError}:{url:string;onError:()=>void}){
 const ref=useRef<HTMLVideoElement|null>(null);
 useEffect(()=>{
  const el=ref.current;
  if(!el)return;
  let disposed=false;
  let cleanup=()=>{};
  const load=async()=>{
   if(el.canPlayType("application/vnd.apple.mpegurl")){
    el.src=url;
    return;
   }
   const {default:Hls}=await import("hls.js");
   if(disposed)return;
   if(!Hls.isSupported()){onError();return;}
   const player=new Hls({enableWorker:false,lowLatencyMode:false,maxBufferLength:15});
   cleanup=()=>player.destroy();
   player.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)onError();});
   player.loadSource(url);
   player.attachMedia(el);
  };
  void load().catch(()=>{if(!disposed)onError();});
  return ()=>{disposed=true;cleanup();el.pause();el.removeAttribute("src");el.load();};
 },[url,onError]);
 return <video ref={ref} className="broadcast-video" controls playsInline autoPlay={false} preload="none" onError={onError} aria-label="Official live video" />;
}
export function VideoTab({apiBase,tr,onVideoStart}:Props){
 const [videos,setVideos]=useState<VideoSource[]>([]);
 const [loading,setLoading]=useState(true);
 const [failed,setFailed]=useState(false);
 const [country,setCountry]=useState("");
 const [active,setActive]=useState<string|null>(null);
 const [playbackError,setPlaybackError]=useState(false);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  const load=async()=>{
   setLoading(true);setFailed(false);
   try{
    const response=await fetch(apiBase+"/videos",{signal:controller.signal});
    if(!response.ok)throw Error("Video catalogue unavailable");
    const payload:unknown=await response.json();
    if(!payload||typeof payload!=="object"||!("videos" in payload)||!Array.isArray(payload.videos))throw Error("Invalid video data");
    if(!controller.signal.aborted)setVideos((payload.videos as VideoSource[]).filter(isSafeVideoSource));
   }catch{if(!controller.signal.aborted){setFailed(true);setVideos([]);}}
   finally{if(!controller.signal.aborted)setLoading(false);}
  };
  void load();return ()=>controller.abort();
 },[apiBase,refresh]);
 const countries=[...new Set(videos.map(v=>v.country))].sort();
 const shown=videos.filter(v=>!country||v.country===country);
 const playing=videos.find(v=>v.id===active);
 const start=(video:VideoSource)=>{
  setPlaybackError(false);onVideoStart();setActive(video.id);
 };
 return <section className="video-section">
   <div className="section-heading"><div><span className="eyebrow subheading">OFFICIAL BROADCASTS</span><h2>{tr("videoLive")}</h2></div><span className="station-count">{videos.length}</span></div>
   <p className="video-intro">{tr("videoIntro")}</p>
   {playing&&<div className="video-active" role="region" aria-label={playing.title}>
    <div className="video-active-header"><strong>{playing.title}</strong><button className="icon-control" aria-label={tr("close")} onClick={()=>setActive(null)}><X size={19}/></button></div>
    {playbackError?<div className="empty-state"><AlertTriangle size={30}/><p>{tr("videoBlocked")}</p><a className="official-link" href={playing.officialWebsite} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{tr("officialSite")}</a></div>:
    playing.type==="youtube"?<iframe className="broadcast-video" title={playing.title} src={youtubeEmbedUrl(playing.sourceUrl)??undefined} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />:
    <HlsVideo url={playing.sourceUrl} onError={()=>setPlaybackError(true)}/>}
    <p className="video-attribution">{playing.broadcaster} · {playing.attribution}</p>
    <a className="official-link" href={playing.officialWebsite} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{tr("officialSite")}</a>
   </div>}
   <div className="filters video-filters"><select aria-label={tr("country")} value={country} onChange={e=>setCountry(e.target.value)}><option value="">{tr("country")}</option>{countries.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
   {loading?<div className="empty-state"><RefreshCw className="spin"/><p>{tr("loading")}</p></div>:
   failed?<div className="empty-state"><AlertTriangle size={34}/><p>{tr("apiError")}</p><button className="primary-button" onClick={()=>setRefresh(r=>r+1)}>{tr("retry")}</button></div>:
   shown.length===0?<div className="empty-state video-placeholder"><Tv size={42}/><p>{tr("videoSoon")}</p></div>:
   <div className="video-grid">{shown.map(v=><article className="video-card" key={v.id}>
    <div className="video-card-symbol"><RadioTower size={35}/><span>LIVE</span></div>
    <div className="video-card-body"><span className="video-country">{v.country} · {v.type.toUpperCase()}</span><h3>{v.title}</h3><p>{v.broadcaster}</p><small>{v.attribution}</small>
      <div className="video-card-actions"><button className="primary-button video-play" onClick={()=>start(v)}><Play size={17}/>{tr("watchNow")}</button><a className="official-link" href={v.officialWebsite} target="_blank" rel="noopener noreferrer">{tr("officialSite")}<ExternalLink size={15}/></a></div>
    </div>
   </article>)}</div>}
 </section>;
}
