import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openDatabase } from "../db/database.js";
import { videoSourceSchema } from "../video/sources.js";

// Operator-only metadata ingestion. All records stay unapproved until manual rights review.
// Usage: npm run import:videos -w @redio/crawler -- ./data/videos.seed.json
const filePath=resolve(process.argv[2]??"data/videos.seed.json");
let db:ReturnType<typeof openDatabase>|undefined;
try {
 const parsed:unknown=JSON.parse(readFileSync(filePath,"utf8"));
 if(!Array.isArray(parsed)||parsed.length>500)throw Error("Expected array of at most 500 video records");
 const entries=parsed.map(entry=>videoSourceSchema.parse(entry));
 db=openDatabase();
 const insert=db.prepare(`INSERT INTO video_sources
  (id,title,broadcaster,country,source_url,type,official_website,attribution,verified_at,approved)
  VALUES (@id,@title,@broadcaster,@country,@sourceUrl,@type,@officialWebsite,@attribution,@verifiedAt,0)
  ON CONFLICT(id) DO NOTHING`);
 let inserted=0;
 db.transaction(()=>{
  for(const entry of entries){inserted+=insert.run(entry).changes;}
 })();
 console.log(JSON.stringify({read:entries.length,inserted,approved:0,remainingReview:inserted}));
} catch(error){console.error("Video metadata import failed:",error);process.exitCode=1;}
finally{db?.close();}
