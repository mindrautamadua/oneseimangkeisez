import { describe, expect, it } from "vitest";
import { decodeEntities, detectCharset, feedImage, ogImageFrom, parseFeed, toPlainText, truncate } from "@/lib/news/feed";
import { NEWS_SOURCES, isSourceImageUrl, isSourceUrl, newsImageOrigins, preferLargeImage, type NewsSource } from "@/lib/news/sources";
import { entriesToRows } from "@/lib/news/service";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Feed</title>
<item>
  <title><![CDATA[Ini Daya Tarik KEK Sei Mangkei &#8211; Investor]]></title>
  <link>https://seimangkeisez.com/ini-daya-tarik/</link>
  <guid isPermaLink="false">https://seimangkeisez.com/?p=59988</guid>
  <pubDate>Tue, 12 Nov 2024 02:39:22 +0000</pubDate>
  <description><![CDATA[<p>[vc_row][vc_column][vc_column_text css=&#8221;&#8221;]Jakarta &#8211; Direktur <b>KINRA</b> menerangkan&hellip;</p><script>alert(1)</script>]]></description>
</item>
<item>
  <title>Tanpa tanggal</title>
  <link>https://seimangkeisez.com/tanpa-tanggal/</link>
</item>
<item>
  <title>Tautan berbahaya</title>
  <link>javascript:alert(1)</link>
  <pubDate>Tue, 12 Nov 2024 02:39:22 +0000</pubDate>
</item>
<item>
  <title>Host lain</title>
  <link>https://evil.example/seimangkeisez.com</link>
  <pubDate>Tue, 12 Nov 2024 02:39:22 +0000</pubDate>
</item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
  <id>tag:x,2026:1</id><title type="html">Pabrik &amp;amp; ekspor</title>
  <link rel="alternate" href="https://www.antaranews.com/berita/1"/>
  <published>2026-10-10T01:00:00Z</published><summary>Ringkas</summary>
</entry></feed>`;

describe("feed parsing", () => {
  it("parses RSS items to plain text", () => {
    const [first] = parseFeed(RSS);
    expect(first).toMatchObject({
      guid: "https://seimangkeisez.com/?p=59988",
      title: "Ini Daya Tarik KEK Sei Mangkei – Investor",
      url: "https://seimangkeisez.com/ini-daya-tarik/",
    });
    expect(first!.summary).toBe("Jakarta – Direktur KINRA menerangkan…");
    expect(first!.publishedAt?.toISOString()).toBe("2024-11-12T02:39:22.000Z");
  });

  it("parses Atom entries", () => {
    const [e] = parseFeed(ATOM);
    expect(e).toMatchObject({ guid: "tag:x,2026:1", title: "Pabrik & ekspor", url: "https://www.antaranews.com/berita/1", summary: "Ringkas" });
  });

  it("removes the WordPress 'appeared first on' footer", () => {
    const xml = `<rss><channel><item><title>T</title><link>https://seimangkeisez.com/t</link><description>The post Judul appeared first on Sei Mangkei SEZ.</description></item></channel></rss>`;
    expect(parseFeed(xml)[0]!.summary).toBe("");
  });

  it("strips markup that only appears after entity decoding", () => {
    expect(toPlainText("&lt;img src=x onerror=alert(1)&gt;Halo")).toBe("Halo");
    expect(decodeEntities("&#x1F600;&amp;&unknown;")).toBe("😀&&unknown;");
  });

  it("truncates on a word boundary", () => {
    expect(truncate("satu dua tiga empat", 12)).toBe("satu dua…");
    expect(truncate("pendek", 12)).toBe("pendek");
  });

  it("detects charset from the XML declaration before the header", () => {
    const bytes = new TextEncoder().encode('<?xml version="1.0" encoding="utf-8"?><rss/>');
    expect(detectCharset(bytes, "application/rss+xml; charset=ISO-8859-1")).toBe("utf-8");
    expect(detectCharset(new TextEncoder().encode("<rss/>"), "text/xml; charset=ISO-8859-1")).toBe("ISO-8859-1");
    expect(detectCharset(new TextEncoder().encode("<rss/>"), null)).toBe("utf-8");
  });
});

describe("news sources", () => {
  const kinra = NEWS_SOURCES.find((s) => s.key === "kinra-sez")!;

  it("keeps links on the source host only", () => {
    expect(isSourceUrl(kinra, "https://seimangkeisez.com/a")).toBe(true);
    expect(isSourceUrl(kinra, "https://www.seimangkeisez.com/a")).toBe(true);
    expect(isSourceUrl(kinra, "https://seimangkeisez.com.evil.example/a")).toBe(false);
    expect(isSourceUrl(kinra, "https://user:pw@seimangkeisez.com/a")).toBe(false);
    expect(isSourceUrl(kinra, "javascript:alert(1)")).toBe(false);
    expect(isSourceUrl(kinra, "ftp://seimangkeisez.com/a")).toBe(false);
  });

  it("all configured feeds are https", () => {
    for (const s of NEWS_SOURCES) expect(s.feedUrl.startsWith("https://")).toBe(true);
  });

  it("drops undated, off-host and unsafe entries", () => {
    const { fetched, rows } = entriesToRows(kinra, RSS, new Date("2026-10-11T00:00:00Z"));
    expect(fetched).toBe(4);
    expect(rows.map((r) => r.title)).toEqual(["Ini Daya Tarik KEK Sei Mangkei – Investor"]);
  });

  it("keeps only priority-topic headlines from external feeds, within retention", () => {
    const industry: NewsSource = { key: "t", name: "T", kind: "industry", feedUrl: "https://x.example/rss", hosts: ["x.example"], filter: "priority", imageHosts: [] };
    const xml = `<rss><channel>
      <item><title>Hilirisasi sawit di kawasan industri</title><link>https://x.example/1</link><pubDate>Sat, 10 Oct 2026 01:00:00 +0000</pubDate></item>
      <item><title>Hasil pertandingan sepak bola</title><link>https://x.example/2</link><pubDate>Sat, 10 Oct 2026 01:00:00 +0000</pubDate></item>
      <item><title>Investasi pabrik lama</title><link>https://x.example/3</link><pubDate>Mon, 01 Jan 2024 01:00:00 +0000</pubDate></item>
      <item><title>Investasi pabrik baru</title><link>https://x.example/4</link><pubDate>Sat, 10 Oct 2099 01:00:00 +0000</pubDate></item>
    </channel></rss>`;
    const now = new Date("2026-10-11T00:00:00Z");
    const { rows } = entriesToRows(industry, xml, now);
    expect(rows.map((r) => r.title)).toEqual(["Hilirisasi sawit di kawasan industri", "Investasi pabrik baru"]);
    expect(rows[1]!.publishedAt).toEqual(now); // future dates clamped
  });
});

describe("publisher images (hotlinked)", () => {
  it("finds the image of a feed item", () => {
    expect(feedImage(`<item><media:content url="https://pict.sindonews.com/a.jpeg" type="image/jpeg"/></item>`)).toBe("https://pict.sindonews.com/a.jpeg");
    expect(feedImage(`<item><media:content url="https://cdn.antaranews.com/b.jpeg" medium="image"></media:content></item>`)).toBe("https://cdn.antaranews.com/b.jpeg");
    expect(feedImage(`<item><enclosure url="https://x.example/c.png?w=1&amp;q=9" type="image/png"/></item>`)).toBe("https://x.example/c.png?w=1&q=9");
    expect(feedImage(`<item><enclosure url="https://x.example/a.mp3" type="audio/mpeg"/></item>`)).toBeNull();
    expect(feedImage(`<item><description><![CDATA[<p><img class="x" src="https://setkab.go.id/d.jpeg" /></p>]]></description></item>`)).toBe("https://setkab.go.id/d.jpeg");
    expect(feedImage(`<item><description>&lt;img src="https://cdn.antaranews.com/e.jpeg"&gt;Teks</description></item>`)).toBe("https://cdn.antaranews.com/e.jpeg");
    expect(feedImage(`<item><title>T</title></item>`)).toBeNull();
  });

  it("reads og:image regardless of attribute order", () => {
    expect(ogImageFrom(`<meta property="og:image" content="https://foto.kontan.co.id/a.jpg" />`)).toBe("https://foto.kontan.co.id/a.jpg");
    expect(ogImageFrom(`<meta content="https://foto.kontan.co.id/b.jpg" property="og:image">`)).toBe("https://foto.kontan.co.id/b.jpg");
    expect(ogImageFrom(`<meta name="description" content="x">`)).toBeNull();
  });

  it("only allows https images on the source's exact image hosts", () => {
    const kontan = NEWS_SOURCES.find((s) => s.key === "kontan-industri")!;
    expect(isSourceImageUrl(kontan, "https://foto.kontan.co.id/a.jpg")).toBe(true);
    expect(isSourceImageUrl(kontan, "http://foto.kontan.co.id/a.jpg")).toBe(false);
    expect(isSourceImageUrl(kontan, "https://evil.example/foto.kontan.co.id.jpg")).toBe(false);
    expect(isSourceImageUrl(kontan, "https://x.foto.kontan.co.id/a.jpg")).toBe(false);
    expect(isSourceImageUrl(kontan, "javascript:alert(1)")).toBe(false);
  });

  it("upgrades small ANTARA renditions only", () => {
    expect(preferLargeImage("https://cdn.antaranews.com/cache/255x170/2026/10/10/a.jpg")).toBe("https://cdn.antaranews.com/cache/800x533/2026/10/10/a.jpg");
    expect(preferLargeImage("https://cdn.antaranews.com/cache/1200x800/2026/a.jpg")).toBe("https://cdn.antaranews.com/cache/1200x800/2026/a.jpg");
    expect(preferLargeImage("https://pict.sindonews.com/dyn/850/a.jpeg")).toBe("https://pict.sindonews.com/dyn/850/a.jpeg");
  });

  it("CSP image origins are exactly the configured hosts", () => {
    expect(newsImageOrigins().sort()).toEqual(
      ["https://cdn.antaranews.com", "https://foto.kontan.co.id", "https://pict.sindonews.com", "https://setkab.go.id"].sort(),
    );
  });
});
