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
});
