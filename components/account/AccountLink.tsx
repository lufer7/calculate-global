"use client";

import Link from "next/link";
import { IconUser } from "@/components/icons";
import { useMe } from "./useMe";

/** Hesaplar açıksa (Supabase yapılandırıldıysa) giriş / hesabım bağlantısı. */
export function AccountLink() {
  const me = useMe();
  if (!me?.hesapAcik) return null;
  return (
    <Link
      href={me.girisli ? "/hesabim" : "/giris?next=/hesabim"}
      className="btn w-11 px-0"
      aria-label={me.girisli ? "Hesabım" : "Giriş yap"}
      title={me.girisli ? "Hesabım" : "Giriş yap"}
    >
      <IconUser className={`h-5 w-5 ${me.girisli ? "text-accent" : ""}`} />
    </Link>
  );
}
