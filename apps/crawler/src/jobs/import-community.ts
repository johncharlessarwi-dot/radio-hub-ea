import { openDatabase } from "../db/database.js";
import { fetchCommunityStations, importCommunityStations } from "../discovery/community.js";

// Explicit operator-only command, never an unauthenticated HTTP endpoint.
const country=process.argv[2];
const supported=["TZ","KE","UG","RW","BI"] as const;
if(!supported.some(code=>code===country)){
  console.error("Usage: npm run import:community -w @redio/crawler -- TZ|KE|UG|RW|BI");
  process.exitCode=2;
}else{
  const db=openDatabase();
  try{
    const entries=await fetchCommunityStations(country as (typeof supported)[number]);
    const result=importCommunityStations(db,entries);
    console.info(JSON.stringify({country,received:entries.length,...result,approved:0}));
  }catch(error){
    console.error("Community import failed:",error);
    process.exitCode=1;
  }finally{db.close();}
}
