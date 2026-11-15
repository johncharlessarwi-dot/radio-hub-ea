import { describe, expect, it } from "vitest";
import seed from "../../../data/stations.seed.json";
describe("initial station catalogue",()=>{it("contains ten unique Tanzanian stations with no fabricated URLs",()=>{expect(seed).toHaveLength(10);expect(new Set(seed.map(s=>s.id)).size).toBe(10);expect(seed.every(s=>s.country==="TZ"&&s.streamUrls.length===0)).toBe(true);});});
