import { describe, expect, it, vi } from "vitest";
import { checkStream, chooseFallback } from "./check.js";

describe("stream health checks",()=>{
  it("accepts a valid audio content type from HEAD",async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:200,headers:{"content-type":"audio/mpeg"}}));
    const result=await checkStream("https://radio.example/live",fetcher);
    expect(result.status).toBe("alive");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retries with GET when HEAD is unsupported",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:405})).mockResolvedValueOnce(new Response("audio",{status:200,headers:{"content-type":"audio/aac"}}));
    expect((await checkStream("https://radio.example/live",fetcher)).status).toBe("alive");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not request unsafe URL",async()=>{
    const fetcher=vi.fn();
    expect((await checkStream("http://127.0.0.1/private",fetcher)).status).toBe("restricted");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("restricts redirect responses without fetching redirected targets",async()=>{const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{location:"http://127.0.0.1/internal"}}));expect((await checkStream("https://radio.example/live",fetcher)).status).toBe("restricted");expect(fetcher).toHaveBeenCalledTimes(1);});
  it("classifies access forbidden as restricted",async()=>{const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:403}));expect((await checkStream("https://radio.example/live",fetcher)).status).toBe("restricted");});
  it("rejects HTML pages masquerading as streams",async()=>{const fetcher=vi.fn().mockResolvedValue(new Response("not audio",{status:200,headers:{"content-type":"text/html"}}));expect((await checkStream("https://radio.example/live",fetcher)).status).toBe("dead");});
  it("rejects link-local metadata endpoints",async()=>{const fetcher=vi.fn();expect((await checkStream("http://169.254.169.254/latest/meta-data/",fetcher)).status).toBe("restricted");expect(fetcher).not.toHaveBeenCalled();});
  it("does not choose restricted fallback streams",()=>{expect(chooseFallback([{url:"a",status:"restricted" as const,priority:1},{url:"b",status:"alive" as const,priority:9}])?.url).toBe("b");});
  it("selects the highest priority verified fallback",()=>{
    expect(chooseFallback([{url:"first",status:"dead" as const,priority:1},{url:"second",status:"alive" as const,priority:2},{url:"third",status:"alive" as const,priority:3}])?.url).toBe("second");
  });
});
