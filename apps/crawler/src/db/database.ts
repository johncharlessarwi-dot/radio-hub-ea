import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { HealthResult } from "../health/check.js";

export interface StationSeed {id:string;name:string;country:string;city:string|null;frequency:string|null;language:string[];genre:string[];logo:string|null;website:string|null;streamUrls:string[];source:"official"|"community"}
export function openDatabase(dbPath=process.env.DB_PATH??resolve(process.cwd(),"data/redio.sqlite")) {
  if(dbPath!==":memory:") mkdirSync(dirname(dbPath),{recursive:true});
  const db=new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 3000");
  db.pragma("foreign_keys = ON");
  db.pragma("trusted_schema = OFF");
  db.pragma("recursive_triggers = OFF");
  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL, country TEXT NOT NULL,
      city TEXT, frequency TEXT, languages TEXT NOT NULL DEFAULT '[]',
      genres TEXT NOT NULL DEFAULT '[]', logo TEXT, website TEXT,
      source TEXT NOT NULL CHECK(source IN ('official','community')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS station_streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      url TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 100,
      approved INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unknown',
      latency_ms INTEGER, last_checked_at TEXT, consecutive_failures INTEGER NOT NULL DEFAULT 0,
      provenance TEXT, UNIQUE(station_id,url)
    );
    CREATE INDEX IF NOT EXISTS idx_stream_station ON station_streams(station_id,approved,status,priority);
    CREATE TABLE IF NOT EXISTS stream_health_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL REFERENCES station_streams(id) ON DELETE CASCADE,
      status TEXT NOT NULL, http_status INTEGER, content_type TEXT,
      latency_ms INTEGER, error TEXT, checked_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_health_stream ON stream_health_checks(stream_id,checked_at);
    CREATE TABLE IF NOT EXISTS crawl_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, station_id TEXT, started_at TEXT NOT NULL, finished_at TEXT, result TEXT);
    CREATE TABLE IF NOT EXISTS crawl_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER, level TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS video_sources (id TEXT PRIMARY KEY, title TEXT NOT NULL, broadcaster TEXT NOT NULL, source_url TEXT NOT NULL, type TEXT NOT NULL, attribution TEXT, approved INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS user_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, station_id TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
  const videoColumns=db.pragma("table_info(video_sources)") as Array<{name:string}>;
  const existing=new Set(videoColumns.map(c=>c.name));
  for(const [column,definition] of Object.entries({
    country:"TEXT NOT NULL DEFAULT 'TZ'",
    official_website:"TEXT",
    verified_at:"TEXT"
  })){
    if(!existing.has(column))db.exec(`ALTER TABLE video_sources ADD COLUMN ${column} ${definition}`);
  }
  return db;
}
export type RadioDb=ReturnType<typeof openDatabase>;
export function seedDatabase(db:RadioDb, seeds:StationSeed[]) {
  const insert=db.prepare("INSERT OR IGNORE INTO stations(id,name,country,city,frequency,languages,genres,logo,website,source) VALUES (@id,@name,@country,@city,@frequency,@languages,@genres,@logo,@website,@source)");
  const addStream=db.prepare("INSERT OR IGNORE INTO station_streams(station_id,url,approved,provenance) VALUES (?, ?, 0, 'seed-unverified')");
  db.transaction(()=>{for(const s of seeds){insert.run({...s,languages:JSON.stringify(s.language),genres:JSON.stringify(s.genre)});for(const url of s.streamUrls)addStream.run(s.id,url);}})();
}
export function loadSeedData():StationSeed[]{
  const path=fileURLToPath(new URL("../../../../data/stations.seed.json",import.meta.url));
  return JSON.parse(readFileSync(path,"utf8")) as StationSeed[];
}
export function listStations(db:RadioDb, includeUnverified=false) {
  const rows=db.prepare("SELECT * FROM stations ORDER BY name COLLATE NOCASE LIMIT 2000").all() as Array<{id:string;name:string;country:string;city:string|null;frequency:string|null;languages:string;genres:string;logo:string|null;website:string|null;source:"official"|"community"}>;
  return rows.map(r=>{
    const streams=db.prepare(`SELECT url FROM station_streams WHERE station_id=? AND approved=1 AND status='alive' ORDER BY priority LIMIT 8`).all(r.id) as Array<{url:string}>;
    return {id:r.id,name:r.name,country:r.country,city:r.city,frequency:r.frequency,language:JSON.parse(r.languages as string),genre:JSON.parse(r.genres as string),logo:r.logo,website:r.website,source:r.source,streamUrls:streams.map(s=>s.url)};
  }).filter(s=>includeUnverified||s.streamUrls.length>0);
}
export function recordHealth(db:RadioDb,streamId:number,result:HealthResult){
  db.transaction(()=>{
    db.prepare("INSERT INTO stream_health_checks(stream_id,status,http_status,content_type,latency_ms,error,checked_at) VALUES (?,?,?,?,?,?,?)").run(streamId,result.status,result.httpStatus,result.contentType,result.latencyMs,result.error,result.checkedAt);
    db.prepare(`UPDATE station_streams SET status=?,latency_ms=?,last_checked_at=?,
      consecutive_failures=CASE WHEN ?='alive' THEN 0 WHEN ?='dead' THEN consecutive_failures+1 ELSE consecutive_failures END
      WHERE id=?`).run(result.status,result.latencyMs,result.checkedAt,result.status,result.status,streamId);
  })();
}
