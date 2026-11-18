import { describe, expect, it } from "vitest";
import { QUIPS, quip, situationForMetric } from "./quips";

describe("quips", () => {
  it("deterministik ve değer dolduruyor", () => {
    const a = quip("viewability_dusuk", "%38", "x");
    expect(a).toBe(quip("viewability_dusuk", "%38", "x"));
    expect(a).toContain("%38");
    expect(QUIPS.viewability_dusuk.map((t) => t.replace("{v}", "%38"))).toContain(a);
  });

  it("durum tespiti", () => {
    expect(situationForMetric("viewability", 38)).toBe("viewability_dusuk");
    expect(situationForMetric("viewability", 60)).toBeNull();
    expect(situationForMetric("viewability", 75)).toBe("viewability_iyi");
    expect(situationForMetric("ctr", 8)).toBe("ctr_supheli");
    expect(situationForMetric("ctr", 0.01)).toBe("ctr_dusuk");
    expect(situationForMetric("ctr", 0.3)).toBeNull();
    expect(situationForMetric("vtr", 20)).toBe("vtr_dusuk");
    expect(situationForMetric("vtr", 60)).toBeNull();
    expect(situationForMetric("frekans", 14)).toBe("frekans_yuksek");
    expect(situationForMetric("frekans", 3)).toBeNull();
    expect(situationForMetric("cpm", 3)).toBeNull();
    expect(situationForMetric("ctr", null)).toBeNull();
  });
});
