import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { openDatabase, seedDatabase, loadSeedData, listStations, type RadioDb } from "./db/database.js";

export async function createApp(db:RadioDb=openDatabase()) {
  const app=Fastify({logger:false,bodyLimit:8192});
  await app.register(cors,{origin:process.env.WEB_ORIGIN?.split(",")??["http://localhost:5173"]});
  seedDatabase(db,loadSeedData());
  app.get("/health",async()=>({status:"ok",service:"redio-crawler",database:"connected"}));
  app.get("/stations",async(request,reply)=>{
    const result=z.object({search:z.string().max(100).optional(),country:z.string().max(3).optional(),limit:z.coerce.number().int().min(1).max(100).default(50),offset:z.coerce.number().int().min(0).default(0)}).safeParse(request.query);
    if(!result.success)return reply.code(400).send({error:"invalid_query"});
    const {search,country,limit,offset}=result.data;
    const all=listStations(db).filter(s=>(!search||s.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&(!country||s.country===country.toUpperCase()));
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
  app.get("/videos",async()=>({videos:db.prepare("SELECT id,title,broadcaster,source_url AS sourceUrl,type,attribution FROM video_sources WHERE approved=1 ORDER BY title").all()}));
  app.addHook("onClose",async()=>db.close());
  return app;
}
