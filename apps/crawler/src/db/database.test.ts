import { describe,expect,it } from "vitest";
import { openDatabase,seedDatabase,listStations } from "./database.js";
describe("SQLite station catalogue",()=>{
  it("never exposes unapproved stream URLs",()=>{const db=openDatabase(":memory:");seedDatabase(db,[{id:"demo",name:"Demo",country:"TZ",city:null,frequency:null,language:[],genre:[],logo:null,website:null,streamUrls:["https://radio.example/live"],source:"official"}]);expect(listStations(db,true)[0].streamUrls).toEqual([]);db.close();});
  it("enforces foreign key constraints",()=>{const db=openDatabase(":memory:");expect(()=>db.prepare("INSERT INTO station_streams(station_id,url) VALUES (?,?)").run("missing","https://radio.example/live")).toThrow();db.close();});
  it("seeds idempotently and hides unverified streams",()=>{
    const db=openDatabase(":memory:");
    const station={id:"radio-test",name:"Radio Test",country:"TZ",city:null,frequency:null,language:["sw"],genre:[],logo:null,website:null,streamUrls:[],source:"official" as const};
    seedDatabase(db,[station]);seedDatabase(db,[station]);
    expect((db.prepare("SELECT count(*) AS c FROM stations").get() as {c:number}).c).toBe(1);
    expect(listStations(db)).toEqual([]);
    expect(listStations(db,true)[0].name).toBe("Radio Test");
    db.close();
  });
});
