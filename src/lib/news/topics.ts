/**
 * News topics, ordered by KINRA's monitoring priorities (2026-10-11):
 * risk & safety, KEK regulation, infrastructure & utilities, investment. "kawasan" catches
 * other estate/SEZ news; "umum" is the fallback and only occurs for KINRA's own articles,
 * because external items must match a priority topic or "kawasan" to be collected at all.
 * First match wins. Pure and unit-tested.
 */
export const NEWS_TOPICS = [
  {
    key: "keselamatan",
    label: "Risiko & Keselamatan",
    priority: true,
    patterns: [
      /kebakaran|terbakar|ledakan|meledak|banjir|longsor|gempa|tsunami|cuaca ekstrem|bencana|mitigasi|evakuasi|tanggap darurat/i,
      /kecelakaan kerja|\bK3\b|keselamatan|keamanan kawasan|pengamanan objek vital|objek vital/i,
      /pencemaran|limbah B3|tumpahan|kebocoran gas|unjuk rasa|mogok kerja|sabotase|pencurian kabel/i,
    ],
  },
  {
    key: "regulasi",
    label: "Regulasi KEK",
    priority: true,
    // A regulatory term alone is not enough (e.g. ride-hailing rules); it must concern the economy or the estate.
    requires: /KEK|kawasan|investasi|investor|industri|perizinan berusaha|penanaman modal|pajak|fiskal|kepabeanan|bea cukai|ekspor|impor|energi|listrik|hilirisasi|ketenagakerjaan|lingkungan hidup|AMDAL|tata ruang|lahan|pertanahan|\bHGB\b|\bHGU\b/i,
    patterns: [
      /regulasi|deregulasi|peraturan|\bPP\b|perpres|peraturan presiden|permen|\bUU\b|undang-undang|omnibus/i,
      /insentif|fasilitas fiskal|tax holiday|tax allowance|kepabeanan|bea cukai|perizinan|\bOSS\b/i,
      /dewan nasional KEK|proyek strategis nasional|\bPSN\b|kebijakan (investasi|industri|hilirisasi|KEK|kawasan|fiskal|energi|perizinan)/i,
    ],
  },
  {
    key: "infrastruktur",
    label: "Infrastruktur & Utilitas",
    priority: true,
    patterns: [
      /infrastruktur|utilitas|listrik|\bPLN\b|gardu|pembangkit|\bPLT[SUGAM]\b|energi baru|energi terbarukan|\bEBT\b/i,
      /\bgas bumi\b|\bLNG\b|pipa gas|air bersih|air baku|\bPDAM\b|\bSPAM\b|\bIPAL\b|pengolahan limbah|bendungan/i,
      /jalan tol|\btol\b|jalan akses|jalur kereta|\bkereta\b|pelabuhan|bandara|logistik|telekomunikasi|serat optik|\bBTS\b/i,
    ],
  },
  {
    key: "investasi",
    label: "Investasi",
    priority: true,
    patterns: [
      /investasi|investor|penanaman modal|\bPMA\b|\bPMDN\b|hilirisasi|groundbreaking|peletakan batu pertama/i,
      /ekspansi pabrik|pabrik baru|bangun pabrik|smelter|Danantara|nilai proyek|realisasi investasi/i,
    ],
  },
  {
    key: "kawasan",
    label: "Kawasan & KEK",
    priority: false,
    patterns: [/kawasan (industri|ekonomi khusus)|\bKEK\b|sei ?mangkei|\bKINRA\b|\btenant\b|simalungun/i],
  },
  { key: "umum", label: "Umum", priority: false, patterns: [] },
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number]["key"];

/** Retail-finance, sport and lifestyle noise that often mentions "investasi" or "energi". */
const EXCLUDE = [
  /harga emas|ATM emas|emas (antam|galeri24|UBS)|logam mulia|pegadaian|\bIHSG\b|\bsaham\b|kripto|reksa dana|obligasi ritel|tabungan/i,
  /laptop|ponsel|smartphone|gawai|sepak ?bola|\bliga\b|\bPSMS\b|\bpiala\b|selebriti|\bartis\b|kuliner|\bresep\b/i,
];

export function isNewsTopic(v: unknown): v is NewsTopic {
  return NEWS_TOPICS.some((t) => t.key === v);
}

export function topicOf(text: string): NewsTopic {
  for (const t of NEWS_TOPICS) {
    if ("requires" in t && !t.requires.test(text)) continue;
    if (t.patterns.some((p) => p.test(text))) return t.key;
  }
  return "umum";
}

/** External headlines are kept only when they hit a priority topic or the estate itself. */
export function isRelevantExternal(text: string): boolean {
  if (EXCLUDE.some((p) => p.test(text))) return false;
  return topicOf(text) !== "umum";
}

export function topicLabel(key: string): string {
  return NEWS_TOPICS.find((t) => t.key === key)?.label ?? "Umum";
}

export function isPriorityTopic(key: string): boolean {
  return NEWS_TOPICS.some((t) => t.key === key && t.priority);
}
