import {describe,expect,it} from "vitest";
import {createApp} from "./app.js";
import {openDatabase} from "./db/database.js";
describe("Fastify API",()=>{
  it("reports health, hides unverified streams, rejects bad input",async()=>{
    const app=await createApp(openDatabase(":memory:"));
    expect((await app.inject("/health")).json().status).toBe("ok");
    expect((await app.inject("/stations")).json()).toEqual({stations:[],total:0});
    expect((await app.inject("/stations?limit=0")).statusCode).toBe(400);
    expect((await app.inject("/stations/clouds-fm")).statusCode).toBe(404);
    expect((await app.inject({method:"POST",url:"/reports",payload:{stationId:"clouds-fm",detail:"Broken"}})).statusCode).toBe(202);
    await app.close();
  });

  it("publishes only approved video sources and retains attribution",async()=>{
    const db=openDatabase(":memory:");
    const statement=db.prepare(`INSERT INTO video_sources(id,title,broadcaster,source_url,type,attribution,approved,country,official_website,verified_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    statement.run("approved-video","Official broadcast","Example TV","https://www.youtube.com/watch?v=abcdefghijk","youtube","Source: Example TV",1,"TZ","https://example.org","2026-11-16T00:00:00.000Z");
    statement.run("pending-video","Pending broadcast","Example TV","https://www.youtube.com/watch?v=abcdefghijk","youtube","Source: Example TV",0,"TZ","https://example.org","2026-11-16T00:00:00.000Z");
    const app=await createApp(db);
    const response=await app.inject("/videos?country=TZ");
    expect(response.statusCode).toBe(200);
    expect(response.json().videos).toHaveLength(1);
    expect(response.json().videos[0]).toMatchObject({id:"approved-video",attribution:"Source: Example TV",country:"TZ"});
    expect((await app.inject("/videos?country=BAD")).statusCode).toBe(400);
    await app.close();
  });
  it("rejects blank station search",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations?search=%20%20")).statusCode).toBe(400);await app.close();});
  it("rejects noninteger pagination limits",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations?limit=1.5")).statusCode).toBe(400);await app.close();});
  it("rejects unexpected station query keys",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations?approved=true")).statusCode).toBe(400);await app.close();});
  it("rejects excessive pagination offset",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations?offset=999999999")).statusCode).toBe(400);await app.close();});
  it("rejects unsupported station countries",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations?country=XX")).statusCode).toBe(400);await app.close();});
  it("rejects oversize station search terms",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations?search="+"x".repeat(90))).statusCode).toBe(400);await app.close();});
  it("sets frame-denial header",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/health")).headers["x-frame-options"]).toBe("DENY");await app.close();});
  it("enforces frame-ancestor restriction",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/health")).headers["content-security-policy"]).toContain("frame-ancestors");await app.close();});
  it("rejects control characters in problem reports",async()=>{const app=await createApp(openDatabase(":memory:"));const r=await app.inject({method:"POST",url:"/reports",payload:{stationId:"clouds-fm",detail:"bad\nheader"}});expect(r.statusCode).toBe(400);await app.close();});
  it("rejects unknown video filters",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/videos?isAdmin=true")).statusCode).toBe(400);await app.close();});
  it("rejects malformed station IDs",async()=>{const app=await createApp(openDatabase(":memory:"));expect((await app.inject("/stations/INVALID_!")).statusCode).toBe(400);await app.close();});
  it("adds no-store and content-type protection headers",async()=>{const app=await createApp(openDatabase(":memory:"));const response=await app.inject("/health");expect(response.headers["x-content-type-options"]).toBe("nosniff");expect(response.headers["cache-control"]).toContain("no-store");await app.close();});
  it("rejects unexpected report parameters",async()=>{const app=await createApp(openDatabase(":memory:"));const response=await app.inject({method:"POST",url:"/reports",payload:{stationId:"clouds-fm",detail:"broken",isAdmin:true}});expect(response.statusCode).toBe(400);await app.close();});
});
