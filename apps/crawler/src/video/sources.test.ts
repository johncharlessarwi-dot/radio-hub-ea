import { describe,expect,it } from "vitest";
import {videoSourceSchema,youtubeEmbedUrl,type VideoSource} from "./sources.js";
const valid:VideoSource={id:"public-live",title:"Public live",broadcaster:"Example",country:"TZ",type:"youtube",sourceUrl:"https://www.youtube.com/watch?v=abcdefghijk",officialWebsite:"https://www.example.org",attribution:"Official channel",verifiedAt:"2026-11-16T00:00:00.000Z",approved:false};
describe("video source validation",()=>{
 it("accepts a syntactically valid official YouTube link without claiming authorization",()=>{expect(videoSourceSchema.safeParse(valid).success).toBe(true);expect(youtubeEmbedUrl(valid.sourceUrl)).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");});
 it("rejects alternate lookalike YouTube domains",()=>{expect(videoSourceSchema.safeParse({...valid,sourceUrl:"https://www.youtube.com.evil.test/watch?v=abcdefghijk"}).success).toBe(false);});
 it("rejects non-HTTPS playlists",()=>{expect(videoSourceSchema.safeParse({...valid,type:"hls",sourceUrl:"http://streams.example/live.m3u8"}).success).toBe(false);});
 it("rejects playlist URLs without manifests",()=>{expect(videoSourceSchema.safeParse({...valid,type:"hls",sourceUrl:"https://streams.example/live.mp4"}).success).toBe(false);});
 it("rejects localhost and internal network video endpoints",()=>{expect(videoSourceSchema.safeParse({...valid,type:"hls",sourceUrl:"https://127.0.0.1/live.m3u8"}).success).toBe(false);});
 it("rejects extra YouTube parameters on approved metadata",()=>{expect(videoSourceSchema.safeParse({...valid,sourceUrl:"https://www.youtube.com/watch?v=abcdefghijk&list=PLmalicious"}).success).toBe(false);});
 it("rejects URL fragment injection",()=>{expect(videoSourceSchema.safeParse({...valid,sourceUrl:valid.sourceUrl+"#fragment"}).success).toBe(false);});
 it("rejects HLS manifests with URL query secrets",()=>{expect(videoSourceSchema.safeParse({...valid,type:"hls",sourceUrl:"https://media.example/live.m3u8?token=secret"}).success).toBe(false);});
 it("rejects credential-bearing official source URLs",()=>{expect(videoSourceSchema.safeParse({...valid,officialWebsite:"https://admin:secret@example.org"}).success).toBe(false);});
 it("rejects unverifiable future timestamps",()=>{expect(videoSourceSchema.safeParse({...valid,verifiedAt:"2099-01-01T00:00:00.000Z"}).success).toBe(false);});
});
