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
  it("selects the highest priority verified fallback",()=>{
    expect(chooseFallback([{url:"first",status:"dead" as const,priority:1},{url:"second",status:"alive" as const,priority:2},{url:"third",status:"alive" as const,priority:3}])?.url).toBe("second");
  });
});
