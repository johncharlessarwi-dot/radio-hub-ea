import {describe,it,expect} from "vitest";
import {youtubeEmbedUrl,isSafeVideoSource,type VideoSource} from "./sources";
const source:VideoSource={id:"demo",title:"Example",broadcaster:"Example",country:"TZ",type:"youtube",sourceUrl:"https://www.youtube.com/watch?v=abcdefghijk",officialWebsite:"https://broadcaster.example",attribution:"Official broadcaster",verifiedAt:"2026-11-16T00:00:00.000Z"};
describe("safe video URLs",()=>{
 it("builds a privacy-enhanced YouTube iframe",()=>expect(youtubeEmbedUrl(source.sourceUrl)).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk"));
 it("rejects lookalike YouTube hosts",()=>expect(youtubeEmbedUrl("https://youtube.com.evil.test/watch?v=abcdefghijk")).toBeNull());
 it("rejects unsafe HLS URLs",()=>expect(isSafeVideoSource({...source,type:"hls",sourceUrl:"http://example.com/live.m3u8"})).toBe(false));
 it("permits explicit HTTPS HLS manifests",()=>expect(isSafeVideoSource({...source,type:"hls",sourceUrl:"https://stream.example/live.m3u8"})).toBe(true));
});
