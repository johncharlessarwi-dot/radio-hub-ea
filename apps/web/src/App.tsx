import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio, Tv, Heart, Search, WifiOff, Play, Pause, Volume2, Moon, Sun, Clock3, Maximize2, X, RefreshCw, AlertTriangle, Headphones, Signal, Globe2 } from "lucide-react";
import type { Station } from "./features/radio/types";
import { useRadioPlayer } from "./features/radio/useRadioPlayer";
import { StationCard } from "./components/StationCard";
import { readJson, saveJson, toggleId, pushRecent } from "./features/radio/preferences";
import { t, type Language } from "./i18n/translations";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
type Tab = "radio" | "video";
type Section = "all" | "favourites" | "recent";

export default function App() {
  const [stations,setStations]=useState<Station[]>([]);
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState(false);
  const [query,setQuery]=useState("");
  const [country,setCountry]=useState("");
  const [city,setCity]=useState("");
  const [genre,setGenre]=useState("");
  const [tab,setTab]=useState<Tab>("radio");
  const [section,setSection]=useState<Section>("all");
  const [language,setLanguage]=useState<Language>(()=>readJson<Language>("language","sw"));
  const [theme,setTheme]=useState<"dark"|"light">(()=>readJson<"dark"|"light">("theme","dark"));
  const [favourites,setFavourites]=useState<string[]>(()=>readJson<string[]>("favourites",[]));
  const [recent,setRecent]=useState<string[]>(()=>readJson<string[]>("recent",[]));
  const [reportMessage,setReportMessage]=useState("");
  const [online,setOnline]=useState(()=>typeof navigator==="undefined"?true:navigator.onLine);
  const player=useRadioPlayer();
  const tr=useCallback((key:Parameters<typeof t>[1])=>t(language,key),[language]);

  const reload=useCallback(async()=>{
    setLoading(true);setApiError(false);
    try{
      const response=await fetch(`${API}/stations?limit=100`);
      if(!response.ok)throw Error("Station API failed");
      const data:unknown=await response.json();
      if(!data||typeof data!=="object"||!("stations" in data)||!Array.isArray(data.stations))throw Error("Invalid stations");
      setStations((data.stations as Station[]).filter(s=>typeof s.id==="string"&&Array.isArray(s.streamUrls)));
    }catch{setApiError(true);setStations([]);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void reload();},[reload]);
  useEffect(()=>{saveJson("language",language);document.documentElement.lang=language;},[language]);
  useEffect(()=>{saveJson("theme",theme);document.documentElement.dataset.theme=theme;},[theme]);
  useEffect(()=>{saveJson("favourites",favourites);},[favourites]);
  useEffect(()=>{saveJson("recent",recent);},[recent]);
  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);
    window.addEventListener("online",update);window.addEventListener("offline",update);
    return ()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};
  },[]);

  const countries=useMemo(()=>[...new Set(stations.map(s=>s.country))].sort(),[stations]);
  const cities=useMemo(()=>[...new Set(stations.filter(s=>!country||s.country===country).map(s=>s.city).filter((s):s is string=>Boolean(s)))].sort(),[stations,country]);
  const genres=useMemo(()=>[...new Set(stations.flatMap(s=>s.genre))].sort(),[stations]);
  const displayed=useMemo(()=>stations.filter(s=>{
    if(query&&!([s.name,s.city??"",s.country].join(" ").toLowerCase().includes(query.toLowerCase())))return false;
    if(country&&s.country!==country)return false;
    if(city&&s.city!==city)return false;
    if(genre&&!s.genre.includes(genre))return false;
    if(section==="favourites"&&!favourites.includes(s.id))return false;
    if(section==="recent"&&!recent.includes(s.id))return false;
    return true;
  }).sort((a,b)=>section==="recent"?recent.indexOf(a.id)-recent.indexOf(b.id):a.name.localeCompare(b.name)),[stations,query,country,city,genre,section,favourites,recent]);

  const listen=(station:Station)=>{
    if(!station.streamUrls.length)return;
    setRecent(ids=>pushRecent(ids,station.id));player.play(station);
  };
  const report=async()=>{
    if(!player.station)return;
    setReportMessage("");
    try{
      const response=await fetch(`${API}/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stationId:player.station.id,detail:"Stream unavailable from player"})});
      setReportMessage(response.ok?tr("reported"):tr("reportError"));
    }catch{setReportMessage(tr("reportError"));}
  };
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-icon"><Radio size={23}/></span><div><strong>REDIO HUB <em>EA</em></strong><small>{tr("tagline")}</small></div></div>
      <div className="top-actions">
        <button className="text-control" onClick={()=>setLanguage(l=>l==="sw"?"en":"sw")} aria-label="Language"><Globe2 size={17}/>{language==="sw"?"EN":"SW"}</button>
        <button className="icon-control" onClick={()=>setTheme(v=>v==="dark"?"light":"dark")} aria-label={theme==="dark"?tr("light"):tr("dark")}>{theme==="dark"?<Sun size={19}/>:<Moon size={19}/>}</button>
      </div>
    </header>
    <main className="content">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/>{tr("welcome")}</div><h1>{tr("headline1")}<span>{tr("headline2")}</span></h1><p>{tr("description")}</p><div className="hero-stats"><span><Signal size={16}/>{countries.length} {tr("country").toLowerCase()}</span><span><Headphones size={16}/>{stations.length} {tr("all").toLowerCase()}</span></div></div><div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="orb orb-two"/><Radio size={94} strokeWidth={1.2}/></div></section>
      <nav className="tabs" aria-label="Media"><button className={tab==="radio"?"selected":""} onClick={()=>setTab("radio")}><Radio size={18}/>{tr("radio")}</button><button className={tab==="video"?"selected":""} onClick={()=>setTab("video")}><Tv size={18}/>{tr("video")}</button></nav>
      {!online&&<div role="status" className="notice"><WifiOff size={18}/>{tr("offline")}</div>}
      {tab==="radio"?<>
        <div className="section-heading"><div><span className="eyebrow subheading">DISCOVER · EXPLORE</span><h2>{tr("all")}</h2></div><span className="station-count">{stations.length}</span></div>
        <label className="search"><Search size={20}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr("search")}/><span className="shortcut">⌕</span></label>
        <div className="filters">
          <select aria-label={tr("country")} value={country} onChange={e=>{setCountry(e.target.value);setCity("");}}><option value="">{tr("country")}</option>{countries.map(value=><option key={value} value={value}>{value}</option>)}</select>
          <select aria-label={tr("city")} value={city} onChange={e=>setCity(e.target.value)}><option value="">{tr("city")}</option>{cities.map(value=><option key={value} value={value}>{value}</option>)}</select>
          <select aria-label={tr("genre")} value={genre} onChange={e=>setGenre(e.target.value)}><option value="">{tr("genre")}</option>{genres.map(value=><option key={value} value={value}>{value}</option>)}</select>
        </div>
        <div className="library-tabs" role="group" aria-label="Station collections">
          <button className={section==="all"?"active":""} onClick={()=>setSection("all")}>{tr("allTab")}</button>
          <button className={section==="favourites"?"active":""} onClick={()=>setSection("favourites")}><Heart size={15}/>{tr("favourites")}</button>
          <button className={section==="recent"?"active":""} onClick={()=>setSection("recent")}><Clock3 size={15}/>{tr("recent")}</button>
        </div>
        {loading?<div className="empty-state"><RefreshCw className="spin"/><p>{tr("loading")}</p></div>:
         apiError?<div className="empty-state"><WifiOff size={36}/><p>{tr("apiError")}</p><button className="primary-button" onClick={()=>void reload()}>{tr("retry")}</button></div>:
         displayed.length===0?<div className="empty-state"><Radio size={39}/><p>{tr("none")}</p></div>:
         <div className="station-grid">{displayed.map(s=><StationCard key={s.id} station={s} selected={player.station?.id===s.id} playing={player.status==="playing"} favourite={favourites.includes(s.id)} tr={tr} onListen={listen} onToggle={id=>setFavourites(ids=>toggleId(ids,id))}/>)}</div>}
      </>:<div className="empty-state video-placeholder"><Tv size={42}/><h2>{tr("video")}</h2><p>{tr("videoSoon")}</p></div>}
      <footer>© REDIO HUB EA · {tr("footer")}</footer>
    </main>
    {player.station&&<div className={"player-bar"+(player.expanded?" expanded":"")} role="region" aria-label="Radio player">
      <div className="player-main">
        <div className="player-station-icon"><Radio size={25}/></div>
        <div className="player-label"><strong>{player.station.name}</strong><span>{player.status==="playing"?tr("playing"):player.status==="reconnecting"?tr("reconnecting"):player.status==="unavailable"?tr("unavailable"):player.status==="loading"?tr("connecting"):tr("pause")}</span></div>
        <div className="player-controls">
          <button className="icon-control" aria-label={tr("next")} onClick={player.nextSource}><RefreshCw size={18}/></button>
          <button className="player-primary" aria-label={player.status==="playing"?tr("pause"):tr("play")} onClick={()=>player.status==="playing"?player.pause():player.resume()}>{player.status==="playing"?<Pause fill="currentColor" size={20}/>:<Play fill="currentColor" size={20}/>}</button>
          <button className="icon-control" aria-label={player.expanded?tr("close"):"Expand"} onClick={()=>player.setExpanded(!player.expanded)}>{player.expanded?<X size={19}/>:<Maximize2 size={18}/>}</button>
        </div>
      </div>
      {player.expanded&&<div className="player-extra">
        <label className="volume-control"><Volume2 size={18}/>{tr("volume")}<input aria-label={tr("volume")} type="range" min="0" max="1" step="0.05" value={player.volume} onChange={e=>player.setPlayerVolume(Number(e.target.value))}/></label>
        <label className="sleep-control"><Clock3 size={18}/>{tr("sleep")}<select value={player.sleepMinutes} onChange={e=>player.setTimer(Number(e.target.value))}><option value="0">{tr("off")}</option>{[5,10,15,30,60,90].map(m=><option value={m} key={m}>{m} {tr("minutes")}</option>)}</select></label>
        <div className="player-bottom"><button className="secondary-button" onClick={()=>void report()}><AlertTriangle size={16}/>{tr("report")}</button><button className="secondary-button" onClick={player.stop}><X size={16}/>{tr("close")}</button></div>
        {reportMessage&&<p role="status" className="report-status">{reportMessage}</p>}
      </div>}
    </div>}
    <nav className="mobile-nav" aria-label="Mobile navigation"><button className={tab==="radio"?"active":""} onClick={()=>setTab("radio")}><Radio size={21}/>{tr("radio")}</button><button className={tab==="video"?"active":""} onClick={()=>setTab("video")}><Tv size={21}/>{tr("video")}</button><button onClick={()=>{setTab("radio");setSection("favourites");}}><Heart size={21}/>{tr("favourites")}</button></nav>
  </div>;
}
