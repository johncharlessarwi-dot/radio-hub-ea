import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";
describe("REDIO HUB EA home",()=>{it("renders the Swahili brand",()=>{const html=renderToStaticMarkup(<App/>);expect(html).toContain("Redio zako.");expect(html).toContain("REDIO HUB");});});
