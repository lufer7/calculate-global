import { describe, expect, it } from "vitest";
import { solveRatio } from "./ratio";

describe("solveRatio (x = a/b × k)", () => {
  const k = 1000; // CPM
  it("x: maliyet + impression → CPM", () => expect(solveRatio({ a: 5000, b: 1_000_000 }, k, "x")).toBe(5));
  it("a: CPM + impression → bütçe", () => expect(solveRatio({ x: 25, b: 400_000 }, k, "a")).toBe(10_000));
  it("b: bütçe + CPM → impression", () => expect(solveRatio({ a: 10_000, x: 25 }, k, "b")).toBe(400_000));

  it("üç yön birbirini doğrular", () => {
    const a = 12_345.67;
    const b = 987_654;
    const x = solveRatio({ a, b }, 100, "x")!;
    expect(solveRatio({ x, b }, 100, "a")).toBeCloseTo(a, 8);
    expect(solveRatio({ a, x }, 100, "b")).toBeCloseTo(b, 6);
  });

  it("eksik/geçersiz girdi → null", () => {
    expect(solveRatio({ a: 1 }, k, "x")).toBeNull();
    expect(solveRatio({ b: 1 }, k, "x")).toBeNull();
    expect(solveRatio({ a: 1, b: 0 }, k, "x")).toBeNull();
    expect(solveRatio({ x: 1 }, k, "a")).toBeNull();
    expect(solveRatio({ b: 1 }, k, "a")).toBeNull();
    expect(solveRatio({ a: 1 }, k, "b")).toBeNull();
    expect(solveRatio({ x: 1 }, k, "b")).toBeNull();
    expect(solveRatio({ a: 1, x: 0 }, k, "b")).toBeNull();
    expect(solveRatio({ a: -1, b: 2 }, k, "x")).toBeNull();
    expect(solveRatio({ a: null, b: 2 }, k, "x")).toBeNull();
    expect(solveRatio({ a: 1, b: NaN }, k, "x")).toBeNull();
  });

  it("geçersiz k → null", () => {
    expect(solveRatio({ a: 1, b: 1 }, 0, "x")).toBeNull();
    expect(solveRatio({ a: 1, b: 1 }, Infinity, "x")).toBeNull();
  });
});
