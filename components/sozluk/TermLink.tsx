import Link from "next/link";

/** MDX içindeki <a>: sözlük içi linklerde tanımı tooltip olarak gösterir. */
export function MdxLink({ href = "", title, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href.startsWith("/sozluk/")) {
    return (
      <Link href={href} className="term-link">
        {children}
        {title && (
          <span role="tooltip" className="term-tip">
            {title}
          </span>
        )}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a href={href} className="text-info underline underline-offset-2" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}
