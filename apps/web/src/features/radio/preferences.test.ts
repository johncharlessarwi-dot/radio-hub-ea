import {describe,expect,it} from "vitest";
import {pushRecent,toggleId} from "./preferences";
describe("radio preferences",()=>{
  it("toggles favourites without duplicates",()=>{expect(toggleId(["one"],"one")).toEqual([]);expect(toggleId(["one"],"two")).toEqual(["two","one"]);});
  it("keeps saved favourites at a 200 station limit",()=>{expect(toggleId(Array.from({length:200},(_,i)=>String(i)),"new")).toHaveLength(200);});
  it("promotes the latest station and keeps recent history bounded",()=>{
    expect(pushRecent(["two","one"],"one")).toEqual(["one","two"]);
    expect(pushRecent(Array.from({length:30},(_,i)=>String(i)),"new")).toHaveLength(20);
  });
});
