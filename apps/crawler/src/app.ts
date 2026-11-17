import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { videoSourceSchema } from "./video/sources.js";
import { openDatabase, seedDatabase, loadSeedData, listStations, type RadioDb } from "./db/database.js";

export async function createApp(db:RadioDb=openDatabase()) {
  const app=Fastify({logger:false,bodyLimit:8192,connectionTimeout:10000,requestTimeout:15000,keepAliveTimeout:5000});
  await app.register(rateLimit,{max:60,timeWindow:"1 minute",errorResponseBuilder:()=>({error:"rate_limited"})});
  await app.register(cors,{origin:(process.env.WEB_ORIGIN?.split(",").map(v=>v.trim()).filter(v=>/^https:\/\/[^/]+$/.test(v)||(process.env.NODE_ENV!=="production"&&/^http:\/\/localhost(?::\d+)?$/.test(v)))??(process.env.NODE_ENV==="production"?[]:["http://localhost:5173"]))});
  app.addHook("onSend",async(_request,reply,payload)=>{
    reply.header("X-Content-Type-Options","nosniff");
    reply.header("X-Frame-Options","DENY");
    reply.header("X-Download-Options","noopen");
    reply.header("Cache-Control","private, no-store, max-age=0");
    reply.header("Referrer-Policy","no-referrer");
    reply.header("Permissions-Policy","camera=(), microphone=(), geolocation=()");
    reply.header("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    return payload;
  });
  seedDatabase(db,loadSeedData());
  app.get("/health",async()=>({status:"ok",service:"redio-crawler",database:"connected"}));
  app.get("/stations",async(request,reply)=>{
    const result=z.object({search:z.string().trim().max(80).optional(),country:z.enum(["TZ","KE","UG","RW","BI"]).optional(),limit:z.coerce.number().int().min(1).max(100).default(50),offset:z.coerce.number().int().min(0).default(0),includeUnverified:z.enum(["true","false"]).optional()}).strict().safeParse(request.query);
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
  app.post("/reports",{config:{rateLimit:{max:5,timeWindow:"1 minute"}}},async(request,reply)=>{
    const parsed=z.object({stationId:z.string().regex(/^[a-z0-9-]{1,80}$/),detail:z.string().trim().min(1).max(500).optional()}).strict().safeParse(request.body);
    if(!parsed.success)return reply.code(400).send({error:"invalid_report"});
    if(parsed.data.detail && /[\u0000-\u001f\u007f]/.test(parsed.data.detail))return reply.code(400).send({error:"invalid_report"});
    const exists=db.prepare("SELECT id FROM stations WHERE id=?").get(parsed.data.stationId);
    if(!exists)return reply.code(404).send({error:"station_not_found"});
    db.prepare("INSERT INTO user_reports(station_id,detail) VALUES (?,?)").run(parsed.data.stationId,parsed.data.detail??null);
    return reply.code(202).send({status:"received"});
  });
  app.get("/videos",async(request,reply)=>{
    const query=z.object({country:z.enum(["TZ","KE","UG","RW","BI"]).optional()}).strict().safeParse(request.query);
    if(!query.success)return reply.code(400).send({error:"invalid_query"});
    const params=query.data.country?[query.data.country]:[];
    const rows=db.prepare(`SELECT id,title,broadcaster,country,source_url AS sourceUrl,type,official_website AS officialWebsite,attribution,verified_at AS verifiedAt
      FROM video_sources WHERE approved=1 AND verified_at IS NOT NULL${query.data.country?" AND country=?":""} ORDER BY title`).all(...params);
    const videos=(rows as Array<Record<string,unknown>>).filter(row=>videoSourceSchema.safeParse({...row,approved:true}).success);
    return {videos};
  });
  app.addHook("onClose",async()=>db.close());
  return app;
}
