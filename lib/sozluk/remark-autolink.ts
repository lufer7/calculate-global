import type { Link, Parent, Root, Text } from "mdast";
import { visit, SKIP } from "unist-util-visit";
import { compileMatchers, linkify, type Matcher } from "./autolink";

/** remark eklentisi: metin düğümlerindeki terim geçişlerini /sozluk/<slug> linkine çevirir. */
export function remarkAutolink(options: { matchers: Matcher[]; self: string }) {
  const compiled = compileMatchers(options.matchers);
  return (tree: Root) => {
    const used = new Set<string>();
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (["link", "linkReference", "heading", "inlineCode", "code"].includes(parent.type)) return;
      const segs = linkify(node.value, compiled, used, options.self);
      if (segs.length === 1 && segs[0]!.type === "text") return;
      const nodes = segs.map((s): Text | Link =>
        s.type === "text"
          ? { type: "text", value: s.value }
          : { type: "link", url: `/sozluk/${s.slug}`, title: s.tanim, children: [{ type: "text", value: s.value }] },
      );
      parent.children.splice(index, 1, ...nodes);
      return [SKIP, index + nodes.length];
    });
  };
}
