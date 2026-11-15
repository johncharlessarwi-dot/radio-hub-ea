import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parsePublicStreams, safePublicHttpUrl } from "../parsers/streams.js";
import type { RadioDb } from "../db/database.js";

const previousRequest=new Map<string,number>();
const MAX_HTML=512_000;
const AGENT="REDIO-HUB-EA/0.1 (+https://github.com/johncharlessarwi-dot/radio-hub-ea; contact via GitHub issues)";
function privateAddress(address:string):boolean {
  if(address.startsWith("::ffff:"))return privateAddress(address.substring(7));
  if(isIP(address)===4){
    const [a,b]=address.split(".").map(Number);
    return a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19);
  }
  if(isIP(address)===6)return address==="::"||address==="::1"||/^f[cd]/i.test(address)||/^fe[89ab]/i.test(address)||/^2001:db8:/i.test(address);
  return true;
}
export async function validateCrawlerTarget(url:string) {
  const canonical=safePublicHttpUrl(url);
  if(!canonical)throw Error("Disallowed URL");
  const host=new URL(canonical).hostname;
  const addresses=await lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>privateAddress(a.address)))throw Error("Unsafe DNS destination");
  return canonical;
}
async function throttledFetch(url:string, fetcher:typeof fetch):Promise<Response>{
  const hostname=new URL(url).hostname;
  const elapsed=Date.now()-(previousRequest.get(hostname)??0);
  if(elapsed<1000)await new Promise(r=>setTimeout(r,1000-elapsed));
  previousRequest.set(hostname,Date.now());
  return fetcher(url,{headers:{"User-Agent":AGENT,"Accept":"text/html,text/plain;q=0.9,*/*;q=0.1"},redirect:"error",signal:AbortSignal.timeout(9000)});
}
export function robotsAllows(content:string,path:string,userAgent="redio-hub-ea"):boolean{
  let selected=false;let inGroup=false;let bestLength=-1;let allowed=true;
  for(const original of content.split(/\r?\n/)){
    const line=original.replace(/#.*$/,"").trim();if(!line)continue;
    const match=/^([\w-]+)\s*:\s*(.*)$/.exec(line);if(!match)continue;
    const key=match[1].toLowerCase(),value=match[2].trim();
    if(key==="user-agent"){inGroup=value==="*"||userAgent.toLowerCase().includes(value.toLowerCase());selected=inGroup||selected;continue;}
    if(!inGroup||!selected||!["allow","disallow"].includes(key)||!value)continue;
    if(path.startsWith(value)&&value.length>=bestLength){bestLength=value.length;allowed=key==="allow";}
  }
  return allowed;
}
async function cappedText(response:Response):Promise<string> {
  if(!response.body)return "";
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_HTML)throw Error("Page too large");chunks.push(value);}
    return new TextDecoder().decode(Buffer.concat(chunks));
  }finally{await reader.cancel().catch(()=>{});}
}
export async function crawlPublicStation(db:RadioDb,stationId:string,website:string,fetcher:typeof fetch=fetch){
  const url=await validateCrawlerTarget(website);
  const robotUrl=new URL("/robots.txt",url).href;
  const robotResponse=await throttledFetch(robotUrl,fetcher);
  if(robotResponse.status!==404&&!robotResponse.ok)throw Error("Could not verify robots.txt");
  const robots=robotResponse.ok?await cappedText(robotResponse):"";
  if(!robotsAllows(robots,new URL(url).pathname))return {discovered:0,blocked:true};
  const page=await throttledFetch(url,fetcher);
  if(!page.ok||!/(text\/html|application\/xhtml\+xml)/i.test(page.headers.get("content-type")??""))throw Error("Not a public HTML page");
  const candidateUrls=parsePublicStreams(await cappedText(page),url);
  const insert=db.prepare("INSERT OR IGNORE INTO station_streams(station_id,url,approved,provenance) VALUES (?,?,0,?)");
  db.transaction(()=>{for(const stream of candidateUrls)insert.run(stationId,stream,url)})();
  return {discovered:candidateUrls.length,blocked:false};
}
