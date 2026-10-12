/**
 * Minimal RSS 2.0 / Atom reader. Pure and unit-tested; no dependency needed for the small,
 * fixed set of feeds the portal reads. Output is plain text only: all markup is stripped
 * and entities decoded, and React escapes it again when rendering.
 */

export interface FeedEntry {
  guid: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date | null;
  /** Publisher image URL as found in the feed (unvalidated). */
  imageUrl: string | null;
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

function unwrapCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/** WordPress appends "The post X appeared first on Y." to feed excerpts. */
function cleanSummary(s: string): string {
  return s.replace(/\s*The post .+ appeared first on .+$/i, "").trim();
}

/** Raw text content of the first matching child element (namespaced names allowed). */
function child(block: string, name: string): string | null {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = re.exec(block);
  return m ? unwrapCdata(m[1]!) : null;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? (m[2] ?? m[3] ?? null) : null;
}

/**
 * Markup to plain text. Removes scripts/styles, HTML tags and WordPress page-builder
 * shortcodes such as [vc_row], decodes entities twice (feeds often double-encode),
 * and collapses whitespace.
 */
export function toPlainText(s: string): string {
  let t = unwrapCdata(s);
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  t = decodeEntities(t);
  t = t.replace(/<[^>]*>/g, " ");
  t = t.replace(/\[\/?[a-z][a-z0-9_-]*(?:\s[^\]]*)?\]/gi, " ");
  t = decodeEntities(t);
  t = t.replace(/<[^>]*>/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:–-]+$/, "")}…`;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(toPlainText(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Image of a feed item: media:content / media:thumbnail / image enclosure, else the first <img>
 * inside the description or content. Returned raw (entity-decoded); callers validate the host.
 */
export function feedImage(block: string): string | null {
  const tags = block.match(/<(media:content|media:thumbnail|enclosure)\b[^>]*>/gi) ?? [];
  for (const t of tags) {
    const url = attr(t, "url");
    if (!url) continue;
    const type = attr(t, "type") ?? "";
    const medium = attr(t, "medium") ?? "";
    const isImage = /^image\//i.test(type) || medium === "image" || /^media:thumbnail/i.test(t.slice(1)) || /\.(jpe?g|png|webp)(\?|$)/i.test(url);
    if (isImage) return decodeEntities(url).trim();
  }
  for (const name of ["description", "content:encoded"]) {
    const html = decodeEntities(child(block, name) ?? "");
    const img = /<img\b[^>]*>/i.exec(html)?.[0];
    const src = img ? attr(img, "src") : null;
    if (src) return src.trim();
  }
  return null;
}

/** og:image / twitter:image of an article page (attribute order independent). */
export function ogImageFrom(html: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
    if (key === "og:image" || key === "og:image:url" || key === "twitter:image") {
      const c = attr(tag, "content");
      if (c) return decodeEntities(c).trim();
    }
  }
  return null;
}

export function parseFeed(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi);
  if (items) {
    for (const it of items) {
      const link = toPlainText(child(it, "link") ?? "");
      const guid = toPlainText(child(it, "guid") ?? "") || link;
      out.push({
        guid,
        title: toPlainText(child(it, "title") ?? ""),
        summary: cleanSummary(toPlainText(child(it, "description") ?? child(it, "content:encoded") ?? "")),
        url: link,
        publishedAt: parseDate(child(it, "pubDate") ?? child(it, "dc:date")),
        imageUrl: feedImage(it),
      });
    }
    return out;
  }
  const entries = xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) ?? [];
  for (const en of entries) {
    const links = en.match(/<link\b[^>]*>/gi) ?? [];
    const alt = links.find((l) => (attr(l, "rel") ?? "alternate") === "alternate") ?? links[0] ?? "";
    const url = decodeEntities(attr(alt, "href") ?? "").trim();
    out.push({
      guid: toPlainText(child(en, "id") ?? "") || url,
      title: toPlainText(child(en, "title") ?? ""),
      summary: toPlainText(child(en, "summary") ?? child(en, "content") ?? ""),
      url,
      publishedAt: parseDate(child(en, "published") ?? child(en, "updated")),
      imageUrl: feedImage(en),
    });
  }
  return out;
}

/** Character set: XML declaration first, then the HTTP header, then UTF-8. */
export function detectCharset(bytes: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const decl = /<\?xml[^>]*encoding=["']([A-Za-z0-9_-]+)["']/i.exec(head)?.[1];
  const header = /charset=([A-Za-z0-9_-]+)/i.exec(contentType ?? "")?.[1];
  for (const c of [decl, header]) {
    if (!c) continue;
    try {
      new TextDecoder(c);
      return c;
    } catch {
      /* unsupported label: try next */
    }
  }
  return "utf-8";
}
