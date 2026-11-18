import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

/** Türkçe karakterler (ğ ş ı İ) için latin + latin-ext fontları birlikte gömülür. */
async function fonts() {
  const dir = path.join(process.cwd(), "node_modules/@fontsource/jetbrains-mono/files");
  const load = (f: string) => fs.readFile(path.join(dir, f));
  const [l4, le4, l7, le7] = await Promise.all([
    load("jetbrains-mono-latin-400-normal.woff"),
    load("jetbrains-mono-latin-ext-400-normal.woff"),
    load("jetbrains-mono-latin-700-normal.woff"),
    load("jetbrains-mono-latin-ext-700-normal.woff"),
  ]);
  return [
    { name: "JBM", data: l4, weight: 400 as const, style: "normal" as const },
    { name: "JBM", data: le4, weight: 400 as const, style: "normal" as const },
    { name: "JBM", data: l7, weight: 700 as const, style: "normal" as const },
    { name: "JBM", data: le7, weight: 700 as const, style: "normal" as const },
  ];
}

export async function ogImage({ etiket, baslik, alt }: { etiket: string; baslik: string; alt?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0C10",
          color: "#E8ECF4",
          fontFamily: "JBM",
          padding: "64px 72px",
          border: "1px solid #232936",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
          <span style={{ color: "#FFB224" }}>&gt;</span>
          <span>{SITE_NAME}</span>
          <div style={{ display: "flex", width: 42, height: 28, background: "#E30A17", borderRadius: 3, position: "relative" }}>
            <div style={{ position: "absolute", left: 7, top: 5, width: 18, height: 18, borderRadius: 9, background: "#fff" }} />
            <div style={{ position: "absolute", left: 11, top: 6.5, width: 15, height: 15, borderRadius: 7.5, background: "#E30A17" }} />
            <div style={{ position: "absolute", left: 27, top: 11, width: 6, height: 6, background: "#fff", transform: "rotate(45deg)" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 24, color: "#9AA3B5", letterSpacing: 4 }}>{etiket.toLocaleUpperCase("tr-TR")}</span>
          <span style={{ fontSize: baslik.length > 28 ? 64 : 84, fontWeight: 700, lineHeight: 1.05 }}>{baslik}</span>
          {alt && <span style={{ fontSize: 30, color: "#9AA3B5", lineHeight: 1.35, maxWidth: 1000 }}>{alt}</span>}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#9AA3B5" }}>
          <span style={{ color: "#FFB224" }}>sistem:&nbsp;</span>
          <span>programatik masası · kaynaklı, sade, Türkçe</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
