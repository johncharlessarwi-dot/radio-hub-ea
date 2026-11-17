import { z } from "zod";
import { safePublicHttpUrl } from "../parsers/streams.js";

// A video source must be an approved broadcaster link; never accept player HTML.
export const videoSourceSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]{1,80}$/),
  title:z.string().trim().min(1).max(180),
  broadcaster:z.string().trim().min(1).max(180),
  country:z.enum(["TZ","KE","UG","RW","BI"]),
  type:z.enum(["youtube","hls"]),
  sourceUrl:z.string().url().max(2048),
  officialWebsite:z.string().url().max(2048),
  attribution:z.string().trim().min(1).max(500),
  verifiedAt:z.string().datetime(),
  approved:z.boolean().default(false)
}).superRefine((item,ctx)=>{
  if(Date.parse(item.verifiedAt)>Date.now()+300_000){ctx.addIssue({code:"custom",message:"Future verification timestamp"});return;}
  let source:URL,official:URL;
  try {source=new URL(item.sourceUrl);official=new URL(item.officialWebsite);}
  catch {ctx.addIssue({code:"custom",message:"Invalid URL"});return;}
  if(!safePublicHttpUrl(item.sourceUrl)||!safePublicHttpUrl(item.officialWebsite)||source.protocol!=="https:"||official.protocol!=="https:"||source.username||source.password||official.username||official.password){
    ctx.addIssue({code:"custom",message:"Only HTTPS without embedded credentials is supported"});return;
  }
  if(source.hash||official.hash){ctx.addIssue({code:"custom",message:"Video source URLs may not include fragments"});return;}
  if(source.port||official.port){ctx.addIssue({code:"custom",message:"Media endpoints must use standard HTTPS ports"});return;}
  if(item.type==="youtube"){
    if(source.hostname!=="www.youtube.com"&&source.hostname!=="youtube.com"){
      ctx.addIssue({code:"custom",message:"Official YouTube links only"});return;
    }
    if([...source.searchParams.keys()].some(k=>k!=="v")){ctx.addIssue({code:"custom",message:"Unexpected YouTube query parameter"});return;}
    if(source.searchParams.getAll("v").length>1){ctx.addIssue({code:"custom",message:"Duplicate YouTube video identifiers"});return;}
    if(source.pathname!=="/watch"&&source.search){ctx.addIssue({code:"custom",message:"Embed and live paths may not contain query parameters"});return;}
    const id=source.pathname.match(/^\/(?:embed|live)\/([A-Za-z0-9_-]{11})$/)?.[1]
      ??(source.pathname==="/watch"?source.searchParams.get("v"):null);
    if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id)){
      ctx.addIssue({code:"custom",message:"Must refer to an exact YouTube video or live broadcast ID"});
    }
  }else if(source.search){
    ctx.addIssue({code:"custom",message:"HLS playlists may not contain query tokens"});
  }else if(!/\.m3u8(?:$|[?#])/i.test(source.href)){
    ctx.addIssue({code:"custom",message:"HLS video must reference an explicit .m3u8 manifest"});
  }
});
export type VideoSource=z.infer<typeof videoSourceSchema>;

export function youtubeEmbedUrl(sourceUrl:string):string|null{
  try{
    const u=new URL(sourceUrl);
    if(u.protocol!=="https:"||!["youtube.com","www.youtube.com"].includes(u.hostname)||u.username||u.password||u.hash||u.port||[...u.searchParams.keys()].some(k=>k!=="v")||u.searchParams.getAll("v").length>1)return null;
    if(u.pathname!=="/watch"&&u.search)return null;
    const id=u.pathname.match(/^\/(?:embed|live)\/([A-Za-z0-9_-]{11})$/)?.[1]??(u.pathname==="/watch"?u.searchParams.get("v"):null);
    return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?`https://www.youtube-nocookie.com/embed/${id}`:null;
  }catch{return null;}
}
