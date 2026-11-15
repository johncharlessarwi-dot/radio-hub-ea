import {describe,expect,it} from "vitest";
import {robotsAllows} from "./public.js";
describe("robots policy",()=>{
  it("respects wildcard disallows",()=>{expect(robotsAllows("User-agent: *\nDisallow: /private","/private/list")).toBe(false);});
  it("accepts public pages",()=>{expect(robotsAllows("User-agent: *\nDisallow: /private","/live")).toBe(true);});
  it("allows a more specific allow rule",()=>{expect(robotsAllows("User-agent: *\nDisallow: /\nAllow: /public","/public/radio")).toBe(true);});
});
