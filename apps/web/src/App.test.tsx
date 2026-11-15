import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";
describe("REDIO HUB EA radio",()=>{
  it("renders Swahili-first navigation and search",()=>{
    const html=renderToStaticMarkup(<App/>);
    expect(html).toContain("Redio zako.");
    expect(html).toContain("REDIO HUB");
    expect(html).toContain("Tafuta redio");
    expect(html).toContain("Vipendwa");
  });
});
