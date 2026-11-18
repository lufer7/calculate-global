/**
 * Minimal robots.txt değerlendirmesi (crawl etiği, §4.2c): kendi user-agent grubumuz,
 * yoksa "*" grubu. En uzun eşleşen kural kazanır; eşitlikte Allow kazanır (RFC 9309).
 */
export function isAllowed(robotsTxt: string, userAgent: string, path: string): boolean {
  type Group = { agents: string[]; rules: { allow: boolean; path: string }[] };
  const groups: Group[] = [];
  let cur: Group | null = null;
  let lastWasAgent = false;
  for (const raw of robotsTxt.split(/\r\n|\r|\n/)) {
    const line = raw.split("#")[0]!.trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && cur) {
      lastWasAgent = false;
      if (key === "disallow" && val === "") continue; // boş disallow = her şey serbest
      cur.rules.push({ allow: key === "allow", path: val });
    } else {
      lastWasAgent = false;
    }
  }
  const ua = userAgent.toLowerCase();
  const own = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const applicable = own.length ? own : groups.filter((g) => g.agents.includes("*"));
  const rules = applicable.flatMap((g) => g.rules);
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!matches(r.path, path)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}
