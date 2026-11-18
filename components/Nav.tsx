"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/site";
import { IconClose, IconMenu } from "./icons";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Masaüstü: tek satır. xl altında "Mecra & Spec Bul" → "Spec Bul" (§1b) */}
      <nav aria-label="Ana menü" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded px-2.5 font-mono text-[12.5px] tracking-wide transition-colors ${
                    active ? "bg-panel text-accent" : "text-muted hover:text-text"
                  }`}
                >
                  {item.kisa ? (
                    <>
                      <span className="xl:hidden">{item.kisa}</span>
                      <span className="hidden xl:inline">{item.ad}</span>
                    </>
                  ) : (
                    item.ad
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobil: hamburger */}
      <button
        type="button"
        className="btn w-11 px-0 lg:hidden"
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={open}
        aria-controls="mobil-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
      </button>
      {open && (
        <nav id="mobil-menu" aria-label="Ana menü" className="absolute inset-x-0 top-full z-40 border-b border-border bg-bg lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV.map((item, i) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-border-dim last:border-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 font-mono text-sm ${active ? "text-accent" : "text-text"}`}
                  >
                    <span className="text-muted">{String(i + 1).padStart(2, "0")}</span>
                    {item.ad}
                    {!item.hazir && <span className="ml-auto text-[11px] uppercase tracking-widest text-muted">yakında</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
