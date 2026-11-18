export function PageHeader({
  etiket,
  baslik,
  children,
  sistem,
}: {
  etiket: string;
  baslik: string;
  children?: React.ReactNode;
  sistem?: string | null;
}) {
  return (
    <div className="border-b border-border-dim bg-bg-alt">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <p className="label">{etiket}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl">{baslik}</h1>
        {children && <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>}
        {sistem && <p className="syslog mt-4">{sistem}</p>}
      </div>
    </div>
  );
}
