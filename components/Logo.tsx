import Link from "next/link";
import { TurkishFlag } from "./icons";
import { SITE_NAME } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2.5" aria-label={`${SITE_NAME} ana sayfa`}>
      <span className="font-mono text-[15px] font-bold tracking-[0.08em] text-text">
        <span className="text-accent">&gt;</span>
        {SITE_NAME}
      </span>
      <TurkishFlag className="h-3.5 w-auto rounded-[2px]" />
    </Link>
  );
}
