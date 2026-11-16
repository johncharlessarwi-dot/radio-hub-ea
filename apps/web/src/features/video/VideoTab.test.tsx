// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {VideoTab} from "./VideoTab";
import {t} from "../../i18n/translations";
const source={id:"test-live",title:"Test live channel",broadcaster:"Example TV",country:"TZ",type:"youtube",sourceUrl:"https://www.youtube.com/watch?v=abcdefghijk",officialWebsite:"https://example.org",attribution:"Official broadcaster",verifiedAt:"2026-11-16T00:00:00Z"};
afterEach(()=>{vi.unstubAllGlobals();});
describe("VideoTab",()=>{
 it("shows safe empty state without fabricated streams",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({videos:[]})}));
  render(<VideoTab apiBase="https://api.example" tr={key=>t("sw",key)} onVideoStart={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByText(/Bado hakuna video rasmi/)).toBeTruthy());
 });
 it("only opens a player after an explicit click and pauses radio",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({videos:[source]})}));
  const pause=vi.fn();
  render(<VideoTab apiBase="https://api.example" tr={key=>t("sw",key)} onVideoStart={pause}/>);
  await waitFor(()=>expect(screen.getByText("Test live channel")).toBeTruthy());
  expect(screen.queryByTitle("Test live channel")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Tazama sasa"}));
  expect(pause).toHaveBeenCalledOnce();
  const frame=screen.getByTitle("Test live channel") as HTMLIFrameElement;
  expect(frame.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");
 });
 it("filters unsafe source URLs before showing broadcaster cards",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({videos:[{...source,sourceUrl:"https://youtube.com.evil.test/watch?v=abcdefghijk"}]})}));
  render(<VideoTab apiBase="https://api.example" tr={key=>t("en",key)} onVideoStart={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByText(/No approved official live videos yet/)).toBeTruthy());
 });
});
