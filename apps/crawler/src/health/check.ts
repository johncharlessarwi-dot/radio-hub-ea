import { safePublicHttpUrl } from "../parsers/streams.js";
import { validateCrawlerTarget } from "../crawler/public.js";

export type HealthStatus = "alive" | "dead" | "unknown" | "restricted";
export interface HealthResult { status: HealthStatus; latencyMs: number | null; checkedAt: string; httpStatus: number | null; contentType: string | null; error: string | null }
const AUDIO = /^(audio\/|application\/(?:ogg|vnd\.apple\.mpegurl|x-mpegurl)|application\/octet-stream)/i;
function accepted(type: string, url: string) {
  return AUDIO.test(type) || (/\.m3u8?(?:[?#]|$)/i.test(url) && /^(application\/|audio\/|text\/plain)/.test(type));
}
export async function checkStream(url: string, fetcher: typeof fetch = fetch): Promise<HealthResult> {
  const checkedAt = new Date().toISOString();
  if (!safePublicHttpUrl(url)) return {status:"restricted",latencyMs:null,checkedAt,httpStatus:null,contentType:null,error:"Unsafe URL"};
  if (fetcher === fetch) {
    try { await validateCrawlerTarget(url); }
    catch { return {status:"restricted",latencyMs:null,checkedAt,httpStatus:null,contentType:null,error:"Unsafe DNS destination"}; }
  }
  const start = performance.now();
  let lastError: string | null = null;
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const response = await fetcher(url,{
        method,
        redirect:"error",
        signal:AbortSignal.timeout(7000),
        headers: method==="GET" ? {Range:"bytes=0-4095"} : {},
      });
      const contentType=response.headers.get("content-type")?.toLowerCase() ?? "";
      const latencyMs=Math.round(performance.now()-start);
      if ([401,403,451].includes(response.status)) return {status:"restricted",latencyMs,checkedAt,httpStatus:response.status,contentType,error:"Access restricted"};
      if (response.ok && accepted(contentType,url)) {
        if (response.body) await response.body.cancel().catch(()=>{});
        return {status:"alive",latencyMs,checkedAt,httpStatus:response.status,contentType,error:null};
      }
      if (response.body) await response.body.cancel().catch(()=>{});
      lastError="HTTP "+response.status+" ("+contentType+")";
      if (method==="HEAD") continue;
      return {status:"dead",latencyMs,checkedAt,httpStatus:response.status,contentType,error:lastError};
    } catch(e) {lastError=e instanceof Error?e.message:String(e);}
  }
  return {status:"unknown",latencyMs:Math.round(performance.now()-start),checkedAt,httpStatus:null,contentType:null,error:lastError};
}
export function chooseFallback<T extends {url:string;status:HealthStatus;priority:number}>(streams:T[], failedUrl?:string):T|null {
  return [...streams].filter(s=>s.url!==failedUrl&&s.status==="alive").sort((a,b)=>a.priority-b.priority)[0]??null;
}
