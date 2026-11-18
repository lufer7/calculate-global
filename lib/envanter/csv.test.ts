import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("hücre kaçışları", () => {
    expect(csvCell("düz")).toBe("düz");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell('a;b"c')).toBe('"a;b""c"');
    expect(csvCell("satır\nsonu")).toBe('"satır\nsonu"');
  });
  it("formül enjeksiyonu engellenir", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("-5")).toBe(`"'-5"`);
  });
  it("BOM + CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a;b\r\n1;x\r\n");
  });
});
