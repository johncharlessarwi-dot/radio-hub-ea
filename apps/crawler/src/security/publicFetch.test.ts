import { describe, expect, it } from "vitest";
import { choosePublicDnsAddress, isPublicAddress, fetchPublicUrl } from "./publicFetch.js";

describe("connection-bound outbound request validation",()=>{
  it("denies local, documentation, carrier-grade NAT and link-local addresses",()=>{
    for(const ip of ["127.0.0.1","10.1.0.2","169.254.169.254","172.17.0.2","192.168.1.10","100.64.0.1","192.0.2.4","198.51.100.1","203.0.113.9","::1","fc00::1","fe80::1","::ffff:127.0.0.1"]){
      expect(isPublicAddress(ip),ip).toBe(false);
    }
  });
  it("accepts routable public example addresses",()=>{
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("refuses mixed DNS results rather than selecting a public answer",()=>{
    expect(()=>choosePublicDnsAddress([{address:"8.8.8.8",family:4},{address:"10.0.0.1",family:4}])).toThrow("Unsafe DNS");
    expect(()=>choosePublicDnsAddress([])).toThrow("Unsafe DNS");
  });
  it("selects approved routable destinations",()=>{
    expect(choosePublicDnsAddress([{address:"8.8.8.8",family:4}])).toEqual({address:"8.8.8.8",family:4});
  });
  it("rejects an unsafe public URL before opening a connection",async()=>{
    await expect(fetchPublicUrl("http://127.0.0.1/admin")).rejects.toThrow("Disallowed public URL");
  });
});
