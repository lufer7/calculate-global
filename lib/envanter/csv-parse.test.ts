import { describe, expect, it } from "vitest";
import { detectDelimiter, findDomainColumn, parseCsv } from "./csv-parse";

describe("parseCsv", () => {
  it("noktalı virgül, tırnak, kaçış, CRLF, BOM", () => {
    expect(parseCsv('﻿domain;ziyaret\r\n"a;b.com";"1.234"\r\nc.com;"x""y"\n\n')).toEqual([
      ["domain", "ziyaret"],
      ["a;b.com", "1.234"],
      ["c.com", 'x"y'],
    ]);
  });
  it("virgül ve sonda satır sonu yok", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("tek kolon", () => expect(parseCsv("domain\nx.com\r")).toEqual([["domain"], ["x.com"]]));
  it("boş", () => expect(parseCsv("")).toEqual([]));
  it("ayraç tespiti", () => {
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    expect(detectDelimiter("a")).toBe(",");
  });
});

describe("findDomainColumn", () => {
  it("tam eşleşme önce, sonra içeren", () => {
    expect(findDomainColumn(["Ziyaret", "Domain"])).toBe(1);
    expect(findDomainColumn(["Site Adı", "x"])).toBe(0);
    expect(findDomainColumn(["Alan Adı"])).toBe(0);
    expect(findDomainColumn(["SİTE"])).toBe(0);
    expect(findDomainColumn(["URL"])).toBe(0);
    expect(findDomainColumn(["a", "b"])).toBe(-1);
  });
});
