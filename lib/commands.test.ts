import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands";

describe("parseCommand", () => {
  it.each([
    ["/cpm", "/hesapla/cpm"],
    ["/cpm banner", "/hesapla/cpm"],
    ["/CTR", "/hesapla/ctr"],
    ["cpa", "/hesapla/cpa"],
    ["/pacing", "/hesapla/pacing"],
    ["/vcr", "/hesapla/vtr"],
    ["/reach", "/reach-tahmin"],
    ["/sozluk", "/sozluk"],
    ["/sözlük header bidding", "/sozluk?q=header%20bidding"],
    ["/sozluk vast", "/sozluk?q=vast"],
    ["/envanter ornek.com", "/envanter?domain=ornek.com"],
    ["/envanter", "/envanter"],
    ["/mecra twitch", "/mecra?q=twitch"],
    ["/spec", "/mecra"],
    ["/bütçe", "/hesapla/cpm?bilinmeyen=a"],
    ["header bidding", "/sozluk?q=header%20bidding"],
  ])("%s → %s", (input, href) => {
    expect(parseCommand(input)).toEqual({ ok: true, href });
  });

  it("bilinmeyen komut", () => {
    const r = parseCommand("/kahve");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.mesaj).toContain("/kahve");
  });
  it("boş", () => expect(parseCommand("   ").ok).toBe(false));
});
