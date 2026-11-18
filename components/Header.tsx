import { Logo } from "./Logo";
import { Nav } from "./Nav";
import { CpmTicker } from "./CpmTicker";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-bg">
        İçeriğe geç
      </a>
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <Nav />
      </div>
      <CpmTicker />
    </header>
  );
}
