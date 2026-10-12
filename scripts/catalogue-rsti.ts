/**
 * DEMO catalogue derived from "Rencana Strategis TI (RSTI) PT KINRA 2026–2030 (Draft)".
 *
 * It simulates the END STATE 2030 application landscape (Bab 8.4 arsitektur aplikasi,
 * Bab 9.1 portofolio aplikasi, Bab 13.1 katalog layanan, Bab 14 inisiatif IT-01..IT-23).
 * Most of these applications DO NOT EXIST YET. Statuses describe the 2030 target, not today.
 * URLs are fictional (*.kinra.example). Every entry is flagged is_demo = true.
 */

export type Audience = "internal" | "tenant" | "both";
export type Mode = "oidc_sso" | "saml_sso" | "authenticated_link" | "external_link";
export type Status = "available" | "pilot" | "planned" | "maintenance" | "retired";

export const ORGS = [
  { externalOrgId: "demo-org-kinra", displayName: "PT Kawasan Industri Nusantara (Demo)", orgType: "kinra" as const },
  { externalOrgId: "demo-org-tenant-a", displayName: "PT Contoh Tenant A (Demo)", orgType: "tenant" as const },
  { externalOrgId: "demo-org-tenant-b", displayName: "PT Contoh Tenant B (Demo)", orgType: "tenant" as const },
];

/** Internal categories follow the five RSTI application blocks; tenant ones follow the tenant digital catalogue. */
export const CATEGORIES: Array<{ slug: string; name: string; description: string; audienceScope: Audience }> = [
  { slug: "engagement", name: "Engagement Investor & Tenant", description: "Blok 1 RSTI: Dashboard KEK, CRM, kanal tenant.", audienceScope: "internal" },
  { slug: "operasi-kawasan", name: "Operasi Kawasan & Utilitas", description: "Blok 2 RSTI: GIS, meter-to-cash, EAM, IoT, IEOC.", audienceScope: "internal" },
  { slug: "enterprise-core", name: "Enterprise Core", description: "Blok 3 RSTI: SAP FI/HC, Odoo operasional.", audienceScope: "internal" },
  { slug: "dokumen-kolaborasi", name: "Dokumen & Kolaborasi", description: "DMS, workflow, e-sign, email & kolaborasi.", audienceScope: "internal" },
  { slug: "insight", name: "Insight: Data, BI & AI", description: "Blok 4 RSTI: data platform, BI, AI.", audienceScope: "internal" },
  { slug: "layanan-ti", name: "Layanan TI & Keamanan", description: "Blok 5 RSTI: IAM, ITSM, integrasi, keamanan.", audienceScope: "internal" },
  { slug: "layanan-tenant", name: "Layanan Tenant", description: "Portal tenant: permintaan, keluhan, status layanan.", audienceScope: "tenant" },
  { slug: "tagihan-utilitas", name: "Tagihan & Utilitas", description: "Tagihan, e-payment, pemakaian utilitas.", audienceScope: "tenant" },
  { slug: "perizinan-ehs", name: "Perizinan, Dokumen & EHS", description: "Perizinan KEK, kontrak, izin kerja, EHS.", audienceScope: "tenant" },
  { slug: "layanan-digital", name: "Konektivitas & Fasilitas", description: "Konektivitas, reservasi fasilitas, layanan baru.", audienceScope: "tenant" },
  { slug: "akun", name: "Akun & Akses", description: "Identitas tunggal, MFA, profil akses.", audienceScope: "both" },
];

const K = "demo-org-kinra";
const A = "demo-org-tenant-a";
const B = "demo-org-tenant-b";
type Grant = [string, string];
const kinra = (...roles: string[]): Grant[] => roles.map((r) => [K, r]);
const tenants = (role = "tenant_user", orgs = [A, B]): Grant[] => orgs.map((o) => [o, role]);

export interface AppSeed {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  category: string;
  audience: Audience;
  integrationMode: Mode;
  status: Status;
  initiativeRef: string;
  targetPeriod: string;
  businessOwner: string;
  featured?: boolean;
  /** Overrides the default fictional https://<slug>.kinra.example/ target. */
  targetUrl?: string;
  grants: Grant[];
}

const IT = "Divisi TI";

