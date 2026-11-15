import { Heart, Pause, Play, Radio } from "lucide-react";
import type { Station } from "../features/radio/types";
import type { TranslationKey } from "../i18n/translations";

interface Props {
  station:Station;
  selected:boolean;
  playing:boolean;
  favourite:boolean;
  tr:(key:TranslationKey)=>string;
  onListen:(station:Station)=>void;
  onToggle:(id:string)=>void;
}
export function StationCard({station,selected,playing,favourite,tr,onListen,onToggle}:Props) {
  return <article className={"station-card"+(selected?" active-station":"")}>
    <div className="station-art">{station.logo?<img src={station.logo} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<Radio size={29}/>}</div>
    <div className="station-info"><strong>{station.name}</strong><span>{station.city||station.country} · {station.genre.join(", ")||tr("radio")}</span><small><i className="status-dot"/>{station.country} · LIVE</small></div>
    <div className="station-actions">
      <button className="favourite-button" aria-label={favourite?tr("unfavourite"):tr("favourite")} aria-pressed={favourite} onClick={()=>onToggle(station.id)}><Heart fill={favourite?"currentColor":"none"} size={17}/></button>
      <button className="play-button" aria-label={tr("play")+" "+station.name} onClick={()=>onListen(station)}>{selected&&playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button>
    </div>
  </article>;
}
