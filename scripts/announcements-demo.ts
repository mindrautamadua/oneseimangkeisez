/**
 * DEMO ANNOUNCEMENTS — NON-PRODUCTION. Clearly fictional examples ("[Contoh]", is_demo = true)
 * that exercise every visibility rule: priority ordering, internal vs tenant audience,
 * tenant-specific targeting, read confirmation, scheduled, expired, withdrawn and draft.
 * Dates are relative to the seed run. IDs are fixed so re-seeding updates in place.
 */
type Org = "demo-org-kinra" | "demo-org-tenant-a" | "demo-org-tenant-b";

export interface DemoAnnouncement {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  priority: "critical" | "high" | "normal";
  status: "draft" | "published" | "withdrawn";
  audience: "internal" | "tenant" | "both";
  publisher: string;
  /** Offsets from now, in hours. */
  publishInH: number | null;
  expiresInH: number | null;
  requiresAck: boolean;
  targets: Array<{ org?: Org; role?: string }>;
}

const NOTE = "\n\nCatatan: ini adalah pengumuman contoh untuk demonstrasi OneSeiMangkeiSEZ, bukan pengumuman resmi PT KINRA.";

export const DEMO_ANNOUNCEMENTS: DemoAnnouncement[] = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    title: "[Contoh] Pemeliharaan jaringan listrik kawasan Blok B",
    summary: "Pemadaman terencana di Blok B pada Sabtu 08.00–12.00 WIB untuk pemeliharaan gardu. Mohon siapkan cadangan daya.",
    body: `Unit Operasional Kawasan akan melakukan pemeliharaan gardu distribusi Blok B.\n\nWaktu: Sabtu, 08.00–12.00 WIB\nDampak: pemadaman listrik di seluruh kavling Blok B\n\nMohon tenant dan unit terkait menyiapkan cadangan daya dan mengamankan peralatan sensitif.${NOTE}`,
    category: "estate",
    priority: "critical",
    status: "published",
    audience: "both",
    publisher: "Operasional Kawasan (Demo)",
    publishInH: -2,
    expiresInH: 24 * 7,
    requiresAck: false,
    targets: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    title: "[Contoh] Pembaruan kebijakan penggunaan perangkat TI",
    summary: "Kebijakan penggunaan perangkat TI diperbarui. Seluruh karyawan wajib membaca dan mengonfirmasi.",
    body: `Kebijakan penggunaan perangkat TI telah diperbarui, antara lain:\n\n1. Perangkat kerja wajib memakai kunci layar otomatis.\n2. Instalasi perangkat lunak di luar daftar yang disetujui harus melalui IT Service Desk.\n3. Data perusahaan tidak boleh disimpan di layanan penyimpanan pribadi.${NOTE}`,
    category: "policy",
    priority: "high",
    status: "published",
    audience: "internal",
    publisher: "Divisi TI (Demo)",
    publishInH: -24,
    expiresInH: null,
    requiresAck: true,
    targets: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    title: "[Contoh] Jadwal pengangkutan limbah untuk Tenant A",
    summary: "Pengangkutan limbah non-B3 untuk Tenant A dipindahkan ke hari Kamis mulai pekan depan.",
    body: `Mulai pekan depan, pengangkutan limbah non-B3 untuk kavling Tenant A dilakukan setiap Kamis pukul 07.00 WIB.${NOTE}`,
    category: "estate",
    priority: "normal",
    status: "published",
    audience: "tenant",
    publisher: "Tenant Service Center (Demo)",
    publishInH: -6,
    expiresInH: null,
    requiresAck: false,
    targets: [{ org: "demo-org-tenant-a" }],
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    title: "[Contoh] Rapat koordinasi keuangan triwulan",
    summary: "Undangan rapat koordinasi keuangan triwulan untuk Divisi Keuangan.",
    body: `Rapat koordinasi keuangan triwulan diadakan Senin pukul 09.00 WIB di ruang rapat utama.${NOTE}`,
    category: "management",
    priority: "normal",
    status: "published",
    audience: "internal",
    publisher: "Divisi Keuangan (Demo)",
    publishInH: -3,
    expiresInH: null,
    requiresAck: false,
    targets: [{ role: "finance" }],
  },
  {
    id: "00000000-0000-4000-a000-000000000005",
    title: "[Contoh] Pengumuman terjadwal (belum tayang)",
    summary: "Pengumuman ini dijadwalkan tayang di masa depan dan belum boleh terlihat.",
    body: `Contoh pengumuman terjadwal.${NOTE}`,
    category: "general",
    priority: "high",
    status: "published",
    audience: "both",
    publisher: "Sekretariat Perusahaan (Demo)",
    publishInH: 24 * 365,
    expiresInH: null,
    requiresAck: false,
    targets: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000006",
    title: "[Contoh] Gangguan email yang sudah selesai",
    summary: "Pengumuman kedaluwarsa: tidak boleh tampil sebagai pengumuman aktif.",
    body: `Contoh pengumuman kedaluwarsa.${NOTE}`,
    category: "outage",
    priority: "critical",
    status: "published",
    audience: "both",
    publisher: "Divisi TI (Demo)",
    publishInH: -24 * 10,
    expiresInH: -24,
    requiresAck: false,
    targets: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000007",
    title: "[Contoh] Draf pengumuman Direksi",
    summary: "Draf: tidak boleh tampil sebelum diterbitkan.",
    body: `Contoh draf.${NOTE}`,
    category: "management",
    priority: "high",
    status: "draft",
    audience: "internal",
    publisher: "Sekretariat Perusahaan (Demo)",
    publishInH: null,
    expiresInH: null,
    requiresAck: false,
    targets: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000008",
    title: "[Contoh] Pengumuman yang ditarik",
    summary: "Ditarik: tidak boleh tampil.",
    body: `Contoh pengumuman yang ditarik.${NOTE}`,
    category: "general",
    priority: "normal",
    status: "withdrawn",
    audience: "both",
    publisher: "Sekretariat Perusahaan (Demo)",
    publishInH: -48,
    expiresInH: null,
    requiresAck: false,
    targets: [],
  },
];
