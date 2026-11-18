import { describe, expect, it } from "vitest";
import { extractMeta } from "./meta";

describe("extractMeta", () => {
  it("title + description, entity çözümü", () => {
    const html = `<html><head><title> Nefis &amp; Lezzetli Tarifler </title>
      <meta charset="utf-8"><meta name="description" content="Kolay &quot;yemek&quot; tarifleri &#231;">
      </head></html>`;
    expect(extractMeta(html)).toEqual({ title: "Nefis & Lezzetli Tarifler", description: 'Kolay "yemek" tarifleri ç' });
  });
  it("og:description, tek tırnak, boş description atlanır", () => {
    const html = `<meta name="description" content=""><meta property='og:description' content='Spor haberleri &lt;canlı&gt; &apos;x&apos;'>`;
    expect(extractMeta(html)).toEqual({ title: null, description: "Spor haberleri <canlı> 'x'" });
  });
  it("hiçbiri yoksa null; boş title null; content'siz meta", () => {
    expect(extractMeta("<p>x</p>")).toEqual({ title: null, description: null });
    expect(extractMeta("<title>  </title><meta name='description'>").title).toBeNull();
  });
});
