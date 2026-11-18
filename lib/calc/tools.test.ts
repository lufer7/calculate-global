import { describe, expect, it } from "vitest";
import { getTool, TOOLS } from "./tools";
import { solveRatio } from "./ratio";
import * as m from "./metrics";

describe("araç tanımları", () => {
  it("P0 araçlarının hepsi var", () => {
    const slugs = TOOLS.map((t) => t.slug);
    for (const s of ["cpm", "ecpm", "ctr", "cpc", "cpv", "cpcv", "vtr", "viewability", "vcpm", "cpa", "pacing"]) {
      expect(slugs).toContain(s);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("her araç formül, kaynak ve varsayım taşıyor", () => {
    for (const t of TOOLS) {
      expect(t.formul.length).toBeGreaterThan(5);
      expect(t.kaynak.length).toBeGreaterThan(3);
      expect(t.varsayimlar.length).toBeGreaterThan(0);
      expect(t.neden.length).toBeGreaterThan(20);
    }
  });

  it("araç k katsayısı metrics.ts formülleriyle aynı sonucu verir", () => {
    const fns: Record<string, (a: number, b: number) => number | null> = {
      cpm: m.cpm, ecpm: m.ecpm, ctr: m.ctr, cpc: m.cpc, cpv: m.cpv, cpcv: m.cpcv,
      vtr: m.vtr, viewability: m.viewability, vcpm: m.vcpm, cpa: m.cpa,
    };
    for (const t of TOOLS) {
      if (t.tip !== "oran") continue;
      const fn = fns[t.slug]!;
      expect(solveRatio({ a: 1234, b: 5678 }, t.k, "x")).toBeCloseTo(fn(1234, 5678)!, 10);
    }
  });

  it("getTool", () => {
    expect(getTool("cpm")?.ad).toBe("CPM");
    expect(getTool("yok")).toBeUndefined();
  });
});
