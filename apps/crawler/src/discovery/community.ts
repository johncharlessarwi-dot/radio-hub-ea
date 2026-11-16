import { z } from "zod";
import type { RadioDb } from "../db/database.js";
import { safePublicHttpUrl } from "../parsers/streams.js";

const Country=z.enum(["TZ","KE","UG","RW","BI"]);
const Entry=z.object({
  stationuuid:z.string().uuid(),
  name:z.string().trim().min(1).max(200),
  countrycode:Country,
  url_resolved:z.string().optional().nullable(),
  url:z.string().optional().nullable(),
  homepage:z.string().max(2048).optional().nullable(),
  favicon:z.string().max(2048).optional().nullable(),
  tags:z.string().max(1024).optional().nullable(),
  language:z.string().max(256).optional().nullable(),
});
export type CommunityStation=z.infer<typeof Entry>;

export function stationIdentity(name:string,country:string):string {
  return country.toUpperCase()+":"+name.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function normalizeCommunityStation(input:unknown): (CommunityStation & {streamUrl:string|null}) | null {
  const parsed=Entry.safeParse(input);
  if(!parsed.success)return null;
  const row=parsed.data;
  const streamUrl=safePublicHttpUrl(row.url_resolved??row.url??"");
  if(!streamUrl)return null;
  return {...row,streamUrl};
}
export function importCommunityStations(db:RadioDb, entries:unknown[]):{imported:number;skipped:number} {
  const existing=db.prepare("SELECT name,country FROM stations").all() as Array<{name:string;country:string}>;
  const identities=new Set(existing.map(s=>stationIdentity(s.name,s.country)));
  const addStation=db.prepare("INSERT OR IGNORE INTO stations(id,name,country,city,frequency,languages,genres,logo,website,source) VALUES (?,?,?,NULL,NULL,?,?,?,?, 'community')");
  const addStream=db.prepare("INSERT OR IGNORE INTO station_streams(station_id,url,approved,provenance) VALUES (?,?,0,'radio-browser-community')");
  let imported=0,skipped=0;
  db.transaction(()=>{
    for(const candidate of entries){
      const row=normalizeCommunityStation(candidate);
      if(!row){skipped++;continue;}
      const identity=stationIdentity(row.name,row.countrycode);
      if(identities.has(identity)){skipped++;continue;}
      identities.add(identity);
      const id="community-"+row.stationuuid;
      const languages=JSON.stringify((row.language??"").split(",").map(s=>s.trim()).filter(Boolean).slice(0,8));
      const genres=JSON.stringify((row.tags??"").split(",").map(s=>s.trim()).filter(Boolean).slice(0,8));
      addStation.run(id,row.name,row.countrycode,languages,genres,safePublicHttpUrl(row.favicon??""),safePublicHttpUrl(row.homepage??""));
      addStream.run(id,row.streamUrl);
      imported++;
    }
  })();
  return {imported,skipped};
}

export async function fetchCommunityStations(country:"TZ"|"KE"|"UG"|"RW"|"BI",fetcher:typeof fetch=fetch):Promise<unknown[]>{
  const mirrors=["https://de1.api.radio-browser.info","https://nl1.api.radio-browser.info"];
  for(const mirror of mirrors){
    try{
      const url=mirror+"/json/stations/bycountrycodeexact/"+country+"?limit=100&hidebroken=true";
      const response=await fetcher(url,{headers:{"User-Agent":"REDIO-HUB-EA/0.1 (+https://github.com/johncharlessarwi-dot/radio-hub-ea)","Accept":"application/json"},redirect:"error",signal:AbortSignal.timeout(10000)});
      if(!response.ok)continue;
      const length=Number(response.headers.get("content-length")??0);
      if(length>1_000_000)throw Error("Community response too large");
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength>1_000_000)throw Error("Community response exceeds limit");
      const json:unknown=JSON.parse(new TextDecoder().decode(bytes));
      if(!Array.isArray(json)||json.length>100)throw Error("Invalid community response");
      return json;
    }catch{ /* try another fixed mirror */ }
  }
  throw Error("No Radio Browser mirror available");
}
