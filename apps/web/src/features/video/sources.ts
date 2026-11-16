export type VideoType="youtube"|"hls";
export interface VideoSource {
 id:string;title:string;broadcaster:string;country:string;type:VideoType;
 sourceUrl:string;officialWebsite:string;attribution:string;verifiedAt:string;
}
export function safeVideoUrl(url:string):URL|null {
 try {
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||parsed.username||parsed.password)return null;
  return parsed;
 }catch{return null;}
}
export function youtubeEmbedUrl(url:string):string|null {
 const parsed=safeVideoUrl(url);
 if(!parsed||!["youtube.com","www.youtube.com"].includes(parsed.hostname))return null;
 const id=parsed.pathname.match(/^\/(?:embed|live)\/([A-Za-z0-9_-]{11})$/)?.[1]
   ??(parsed.pathname==="/watch"?parsed.searchParams.get("v"):null);
 return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?`https://www.youtube-nocookie.com/embed/${id}`:null;
}
export function isSafeVideoSource(source:VideoSource):boolean {
 const url=safeVideoUrl(source.sourceUrl);
 const website=safeVideoUrl(source.officialWebsite);
 if(!url||!website||!source.attribution)return false;
 if(source.type==="youtube")return youtubeEmbedUrl(source.sourceUrl)!==null;
 return source.type==="hls"&&/\.m3u8(?:[?#]|$)/i.test(url.href);
}
