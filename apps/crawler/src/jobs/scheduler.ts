import cron from "node-cron";
import type {RadioDb} from "../db/database.js";
import {recordHealth} from "../db/database.js";
import {checkStream} from "../health/check.js";
export function startJobs(db:RadioDb){
  let busy=false;
  const task=cron.schedule("*/15 * * * *",async()=>{
    if(busy)return;
    busy=true;
    try{
      const approved=db.prepare("SELECT id,url FROM station_streams WHERE approved=1").all() as Array<{id:number;url:string}>;
      for(const row of approved){
        try{recordHealth(db,row.id,await checkStream(row.url));}
        catch(error){console.error("Health probe failed",row.id,error);}
      }
    }finally{busy=false;}
  });
  return ()=>task.stop();
}
