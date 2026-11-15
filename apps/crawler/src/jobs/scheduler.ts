import cron from "node-cron";
import type {RadioDb} from "../db/database.js";
import {recordHealth} from "../db/database.js";
import {checkStream} from "../health/check.js";
import {crawlPublicStation} from "../crawler/public.js";

export function startJobs(db:RadioDb){
  let checking=false;
  let crawling=false;
  const health=cron.schedule("*/15 * * * *",async()=>{
    if(checking)return;
    checking=true;
    try{
      const approved=db.prepare("SELECT id,url FROM station_streams WHERE approved=1").all() as Array<{id:number;url:string}>;
      for(const row of approved){
        try{recordHealth(db,row.id,await checkStream(row.url));}
        catch(error){console.error("Health probe failed",row.id,error);}
      }
    }finally{checking=false;}
  });
  const crawl=cron.schedule("15 3 * * *",async()=>{
    if(crawling||process.env.CRAWL_ENABLED!=="true")return;
    crawling=true;
    try{
      const websites=db.prepare("SELECT id,website FROM stations WHERE source='official' AND website IS NOT NULL").all() as Array<{id:string;website:string}>;
      for(const station of websites){
        try{await crawlPublicStation(db,station.id,station.website);}
        catch(error){console.error("Public crawl failed",station.id,error);}
      }
    }finally{crawling=false;}
  });
  return ()=>{health.stop();crawl.stop();};
}
