import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
type InstallPrompt=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export function InstallApp({language}:{language:"sw"|"en"}){
  const [deferred,setDeferred]=useState<InstallPrompt|null>(null);
  useEffect(()=>{
    const handler=(event:Event)=>{event.preventDefault();setDeferred(event as InstallPrompt);};
    const done=()=>setDeferred(null);
    window.addEventListener("beforeinstallprompt",handler);
    window.addEventListener("appinstalled",done);
    return ()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",done);};
  },[]);
  if(!deferred)return null;
  const install=async()=>{
    const event=deferred;
    setDeferred(null);
    try{await event.prompt();await event.userChoice;}catch{/* browser dismissed or no longer eligible */}
  };
  return <button className="install-app" onClick={()=>void install()} aria-label={language==="sw"?"Sakinisha programu":"Install app"}><Smartphone size={17}/><span>{language==="sw"?"Sakinisha App":"Install App"}</span><Download size={16}/></button>;
}
