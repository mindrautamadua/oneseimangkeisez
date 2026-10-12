/**
 * News feeds the portal reads. Fixed in code (reviewed changes only) so that no admin input
 * can make the server fetch arbitrary URLs. Every source is a public RSS feed whose
 * robots.txt does not disallow it (checked 2026-10-11). Only headline, a short excerpt and
 * the link are stored; the full article stays on the publisher's site.
 */

export type NewsKind = "official" | "industry";

export interface NewsSource {
  key: string;
  /** Name shown to readers as the publisher. */
  name: string;
  kind: NewsKind;
  feedUrl: string;
  /** Article links must stay on these hosts (or their subdomains). */
  hosts: string[];
  /**
   * "priority": keep only headlines that hit a KINRA priority topic (risk & safety, KEK
   * regulation, infrastructure & utilities, investment) or the estate itself (lib/news/topics.ts).
   * "all": keep everything (KINRA's own site).
   */
  filter: "priority" | "all";
  /**
   * Copy featured images through the WordPress REST API of this site. Only for KINRA's own
   * website: third-party media images are never stored or shown.
   */
  wpImages?: boolean;
  /**
   * Exact hostnames the publisher serves article images from. Such images are hotlinked
   * (loaded by the browser from the publisher, never copied), and these hosts are the only
   * external image origins in the CSP. Empty = generated topic covers only.
   */
  imageHosts: string[];
  /** Feed has no images: read og:image from the article page of new relevant items. */
  ogImage?: boolean;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    key: "kinra-sez",
    name: "KEK Sei Mangkei (KINRA)",
    kind: "official",
    feedUrl: "https://seimangkeisez.com/feed/",
    hosts: ["seimangkeisez.com"],
    filter: "all",
    imageHosts: [],
    wpImages: true,
  },
  {
    // kemenperin.go.id/rss was evaluated but has not been updated since Feb 2023.
    key: "sindonews-ekbis",
    name: "SINDOnews — Ekonomi & Bisnis",
    kind: "industry",
    feedUrl: "https://ekbis.sindonews.com/rss",
    hosts: ["sindonews.com"],
    filter: "priority",
    imageHosts: ["pict.sindonews.com"],
  },
  {
    key: "kontan-industri",
    name: "Kontan — Industri",
    kind: "industry",
    feedUrl: "https://industri.kontan.co.id/rss",
    hosts: ["kontan.co.id"],
    filter: "priority",
    imageHosts: ["foto.kontan.co.id"],
    ogImage: true,
  },
  {
    key: "antara-ekonomi",
    name: "ANTARA — Ekonomi & Bisnis",
    kind: "industry",
    feedUrl: "https://www.antaranews.com/rss/ekonomi-bisnis.xml",
    hosts: ["antaranews.com"],
    filter: "priority",
    imageHosts: ["cdn.antaranews.com"],
  },
  {
    // Government regulation (PP, Perpres) and national investment/infrastructure policy.
    key: "setkab",
    name: "Sekretariat Kabinet RI",
    kind: "industry",
    feedUrl: "https://setkab.go.id/feed/",
    hosts: ["setkab.go.id"],
    filter: "priority",
    imageHosts: ["setkab.go.id"],
  },
  {
    // Regional coverage around the estate (Simalungun, North Sumatra): weather, disasters, safety.
    key: "antara-sumut",
    name: "ANTARA Sumatera Utara",
    kind: "industry",
    feedUrl: "https://sumut.antaranews.com/rss/terkini.xml",
    hosts: ["sumut.antaranews.com"],
    filter: "priority",
    imageHosts: ["cdn.antaranews.com"],
  },
];

export function findSource(key: string): NewsSource | undefined {
  return NEWS_SOURCES.find((s) => s.key === key);
}

/** Publisher image URL that may be hotlinked: https, no credentials, exact image host. */
export function isSourceImageUrl(source: NewsSource, url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.protocol === "https:" && !u.username && !u.password && source.imageHosts.includes(u.hostname.toLowerCase());
}

/**
 * Some feeds point at small thumbnails. ANTARA's CDN serves renditions by path
 * (/cache/<w>x<h>/...): ask for the card-sized 800x533 instead of anything smaller.
 */
export function preferLargeImage(url: string): string {
  const m = /^(https:\/\/cdn\.antaranews\.com\/cache\/)(\d+)x(\d+)(\/.*)$/.exec(url);
  if (m && Number(m[2]) < 800) return `${m[1]}800x533${m[4]}`;
  return url;
}

/** CSP img-src origins for hotlinked news images. */
export function newsImageOrigins(): string[] {
  return [...new Set(NEWS_SOURCES.flatMap((s) => s.imageHosts.map((h) => `https://${h}`)))];
}

/** True when `url` is http(s) on one of the source's hosts or their subdomains. */
export function isSourceUrl(source: NewsSource, url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  return source.hosts.some((h) => host === h || host.endsWith(`.${h}`));
}
