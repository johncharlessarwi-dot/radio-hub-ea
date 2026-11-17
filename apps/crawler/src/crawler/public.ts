import { parsePublicStreams, safePublicHttpUrl } from "../parsers/streams.js";
import type { RadioDb } from "../db/database.js";
import { fetchPublicUrl, choosePublicDnsAddress } from "../security/publicFetch.js";
import { lookup } from "node:dns/promises";

const previousRequest=new Map<string,number>();
const MAX_HTML=512_000;
const AGENT="REDIO-HUB-EA/0.1 (+https://github.com/johncharlessarwi-dot/radio-hub-ea; contact via GitHub issues)";
export async function validateCrawlerTarget(url:string) {
  const canonical=safePublicHttpUrl(url);
  if(!canonical)throw Error("Disallowed URL");
  const host=new URL(canonical).hostname;
  const addresses=await lookup(host,{all:true});
  choosePublicDnsAddress(addresses);
  return canonical;
}
async function throttledFetch(url:string, fetcher:typeof fetch):Promise<Response>{
  const hostname=new URL(url).hostname;
  const elapsed=Date.now()-(previousRequest.get(hostname)??0);
  if(elapsed<1000)await new Promise(r=>setTimeout(r,1000-elapsed));
  previousRequest.set(hostname,Date.now());
  const guardedFetch=fetcher===fetch ? fetchPublicUrl : fetcher;
  return guardedFetch(url,{headers:{"User-Agent":AGENT,"Accept":"text/html,text/plain;q=0.9,*/*;q=0.1"},redirect:"error",signal:AbortSignal.timeout(9000)});
}
export function robotsAllows(content:string,path:string,userAgent="redio-hub-ea"):boolean{
  type Rule={path:string;allow:boolean};
  type Group={agents:string[];rules:Rule[]};
  const groups:Group[]=[];
  let current:Group|null=null;
  for(const original of content.split(/\r?\n/)){
    const line=original.replace(/#.*$/,"").trim();
    if(!line)continue;
    const match=/^([\w-]+)\s*:\s*(.*)$/.exec(line);
    if(!match)continue;
    const key=match[1].toLowerCase(),value=match[2].trim();
    if(key==="user-agent"){
      if(!current||current.rules.length>0){current={agents:[],rules:[]};groups.push(current);}
      current.agents.push(value.toLowerCase());
    }else if(current&&(key==="allow"||key==="disallow")&&value){
      current.rules.push({path:value,allow:key==="allow"});
    }
  }
  const ranked=groups.map(g=>({
    rank:Math.max(-1,...g.agents.map(a=>a==="*"?0:userAgent.toLowerCase().includes(a)?a.length:-1)),
    rules:g.rules,
  }));
  const highest=Math.max(-1,...ranked.map(g=>g.rank));
  if(highest<0)return true;
  const matching=ranked.filter(g=>g.rank===highest).flatMap(g=>g.rules)
    .filter(r=>path.startsWith(r.path))
    .sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return matching[0]?.allow??true;
}
async function cappedText(response:Response):Promise<string> {
  const declared=Number(response.headers.get("content-length")??0);
  if(Number.isFinite(declared)&&declared>MAX_HTML)throw Error("Page exceeds size limit");
  if(!response.body)return "";
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_HTML)throw Error("Page too large");chunks.push(value);}
    return new TextDecoder().decode(Buffer.concat(chunks));
  }finally{await reader.cancel().catch(()=>{});}
}
export async function crawlPublicStation(db:RadioDb,stationId:string,website:string,fetcher:typeof fetch=fetch){
  const allowlist=(process.env.CRAWL_ALLOWED_HOSTS??"").split(",").map(h=>h.trim().toLowerCase()).filter(Boolean);
  if(allowlist.length===0)throw Error("Official crawl host allowlist not configured");
  const url=await validateCrawlerTarget(website);
  if(!allowlist.includes(new URL(url).hostname.toLowerCase()))throw Error("Crawler host not approved");
  if(!url.startsWith("https://"))throw Error("Official crawler requires HTTPS");
  const robotUrl=new URL("/robots.txt",url).href;
  const robotResponse=await throttledFetch(robotUrl,fetcher);
  if(robotResponse.status!==404&&!robotResponse.ok)throw Error("Could not verify robots.txt");
  if(robotResponse.redirected)throw Error("robots redirect forbidden");
  const robots=robotResponse.ok?await cappedText(robotResponse):"";
  if(!robotsAllows(robots,new URL(url).pathname))return {discovered:0,blocked:true};
  const page=await throttledFetch(url,fetcher);
  if(!page.ok||!/(text\/html|application\/xhtml\+xml)/i.test(page.headers.get("content-type")??""))throw Error("Not a public HTML page");
  if(page.redirected)throw Error("Redirected pages are not permitted");
  const candidateUrls=parsePublicStreams(await cappedText(page),url).slice(0,50);
  const insert=db.prepare("INSERT OR IGNORE INTO station_streams(station_id,url,approved,provenance) VALUES (?,?,0,?)");
  db.transaction(()=>{for(const stream of candidateUrls)insert.run(stationId,stream,url)})();
  return {discovered:candidateUrls.length,blocked:false};
}
