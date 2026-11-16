import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { openDatabase, seedDatabase, loadSeedData, listStations, type RadioDb } from "./db/database.js";

export async function createApp(db:RadioDb=openDatabase()) {
  const app=Fastify({logger:false,bodyLimit:8192});
  await app.register(rateLimit,{max:60,timeWindow:"1 minute",errorResponseBuilder:()=>({error:"rate_limited"})});
  await app.register(cors,{origin:(process.env.WEB_ORIGIN?.split(",").map(v=>v.trim()).filter(v=>/^https:\/\/[^/]+$/.test(v))??(process.env.NODE_ENV==="production"?[]:["http://localhost:5173"]))});
  app.addHook("onSend",async(_request,reply,payload)=>{
    reply.header("X-Content-Type-Options","nosniff");
    reply.header("Cache-Control","no-store");
    reply.header("Referrer-Policy","no-referrer");
    return payload;
  });
  seedDatabase(db,loadSeedData());
  app.get("/health",async()=>({status:"ok",service:"redio-crawler",database:"connected"}));
  app.get("/stations",async(request,reply)=>{
    const result=z.object({search:z.string().max(100).optional(),country:z.string().max(3).optional(),limit:z.coerce.number().int().min(1).max(100).default(50),offset:z.coerce.number().int().min(0).default(0),includeUnverified:z.enum(["true","false"]).optional()}).safeParse(request.query);
    if(!result.success)return reply.code(400).send({error:"invalid_query"});
    const {search,country,limit,offset,includeUnverified}=result.data;
    const all=listStations(db,includeUnverified==="true").filter(s=>(!search||s.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&(!country||s.country===country.toUpperCase()));
    return {stations:all.slice(offset,offset+limit),total:all.length};
  });
  app.get("/stations/:id",async(request,reply)=>{
    const parsed=z.object({id:z.string().regex(/^[a-z0-9-]{1,80}$/)}).safeParse(request.params);
    if(!parsed.success)return reply.code(400).send({error:"invalid_id"});
    const station=listStations(db).find(s=>s.id===parsed.data.id);
    return station??reply.code(404).send({error:"station_not_found"});
  });
  app.get("/genres",async()=>({genres:[...new Set(listStations(db).flatMap(s=>s.genre))].sort()}));
  app.get("/countries",async()=>({countries:[...new Set(listStations(db).map(s=>s.country))].sort()}));
  app.post("/reports",async(request,reply)=>{
    const parsed=z.object({stationId:z.string().regex(/^[a-z0-9-]{1,80}$/),detail:z.string().trim().max(500).optional()}).safeParse(request.body);
    if(!parsed.success)return reply.code(400).send({error:"invalid_report"});
    const exists=db.prepare("SELECT id FROM stations WHERE id=?").get(parsed.data.stationId);
    if(!exists)return reply.code(404).send({error:"station_not_found"});
    db.prepare("INSERT INTO user_reports(station_id,detail) VALUES (?,?)").run(parsed.data.stationId,parsed.data.detail??null);
    return reply.code(202).send({status:"received"});
  });
  app.get("/videos",async(request,reply)=>{
    const query=z.object({country:z.enum(["TZ","KE","UG","RW","BI"]).optional()}).safeParse(request.query);
    if(!query.success)return reply.code(400).send({error:"invalid_query"});
    const params=query.data.country?[query.data.country]:[];
    const rows=db.prepare(`SELECT id,title,broadcaster,country,source_url AS sourceUrl,type,official_website AS officialWebsite,attribution,verified_at AS verifiedAt
      FROM video_sources WHERE approved=1 AND verified_at IS NOT NULL${query.data.country?" AND country=?":""} ORDER BY title`).all(...params);
    return {videos:rows};
  });
  app.addHook("onClose",async()=>db.close());
  return app;
}
