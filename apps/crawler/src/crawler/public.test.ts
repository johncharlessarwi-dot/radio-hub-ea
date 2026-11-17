import {describe,expect,it} from "vitest";
import {robotsAllows} from "./public.js";
describe("robots policy",()=>{
  it("ignores malformed empty user-agent groups",()=>{expect(robotsAllows("User-agent: \nDisallow: /private","/private")).toBe(true);});
  it("respects wildcard disallows",()=>{expect(robotsAllows("User-agent: *\nDisallow: /private","/private/list")).toBe(false);});
  it("accepts public pages",()=>{expect(robotsAllows("User-agent: *\nDisallow: /private","/live")).toBe(true);});
  it("does not apply rules for a different crawler",()=>{
    const robots="User-agent: OtherBot\nDisallow: /\nUser-agent: redio-hub-ea\nAllow: /public";
    expect(robotsAllows(robots,"/public/live")).toBe(true);
    expect(robotsAllows(robots,"/unlisted")).toBe(true);
  });
  it("prefers the specific group over wildcard",()=>{
    const robots="User-agent: *\nDisallow: /\nUser-agent: redio-hub-ea\nAllow: /";
    expect(robotsAllows(robots,"/radio")).toBe(true);
  });
  it("allows a more specific allow rule",()=>{expect(robotsAllows("User-agent: *\nDisallow: /\nAllow: /public","/public/radio")).toBe(true);});
});
