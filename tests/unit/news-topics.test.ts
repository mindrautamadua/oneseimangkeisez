import { describe, expect, it } from "vitest";
import { isNewsTopic, isPriorityTopic, isRelevantExternal, topicOf } from "@/lib/news/topics";
import { pickWpImage, wpPostId } from "@/lib/news/service";
import { groupByDay, relativeTime } from "@/components/news";
import type { NewsView } from "@/lib/news/service";

describe("news topics (KINRA monitoring priorities)", () => {
  it("classifies by priority: safety, regulation, infrastructure, investment, then estate", () => {
    expect(topicOf("Siaga cuaca ekstrem, Polres Simalungun keluarkan imbauan mitigasi")).toBe("keselamatan");
    expect(topicOf("Kebakaran gudang di kawasan industri Medan")).toBe("keselamatan");
    expect(topicOf("Pemerintah terbitkan PP baru tentang fasilitas KEK")).toBe("regulasi");
    expect(topicOf("Insentif tax holiday diperpanjang untuk investor KEK")).toBe("regulasi");
    expect(topicOf("Pertamina gandeng PTPN III kembangkan PLTS 3 MW di KEK Sei Mangkei")).toBe("infrastruktur");
    expect(topicOf("PLN tambah gardu induk untuk kawasan industri")).toBe("infrastruktur");
    expect(topicOf("Danantara bidik investasi jangka panjang")).toBe("investasi");
    expect(topicOf("Kunjungan Bisnis PT KINRA ke Sime Darby")).toBe("kawasan");
    expect(topicOf("Halal bihalal keluarga besar")).toBe("umum");
  });

  it("drops irrelevant and retail-finance/sport noise from external feeds", () => {
    expect(isRelevantExternal("Investasi pabrik baru di kawasan industri")).toBe(true);
    expect(isRelevantExternal("Perluas akses investasi, Antam hadirkan ATM emas")).toBe(false);
    expect(isRelevantExternal("PSMS incar kemenangan keempat")).toBe(false);
    expect(isRelevantExternal("Antam bangun smelter baru, investasi Rp10 triliun")).toBe(true); // company name alone is not noise
    expect(isRelevantExternal("Supersonic tambah kapasitas produksi")).toBe(false);
    expect(isRelevantExternal("Perpres ojol atur potongan komisi platform 8%")).toBe(false); // regulation without economic/estate context
    expect(isRelevantExternal("Memilih laptop kini menjadi investasi jangka panjang")).toBe(false);
    expect(isRelevantExternal("Partisipasi pameran investasi")).toBe(true); // "artis" inside a word is not excluded
  });

  it("flags the four priority topics", () => {
    expect(["keselamatan", "regulasi", "infrastruktur", "investasi"].every(isPriorityTopic)).toBe(true);
    expect(isPriorityTopic("kawasan")).toBe(false);
  });

  it("validates topic keys from the URL", () => {
    expect(isNewsTopic("regulasi")).toBe(true);
    expect(isNewsTopic("agro")).toBe(false);
    expect(isNewsTopic(undefined)).toBe(false);
  });
});

describe("WordPress image helpers", () => {
  it("reads the post id from the feed guid", () => {
    expect(wpPostId("https://seimangkeisez.com/?p=60221")).toBe(60221);
    expect(wpPostId("https://seimangkeisez.com/judul/")).toBeNull();
  });

  it("prefers a card-sized rendition", () => {
    const media = {
      source_url: "https://seimangkeisez.com/full.jpg",
      media_details: { sizes: { medium_large: { source_url: "https://seimangkeisez.com/768.jpg" }, thumbnail: { source_url: "t.jpg" } } },
    };
    expect(pickWpImage(media)).toBe("https://seimangkeisez.com/768.jpg");
    expect(pickWpImage({ source_url: "https://seimangkeisez.com/full.jpg" })).toBe("https://seimangkeisez.com/full.jpg");
    expect(pickWpImage(null)).toBeNull();
  });
});

describe("reading time helpers (WIB)", () => {
  const now = new Date("2026-10-11T05:00:00Z"); // 12.00 WIB
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it("formats relative times on WIB calendar days", () => {
    expect(relativeTime(new Date(now.getTime() - 20_000), now)).toBe("baru saja");
    expect(relativeTime(ago(0.5), now)).toBe("30 menit lalu");
    expect(relativeTime(ago(3), now)).toBe("3 jam lalu");
    expect(relativeTime(ago(13), now)).toBe("kemarin"); // 23.00 WIB the previous day
    expect(relativeTime(ago(72), now)).toBe("3 hari lalu");
  });

  it("groups sorted items into buckets", () => {
    const item = (h: number) => ({ id: String(h), publishedAt: ago(h) }) as NewsView;
    const groups = groupByDay([item(1), item(2), item(20), item(60), item(24 * 10), item(24 * 60)], now);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Hari ini", 2],
      ["Kemarin", 1],
      ["Pekan ini", 1],
      ["Bulan ini", 1],
      ["Lebih lama", 1],
    ]);
  });
});