export const APPS: AppSeed[] = [
  // --- Blok 1: Engagement -----------------------------------------------------------
  { slug: "dashboard-kek", name: "Dashboard KEK & Investor Pipeline", description: "Ringkasan pipeline investor dan kendala perizinan KEK untuk manajemen. Sementara, sampai CRM aktif.", iconKey: "chart-line", category: "engagement", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-07", targetPeriod: "2026–27", businessOwner: "Pemasaran & Penjualan", featured: true, grants: kinra("marketing", "executive") },
  { slug: "crm-tenant", name: "CRM & Tenant Engagement", description: "Sistem kerja tim marketing: prospek, penawaran, survei, dan penanganan case tenant (back-office Tenant Portal).", iconKey: "handshake", category: "engagement", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-10", targetPeriod: "2027–29", businessOwner: "Pemasaran & Penjualan", grants: kinra("marketing", "executive") },
  { slug: "onboarding-tenant", name: "Onboarding Tenant", description: "Workflow lintas divisi dari penandatanganan kontrak hingga tenant siap beroperasi.", iconKey: "building-2", category: "engagement", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-08 · IT-12", targetPeriod: "2027–28", businessOwner: "Pemasaran & Penjualan", grants: kinra("marketing", "finance", "estate_ops") },

  // --- Blok 2: Estate & Utility Operations ---------------------------------------------
  { slug: "gis-aset", name: "Estate GIS & Asset Registry", description: "Peta tunggal kavling, status lahan, jaringan utilitas, dan aset kawasan.", iconKey: "map", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-15", targetPeriod: "2027–28", businessOwner: "Pengembangan Kawasan", grants: kinra("marketing", "estate_ops", "executive") },
  { slug: "meter-to-cash", name: "Utility Meter-to-Cash", description: "Pembacaan meter, validasi & rating, penagihan utilitas, dan rekonsiliasi otomatis.", iconKey: "receipt", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-09", targetPeriod: "2027–28", businessOwner: "Keuangan / Produksi Kawasan", grants: kinra("finance", "estate_ops") },
  { slug: "eam-maintenance", name: "Enterprise Asset Management & Maintenance", description: "Work order, preventive maintenance, dan aset tetap operasional (modul Odoo).", iconKey: "wrench", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-11", targetPeriod: "2028–29", businessOwner: "Produksi Kawasan / ME&F", grants: kinra("estate_ops") },
  { slug: "smart-utility-iot", name: "Smart Utility IoT Monitoring", description: "Data AMR/IoT dan SCADA utilitas terintegrasi melalui zona DMZ OT.", iconKey: "radio-tower", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-16", targetPeriod: "2028–30", businessOwner: "Produksi Kawasan / ME&F", grants: kinra("estate_ops") },
  { slug: "ieoc", name: "Integrated Estate Operations Center (IEOC)", description: "Korelasi insiden, situational awareness, dan koordinasi operasi kawasan.", iconKey: "monitor-dot", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-17", targetPeriod: "2029–30", businessOwner: "SEVP Operation", featured: true, grants: kinra("estate_ops", "executive") },
  { slug: "field-service", name: "Mobile Field Service", description: "Inspeksi, maintenance, dan patroli keamanan untuk petugas lapangan.", iconKey: "clipboard-check", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-20", targetPeriod: "2029", businessOwner: "ME&F / Pengamanan", grants: kinra("estate_ops") },
  { slug: "smart-security", name: "Smart Security Kawasan", description: "Akses gerbang terintegrasi dan patroli digital keamanan kawasan.", iconKey: "shield-check", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "planned", initiativeRef: "Could Do", targetPeriod: "2029–30", businessOwner: "Pengamanan", grants: kinra("estate_ops") },
  { slug: "mrv-energi-emisi", name: "Energy, Emission & Carbon MRV", description: "Measurement, reporting & verification energi, emisi, dan karbon kawasan.", iconKey: "leaf", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-18", targetPeriod: "2029–30", businessOwner: "Pengembangan", grants: kinra("estate_ops", "executive") },
  { slug: "video-analytics", name: "Video Analytics & Drone", description: "Pilot analitik video dan survei drone untuk pengamanan kawasan.", iconKey: "cctv", category: "operasi-kawasan", audience: "internal", integrationMode: "authenticated_link", status: "pilot", initiativeRef: "IT-22", targetPeriod: "2030", businessOwner: "Pengamanan", grants: kinra("estate_ops") },
  { slug: "digital-twin", name: "Digital Twin Kawasan", description: "Simulasi skenario perencanaan kapasitas. Masih tahap studi kelayakan.", iconKey: "layers", category: "operasi-kawasan", audience: "internal", integrationMode: "oidc_sso", status: "planned", initiativeRef: "IT-23", targetPeriod: "2030", businessOwner: "SEVP Operation", grants: kinra("executive", "estate_ops") },
  { slug: "billing-utilitas-legacy", name: "Billing Utilitas Lokal (Legacy)", description: "Aplikasi lokal lama yang digantikan Meter-to-Cash.", iconKey: "boxes", category: "operasi-kawasan", audience: "internal", integrationMode: "authenticated_link", status: "retired", initiativeRef: "IT-09", targetPeriod: "2027–28", businessOwner: "Keuangan", grants: kinra("finance") },

  // --- Blok 3: Enterprise Core ---------------------------------------------------------
  { slug: "sap-fi", name: "SAP FI — Keuangan", description: "System of record akuntansi, piutang, dan buku besar.", iconKey: "landmark", category: "enterprise-core", audience: "internal", integrationMode: "saml_sso", status: "available", initiativeRef: "IT-11", targetPeriod: "Eksisting", businessOwner: "Keuangan", grants: kinra("finance") },
  { slug: "sap-hc", name: "SAP HC — Payroll", description: "System of record penggajian.", iconKey: "wallet", category: "enterprise-core", audience: "internal", integrationMode: "saml_sso", status: "available", initiativeRef: "IT-11", targetPeriod: "Eksisting", businessOwner: "SDM", grants: kinra("hr") },
  { slug: "odoo-pengadaan", name: "Odoo Pengadaan (Procure-to-Pay)", description: "Permintaan pembelian, pengadaan, dan penerimaan barang, terintegrasi ke SAP FI.", iconKey: "shopping-cart", category: "enterprise-core", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-11", targetPeriod: "2028–29", businessOwner: "Keuangan / Pengadaan", grants: kinra("employee") },
  { slug: "odoo-kontrak-billing", name: "Odoo Kontrak & Billing Tenant", description: "Kontrak sewa dan tagihan berulang tenant (contract-to-bill).", iconKey: "file-text", category: "enterprise-core", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-11", targetPeriod: "2028–29", businessOwner: "Keuangan / Pemasaran", grants: kinra("finance", "marketing") },
  { slug: "odoo-talent", name: "Odoo Rekrutmen & Talent Pool", description: "Rekrutmen dan talent pool karyawan.", iconKey: "user-check", category: "enterprise-core", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-11", targetPeriod: "2028–29", businessOwner: "SDM", grants: kinra("hr") },

  // --- Dokumen & Kolaborasi --------------------------------------------------------------
  { slug: "dms-workflow", name: "DMS, Workflow & e-Sign", description: "Persuratan, persetujuan, arsip, dan tanda tangan elektronik tersertifikasi.", iconKey: "file-signature", category: "dokumen-kolaborasi", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-12", targetPeriod: "2027–28", businessOwner: "Sekretariat Perusahaan", featured: true, grants: kinra("employee") },
  { slug: "email-kolaborasi", name: "Email & Kolaborasi", description: "Email, kalender, dan kolaborasi dokumen yang distandarkan dan diamankan.", iconKey: "mail", category: "dokumen-kolaborasi", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "Keep", targetPeriod: "2027", businessOwner: IT, featured: true, grants: kinra("employee") },
  { slug: "intranet", name: "Intranet KINRA", description: "Pengumuman, kebijakan, dan direktori karyawan.", iconKey: "megaphone", category: "dokumen-kolaborasi", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "Keep", targetPeriod: "2027", businessOwner: "Sekretariat Perusahaan", grants: kinra("employee") },

  // --- Blok 4: Insight --------------------------------------------------------------------
  { slug: "dashboard-direksi", name: "Dashboard Direksi", description: "Kinerja perusahaan dari single source of truth data platform.", iconKey: "chart-pie", category: "insight", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-14", targetPeriod: "2028–29", businessOwner: "SEVP Business Support", featured: true, grants: kinra("executive") },
  { slug: "bi-self-service", name: "BI & Pelaporan", description: "Laporan dan analitik per domain: keuangan, tenant, utilitas.", iconKey: "chart-line", category: "insight", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-14", targetPeriod: "2028–29", businessOwner: "SEVP Business Support", grants: kinra("executive", "finance", "marketing", "estate_ops") },
  { slug: "katalog-data", name: "Katalog & Master Data", description: "Katalog data, master data tenant, lahan, aset, meter, dan vendor, serta skor kualitas data.", iconKey: "layers", category: "insight", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-14", targetPeriod: "2028–29", businessOwner: "SEVP Business Support", grants: kinra("executive", "it_staff", "finance", "marketing", "estate_ops") },
  { slug: "asisten-ai", name: "Asisten AI & Analitik Lanjut", description: "Forecasting permintaan utilitas, deteksi anomali, dan asisten pengetahuan internal.", iconKey: "bot", category: "insight", audience: "internal", integrationMode: "oidc_sso", status: "pilot", initiativeRef: "IT-21", targetPeriod: "2029–30", businessOwner: "SEVP Business Support", grants: kinra("employee") },

  // --- Blok 5: Shared services ------------------------------------------------------------
  { slug: "it-service-desk", name: "IT Service Desk & Self-Service", description: "Satu titik masuk untuk insiden, permintaan akun, perangkat, dan aplikasi.", iconKey: "life-buoy", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-02", targetPeriod: "2027", businessOwner: IT, featured: true, grants: kinra("employee", "auditor") },
  { slug: "security-awareness", name: "Security Awareness & e-Learning", description: "E-learning keamanan wajib tahunan dan simulasi phishing.", iconKey: "graduation-cap", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-03", targetPeriod: "2027–28", businessOwner: "Head of IT / InfoSec", grants: kinra("employee") },
  { slug: "it-portfolio", name: "IT Governance & Portfolio", description: "Stage-gate inisiatif, business case, benefit tracking, dan inventaris aplikasi.", iconKey: "briefcase", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-01", targetPeriod: "2026–27", businessOwner: "SEVP Business Support", grants: kinra("executive", "it_staff", "auditor") },
  { slug: "assessment-ti", name: "Assessment TI", description: "Penilaian maturity dan kapabilitas TI per domain, gap analysis, dan tindak lanjut perbaikan.", iconKey: "gauge", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "planned", initiativeRef: "IT-01", targetPeriod: "2026–27", businessOwner: IT, grants: kinra("executive", "it_staff", "auditor") },
  { slug: "digitalization-need", name: "Digitalization Need", description: "Pengajuan kebutuhan digitalisasi dari unit kerja, prioritisasi, dan pelacakan statusnya.", iconKey: "rocket", category: "layanan-ti", audience: "internal", integrationMode: "authenticated_link", status: "pilot", initiativeRef: "IT-01", targetPeriod: "2026–27", businessOwner: "SEVP Business Support", targetUrl: "http://localhost:3000/", grants: kinra("employee") }, // Temporary: local prototype. Needs localhost + APP_URL_ALLOW_HTTP in .env.local.
  { slug: "integration-platform", name: "Integration Platform (API)", description: "Konsol API gateway/iPaaS untuk pengelolaan integrasi.", iconKey: "plug", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-13", targetPeriod: "2027–28", businessOwner: IT, grants: kinra("it_staff") },
  { slug: "grc-isms", name: "ISMS, Risiko & Kepatuhan PDP", description: "Kebijakan keamanan, risk register siber, pencatatan pemrosesan data pribadi, dan penilaian risiko vendor.", iconKey: "clipboard-check", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-03", targetPeriod: "2027–28", businessOwner: "Head of IT / InfoSec", grants: kinra("executive", "it_staff", "auditor") },
  { slug: "soc-insiden", name: "SOC/MDR & Insiden Keamanan", description: "Dasbor deteksi 24×7, tiket insiden keamanan, dan eskalasi dari MDR provider.", iconKey: "activity", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-03", targetPeriod: "2027–28", businessOwner: "Head of IT / InfoSec", grants: kinra("it_staff") },
  { slug: "pam-console", name: "Privileged Access (PAM)", description: "Akses admin dan vendor berbasis persetujuan, rekaman sesi, dan access review triwulanan.", iconKey: "key-round", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-04", targetPeriod: "2027", businessOwner: IT, grants: kinra("it_staff", "auditor") },
  { slug: "iam-console", name: "Manajemen Identitas & Akses (IAM)", description: "Siklus hidup akun (joiner-mover-leaver), penugasan peran dan organisasi, kebijakan MFA, dan access review.", iconKey: "user-check", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "planned", initiativeRef: "IT-04", targetPeriod: "2027", businessOwner: IT, grants: kinra("it_staff", "portal_admin") },
  { slug: "noc-cloud", name: "Network & Cloud Operations", description: "Monitoring jaringan ring kawasan, landing zone cloud, dan kapasitas infrastruktur.", iconKey: "network", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-05", targetPeriod: "2027–28", businessOwner: IT, grants: kinra("it_staff") },
  { slug: "bcdr-resilience", name: "BC/DR & Cyber Recovery", description: "BIA layanan kritis, status backup immutable, RTO/RPO per tier, dan hasil uji DR.", iconKey: "life-buoy", category: "layanan-ti", audience: "internal", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-06", targetPeriod: "2027", businessOwner: IT, grants: kinra("executive", "it_staff", "auditor") },

  // --- Akun & Akses (internal + tenant) --------------------------------------------------
  { slug: "akun-kinra", name: "Akun & Akses KINRA", description: "Kelola MFA, perangkat tepercaya, dan sesi akun identitas tunggal.", iconKey: "key-round", category: "akun", audience: "both", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-04", targetPeriod: "2027", businessOwner: IT, grants: [...kinra("employee", "auditor"), ...tenants()] },
  { slug: "kelola-pengguna-tenant", name: "Kelola Pengguna Tenant", description: "Undang, nonaktifkan, dan atur peran pengguna di organisasi tenant Anda sendiri.", iconKey: "users", category: "akun", audience: "tenant", integrationMode: "oidc_sso", status: "planned", initiativeRef: "IT-04", targetPeriod: "2027", businessOwner: IT, grants: tenants("tenant_admin") },

  // --- Tenant digital services -----------------------------------------------------------
  { slug: "tenant-portal", name: "Tenant Digital Portal", description: "Permintaan layanan, keluhan, status & SLA, notifikasi kawasan.", iconKey: "headset", category: "layanan-tenant", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-08", targetPeriod: "2026–27", businessOwner: "Pemasaran & Penjualan / Produksi Kawasan", featured: true, grants: tenants() },
  { slug: "tagihan-pembayaran", name: "Tagihan & e-Payment", description: "Tagihan sewa dan utilitas, riwayat pembayaran, dan pembayaran elektronik.", iconKey: "credit-card", category: "tagihan-utilitas", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-08 · IT-09", targetPeriod: "2027–28", businessOwner: "Keuangan", featured: true, grants: tenants() },
  { slug: "pemakaian-utilitas", name: "Pemakaian Utilitas (Smart Meter)", description: "Konsumsi air, listrik, dan gas dari smart meter beserta notifikasi anomali.", iconKey: "zap", category: "tagihan-utilitas", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-16", targetPeriod: "2028–30", businessOwner: "Produksi Kawasan", featured: true, grants: tenants() },
  { slug: "perizinan-kek", name: "Perizinan KEK & OSS-RBA", description: "Pengajuan dan pelacakan perizinan KEK terintegrasi OSS-RBA.", iconKey: "stamp", category: "perizinan-ehs", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-08 · IT-13", targetPeriod: "2026–28", businessOwner: "Pemasaran & Penjualan", grants: tenants() },
  { slug: "kontrak-dokumen-tenant", name: "Kontrak & Dokumen Tenant", description: "Kontrak sewa, adendum, dan tanda tangan elektronik. Khusus admin tenant.", iconKey: "file-signature", category: "perizinan-ehs", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-12", targetPeriod: "2027–28", businessOwner: "Sekretariat Perusahaan", grants: tenants("tenant_admin") },
  { slug: "e-permit-ehs", name: "e-Permit & Pelaporan EHS", description: "Izin kerja (hot work, ketinggian) dan pelaporan K3 & lingkungan.", iconKey: "hard-hat", category: "perizinan-ehs", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-20", targetPeriod: "2029", businessOwner: "ME&F / Pengamanan", grants: tenants() },
  { slug: "konektivitas-tenant", name: "Konektivitas Kawasan", description: "Layanan jaringan dan internet kawasan: langganan, tiket, dan status.", iconKey: "wifi", category: "layanan-digital", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-05", targetPeriod: "2027–28", businessOwner: "Produksi Kawasan", grants: tenants("tenant_user", [A]) },
  { slug: "reservasi-fasilitas", name: "Reservasi Fasilitas & Layanan Baru", description: "Pemesanan parkir, pusat konvensi & pameran, dan hunian beserta tagihannya.", iconKey: "calendar-days", category: "layanan-digital", audience: "tenant", integrationMode: "oidc_sso", status: "available", initiativeRef: "IT-19", targetPeriod: "2028–30", businessOwner: "Pengembangan", grants: tenants() },
];
