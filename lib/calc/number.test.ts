import { describe, expect, it } from "vitest";
import { formatChange, formatMoney, formatNumber, formatPercent, parseTrNumber } from "./number";

describe("parseTrNumber", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["1.500", 1500],
    ["1.234.567", 1234567],
    ["0.5", 0.5],
    ["0.500", 0.5],
    ["12.5", 12.5],
    ["12.50", 12.5],
    ["1234", 1234],
    ["₺ 2.000", 2000],
    ["%12,5", 12.5],
    ["15 TL", 15],
    ["15try", 15],
    ["-3,5", -3.5],
    [",5", 0.5],
    ["5,", 5],
    ["  42  ", 42],
    ["1.234.567,89", 1234567.89],
  ])("%s → %d", (input, expected) => {
    expect(parseTrNumber(input)).toBeCloseTo(expected, 10);
  });

  it.each([[""], ["   "], ["abc"], ["1,2,3"], ["1.2.3"], ["12.34,5"], [","], ["."], ["-"], ["1e5"]])(
    "%s → null",
    (input) => {
      expect(parseTrNumber(input)).toBeNull();
    },
  );

  it("null/undefined → null", () => {
    expect(parseTrNumber(null)).toBeNull();
    expect(parseTrNumber(undefined)).toBeNull();
  });
});

describe("biçimlendirme (tr-TR)", () => {
  it("formatNumber binlik nokta, ondalık virgül", () => {
    expect(formatNumber(1234.567)).toBe("1.234,57");
    expect(formatNumber(1234.5, 2, 2)).toBe("1.234,50");
    expect(formatNumber(1000000, 0)).toBe("1.000.000");
  });

  it("formatMoney", () => {
    expect(formatMoney(1234.56)).toBe("₺1.234,56");
    expect(formatMoney(2.5, "USD")).toBe("$2,50");
    expect(formatMoney(3, "EUR", 0)).toBe("€3");
  });

  it("formatPercent yüzde puanı alır", () => {
    expect(formatPercent(12.5)).toBe("%12,5");
    expect(formatPercent(0.08, 2)).toBe("%0,08");
  });

  it("formatChange ok işaretiyle", () => {
    expect(formatChange(2.14)).toEqual({ text: "▲ %2,1", direction: "up" });
    expect(formatChange(-0.8)).toEqual({ text: "▼ %0,8", direction: "down" });
    expect(formatChange(0.02)).toEqual({ text: "■ %0", direction: "flat" });
    expect(formatChange(-5.556, 2)).toEqual({ text: "▼ %5,56", direction: "down" });
  });
});
