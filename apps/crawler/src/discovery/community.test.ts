import { describe, expect, it, vi } from "vitest";
import { openDatabase,seedDatabase } from "../db/database.js";
import { importCommunityStations, normalizeCommunityStation,stationIdentity,fetchCommunityStations } from "./community.js";
const id="123e4567-e89b-42d3-a456-426614174000";
const entry={stationuuid:id,name:"  TEST FM  ",countrycode:"TZ",url_resolved:"https://stream.example/live.mp3",homepage:"https://example.com",favicon:"",tags:"music",language:"swahili"};
describe("community station import",()=>{
  it("normalizes identity for dedupe",()=>{
    expect(stationIdentity("Test-FM","tz")).toBe(stationIdentity("TEST FM","TZ"));
  });
  it("validates allowed public URLs",()=>{
    expect(normalizeCommunityStation(entry)?.streamUrl).toBe("https://stream.example/live.mp3");
    expect(normalizeCommunityStation({...entry,url_resolved:"http://127.0.0.1/admin"})).toBeNull();
  });
  it("refuses HTTP-only community candidates",()=>{expect(normalizeCommunityStation({...entry,url_resolved:"http://stream.example/live"})).toBeNull();});
  it("rejects oversized stream URLs",()=>{expect(normalizeCommunityStation({...entry,url_resolved:"https://radio.example/"+"x".repeat(2100)})).toBeNull();});
  it("rejects stations outside the five supported countries",()=>{expect(normalizeCommunityStation({...entry,countrycode:"ZZ"})).toBeNull();});
  it("rejects station entries without a valid UUID",()=>{expect(normalizeCommunityStation({...entry,stationuuid:"not-a-uuid"})).toBeNull();});
  it("rejects overly long station names",()=>{expect(normalizeCommunityStation({...entry,name:"R".repeat(201)})).toBeNull();});
  it("rejects excessively large tag strings",()=>{expect(normalizeCommunityStation({...entry,tags:"a".repeat(1025)})).toBeNull();});
  it("normalizes Unicode and punctuation for identities",()=>{expect(stationIdentity("Radio—ONE","tz")).toBe(stationIdentity("radio one","TZ"));});
  it("imports as unapproved and deduplicates",()=>{
    const db=openDatabase(":memory:");
    const first=importCommunityStations(db,[entry,entry]);
    expect(first).toEqual({imported:1,skipped:1});
    expect((db.prepare("SELECT approved FROM station_streams").get() as {approved:number}).approved).toBe(0);
    expect(importCommunityStations(db,[entry]).imported).toBe(0);
    db.close();
  });
  it("rejects imports over the 100-record security limit",()=>{const db=openDatabase(":memory:");expect(()=>importCommunityStations(db,Array.from({length:101},()=>entry))).toThrow("exceeds 100");db.close();});
  it("rejects credential-bearing imported streams",()=>{expect(normalizeCommunityStation({...entry,url_resolved:"https://name:secret@stream.example/live"})).toBeNull();});
  it("does not override seed-owned station identities",()=>{
    const db=openDatabase(":memory:");
    seedDatabase(db,[{id:"test-fm",name:"Test FM",country:"TZ",city:null,frequency:null,language:["sw"],genre:[],logo:null,website:null,streamUrls:[],source:"official"}]);
    expect(importCommunityStations(db,[entry]).imported).toBe(0);
    db.close();
  });
  it("aborts over-limit community response streams",async()=>{
    const fetcher=vi.fn().mockImplementation(async()=>new Response(new ReadableStream({
      start(controller){controller.enqueue(new Uint8Array(1_000_001));controller.close();}
    }),{headers:{"content-type":"application/json"}}));
    await expect(fetchCommunityStations("TZ",fetcher)).rejects.toThrow("No Radio Browser mirror");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
