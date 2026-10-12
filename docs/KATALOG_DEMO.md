# Katalog Demo OneSeiMangkeiSEZ

> Dibuat otomatis dari [scripts/catalogue-rsti.ts](../scripts/catalogue-rsti.ts) dengan `pnpm catalogue:doc`.
> Jangan diedit manual. Data simulasi end state RSTI 2030; seluruh URL fiktif kecuali disebut lain.

**48 aplikasi** dalam 11 kategori — Tersedia: 39, Pilot: 3, Direncanakan: 5, Pemeliharaan: 0, Dipensiunkan: 1.

## Engagement Investor & Tenant (3)

Blok 1 RSTI: Dashboard KEK, CRM, kanal tenant.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Dashboard KEK & Investor Pipeline**<br>`dashboard-kek` | Ringkasan pipeline investor dan kendala perizinan KEK untuk manajemen. Sementara, sampai CRM aktif. | Internal | SSO (OIDC) | Tersedia | IT-07 · 2026–27 | KINRA: marketing, executive |
| **CRM & Tenant Engagement**<br>`crm-tenant` | Sistem kerja tim marketing: prospek, penawaran, survei, dan penanganan case tenant (back-office Tenant Portal). | Internal | SSO (OIDC) | Tersedia | IT-10 · 2027–29 | KINRA: marketing, executive |
| **Onboarding Tenant**<br>`onboarding-tenant` | Workflow lintas divisi dari penandatanganan kontrak hingga tenant siap beroperasi. | Internal | SSO (OIDC) | Tersedia | IT-08 · IT-12 · 2027–28 | KINRA: marketing, finance, estate_ops |

## Operasi Kawasan & Utilitas (11)

Blok 2 RSTI: GIS, meter-to-cash, EAM, IoT, IEOC.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Estate GIS & Asset Registry**<br>`gis-aset` | Peta tunggal kavling, status lahan, jaringan utilitas, dan aset kawasan. | Internal | SSO (OIDC) | Tersedia | IT-15 · 2027–28 | KINRA: marketing, estate_ops, executive |
| **Utility Meter-to-Cash**<br>`meter-to-cash` | Pembacaan meter, validasi & rating, penagihan utilitas, dan rekonsiliasi otomatis. | Internal | SSO (OIDC) | Tersedia | IT-09 · 2027–28 | KINRA: finance, estate_ops |
| **Enterprise Asset Management & Maintenance**<br>`eam-maintenance` | Work order, preventive maintenance, dan aset tetap operasional (modul Odoo). | Internal | SSO (OIDC) | Tersedia | IT-11 · 2028–29 | KINRA: estate_ops |
| **Smart Utility IoT Monitoring**<br>`smart-utility-iot` | Data AMR/IoT dan SCADA utilitas terintegrasi melalui zona DMZ OT. | Internal | SSO (OIDC) | Tersedia | IT-16 · 2028–30 | KINRA: estate_ops |
| **Integrated Estate Operations Center (IEOC)**<br>`ieoc` | Korelasi insiden, situational awareness, dan koordinasi operasi kawasan. | Internal | SSO (OIDC) | Tersedia | IT-17 · 2029–30 | KINRA: estate_ops, executive |
| **Mobile Field Service**<br>`field-service` | Inspeksi, maintenance, dan patroli keamanan untuk petugas lapangan. | Internal | SSO (OIDC) | Tersedia | IT-20 · 2029 | KINRA: estate_ops |
| **Smart Security Kawasan**<br>`smart-security` | Akses gerbang terintegrasi dan patroli digital keamanan kawasan. | Internal | SSO (OIDC) | Direncanakan | Could Do · 2029–30 | KINRA: estate_ops |
| **Energy, Emission & Carbon MRV**<br>`mrv-energi-emisi` | Measurement, reporting & verification energi, emisi, dan karbon kawasan. | Internal | SSO (OIDC) | Tersedia | IT-18 · 2029–30 | KINRA: estate_ops, executive |
| **Video Analytics & Drone**<br>`video-analytics` | Pilot analitik video dan survei drone untuk pengamanan kawasan. | Internal | Login di aplikasi | Pilot | IT-22 · 2030 | KINRA: estate_ops |
| **Digital Twin Kawasan**<br>`digital-twin` | Simulasi skenario perencanaan kapasitas. Masih tahap studi kelayakan. | Internal | SSO (OIDC) | Direncanakan | IT-23 · 2030 | KINRA: executive, estate_ops |
| **Billing Utilitas Lokal (Legacy)**<br>`billing-utilitas-legacy` | Aplikasi lokal lama yang digantikan Meter-to-Cash. | Internal | Login di aplikasi | Dipensiunkan | IT-09 · 2027–28 | KINRA: finance |

## Enterprise Core (5)

Blok 3 RSTI: SAP FI/HC, Odoo operasional.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **SAP FI — Keuangan**<br>`sap-fi` | System of record akuntansi, piutang, dan buku besar. | Internal | SSO (SAML) | Tersedia | IT-11 · Eksisting | KINRA: finance |
| **SAP HC — Payroll**<br>`sap-hc` | System of record penggajian. | Internal | SSO (SAML) | Tersedia | IT-11 · Eksisting | KINRA: hr |
| **Odoo Pengadaan (Procure-to-Pay)**<br>`odoo-pengadaan` | Permintaan pembelian, pengadaan, dan penerimaan barang, terintegrasi ke SAP FI. | Internal | SSO (OIDC) | Tersedia | IT-11 · 2028–29 | KINRA: employee |
| **Odoo Kontrak & Billing Tenant**<br>`odoo-kontrak-billing` | Kontrak sewa dan tagihan berulang tenant (contract-to-bill). | Internal | SSO (OIDC) | Tersedia | IT-11 · 2028–29 | KINRA: finance, marketing |
| **Odoo Rekrutmen & Talent Pool**<br>`odoo-talent` | Rekrutmen dan talent pool karyawan. | Internal | SSO (OIDC) | Tersedia | IT-11 · 2028–29 | KINRA: hr |

## Dokumen & Kolaborasi (3)

DMS, workflow, e-sign, email & kolaborasi.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **DMS, Workflow & e-Sign**<br>`dms-workflow` | Persuratan, persetujuan, arsip, dan tanda tangan elektronik tersertifikasi. | Internal | SSO (OIDC) | Tersedia | IT-12 · 2027–28 | KINRA: employee |
| **Email & Kolaborasi**<br>`email-kolaborasi` | Email, kalender, dan kolaborasi dokumen yang distandarkan dan diamankan. | Internal | SSO (OIDC) | Tersedia | Keep · 2027 | KINRA: employee |
| **Intranet KINRA**<br>`intranet` | Pengumuman, kebijakan, dan direktori karyawan. | Internal | SSO (OIDC) | Tersedia | Keep · 2027 | KINRA: employee |

## Insight: Data, BI & AI (4)

Blok 4 RSTI: data platform, BI, AI.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Dashboard Direksi**<br>`dashboard-direksi` | Kinerja perusahaan dari single source of truth data platform. | Internal | SSO (OIDC) | Tersedia | IT-14 · 2028–29 | KINRA: executive |
| **BI & Pelaporan**<br>`bi-self-service` | Laporan dan analitik per domain: keuangan, tenant, utilitas. | Internal | SSO (OIDC) | Tersedia | IT-14 · 2028–29 | KINRA: executive, finance, marketing, estate_ops |
| **Katalog & Master Data**<br>`katalog-data` | Katalog data, master data tenant, lahan, aset, meter, dan vendor, serta skor kualitas data. | Internal | SSO (OIDC) | Tersedia | IT-14 · 2028–29 | KINRA: executive, it_staff, finance, marketing, estate_ops |
| **Asisten AI & Analitik Lanjut**<br>`asisten-ai` | Forecasting permintaan utilitas, deteksi anomali, dan asisten pengetahuan internal. | Internal | SSO (OIDC) | Pilot | IT-21 · 2029–30 | KINRA: employee |

## Layanan TI & Keamanan (12)

Blok 5 RSTI: IAM, ITSM, integrasi, keamanan.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **IT Service Desk & Self-Service**<br>`it-service-desk` | Satu titik masuk untuk insiden, permintaan akun, perangkat, dan aplikasi. | Internal | SSO (OIDC) | Tersedia | IT-02 · 2027 | KINRA: employee, auditor |
| **Security Awareness & e-Learning**<br>`security-awareness` | E-learning keamanan wajib tahunan dan simulasi phishing. | Internal | SSO (OIDC) | Tersedia | IT-03 · 2027–28 | KINRA: employee |
| **IT Governance & Portfolio**<br>`it-portfolio` | Stage-gate inisiatif, business case, benefit tracking, dan inventaris aplikasi. | Internal | SSO (OIDC) | Tersedia | IT-01 · 2026–27 | KINRA: executive, it_staff, auditor |
| **Assessment TI**<br>`assessment-ti` | Penilaian maturity dan kapabilitas TI per domain, gap analysis, dan tindak lanjut perbaikan. | Internal | SSO (OIDC) | Direncanakan | IT-01 · 2026–27 | KINRA: executive, it_staff, auditor |
| **Digitalization Need**<br>`digitalization-need` | Pengajuan kebutuhan digitalisasi dari unit kerja, prioritisasi, dan pelacakan statusnya. — URL: `http://localhost:3000/` | Internal | Login di aplikasi | Pilot | IT-01 · 2026–27 | KINRA: employee |
| **Integration Platform (API)**<br>`integration-platform` | Konsol API gateway/iPaaS untuk pengelolaan integrasi. | Internal | SSO (OIDC) | Tersedia | IT-13 · 2027–28 | KINRA: it_staff |
| **ISMS, Risiko & Kepatuhan PDP**<br>`grc-isms` | Kebijakan keamanan, risk register siber, pencatatan pemrosesan data pribadi, dan penilaian risiko vendor. | Internal | SSO (OIDC) | Tersedia | IT-03 · 2027–28 | KINRA: executive, it_staff, auditor |
| **SOC/MDR & Insiden Keamanan**<br>`soc-insiden` | Dasbor deteksi 24×7, tiket insiden keamanan, dan eskalasi dari MDR provider. | Internal | SSO (OIDC) | Tersedia | IT-03 · 2027–28 | KINRA: it_staff |
| **Privileged Access (PAM)**<br>`pam-console` | Akses admin dan vendor berbasis persetujuan, rekaman sesi, dan access review triwulanan. | Internal | SSO (OIDC) | Tersedia | IT-04 · 2027 | KINRA: it_staff, auditor |
| **Manajemen Identitas & Akses (IAM)**<br>`iam-console` | Siklus hidup akun (joiner-mover-leaver), penugasan peran dan organisasi, kebijakan MFA, dan access review. | Internal | SSO (OIDC) | Direncanakan | IT-04 · 2027 | KINRA: it_staff, portal_admin |
| **Network & Cloud Operations**<br>`noc-cloud` | Monitoring jaringan ring kawasan, landing zone cloud, dan kapasitas infrastruktur. | Internal | SSO (OIDC) | Tersedia | IT-05 · 2027–28 | KINRA: it_staff |
| **BC/DR & Cyber Recovery**<br>`bcdr-resilience` | BIA layanan kritis, status backup immutable, RTO/RPO per tier, dan hasil uji DR. | Internal | SSO (OIDC) | Tersedia | IT-06 · 2027 | KINRA: executive, it_staff, auditor |

## Layanan Tenant (1)

Portal tenant: permintaan, keluhan, status layanan.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Tenant Digital Portal**<br>`tenant-portal` | Permintaan layanan, keluhan, status & SLA, notifikasi kawasan. | Tenant | SSO (OIDC) | Tersedia | IT-08 · 2026–27 | Tenant A: tenant_user; Tenant B: tenant_user |

## Tagihan & Utilitas (2)

Tagihan, e-payment, pemakaian utilitas.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Tagihan & e-Payment**<br>`tagihan-pembayaran` | Tagihan sewa dan utilitas, riwayat pembayaran, dan pembayaran elektronik. | Tenant | SSO (OIDC) | Tersedia | IT-08 · IT-09 · 2027–28 | Tenant A: tenant_user; Tenant B: tenant_user |
| **Pemakaian Utilitas (Smart Meter)**<br>`pemakaian-utilitas` | Konsumsi air, listrik, dan gas dari smart meter beserta notifikasi anomali. | Tenant | SSO (OIDC) | Tersedia | IT-16 · 2028–30 | Tenant A: tenant_user; Tenant B: tenant_user |

## Perizinan, Dokumen & EHS (3)

Perizinan KEK, kontrak, izin kerja, EHS.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Perizinan KEK & OSS-RBA**<br>`perizinan-kek` | Pengajuan dan pelacakan perizinan KEK terintegrasi OSS-RBA. | Tenant | SSO (OIDC) | Tersedia | IT-08 · IT-13 · 2026–28 | Tenant A: tenant_user; Tenant B: tenant_user |
| **Kontrak & Dokumen Tenant**<br>`kontrak-dokumen-tenant` | Kontrak sewa, adendum, dan tanda tangan elektronik. Khusus admin tenant. | Tenant | SSO (OIDC) | Tersedia | IT-12 · 2027–28 | Tenant A: tenant_admin; Tenant B: tenant_admin |
| **e-Permit & Pelaporan EHS**<br>`e-permit-ehs` | Izin kerja (hot work, ketinggian) dan pelaporan K3 & lingkungan. | Tenant | SSO (OIDC) | Tersedia | IT-20 · 2029 | Tenant A: tenant_user; Tenant B: tenant_user |

## Konektivitas & Fasilitas (2)

Konektivitas, reservasi fasilitas, layanan baru.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Konektivitas Kawasan**<br>`konektivitas-tenant` | Layanan jaringan dan internet kawasan: langganan, tiket, dan status. | Tenant | SSO (OIDC) | Tersedia | IT-05 · 2027–28 | Tenant A: tenant_user |
| **Reservasi Fasilitas & Layanan Baru**<br>`reservasi-fasilitas` | Pemesanan parkir, pusat konvensi & pameran, dan hunian beserta tagihannya. | Tenant | SSO (OIDC) | Tersedia | IT-19 · 2028–30 | Tenant A: tenant_user; Tenant B: tenant_user |

## Akun & Akses (2)

Identitas tunggal, MFA, profil akses.

| Aplikasi | Deskripsi | Audiens | Integrasi | Status | Roadmap | Hak akses |
| --- | --- | --- | --- | --- | --- | --- |
| **Akun & Akses KINRA**<br>`akun-kinra` | Kelola MFA, perangkat tepercaya, dan sesi akun identitas tunggal. | Internal & Tenant | SSO (OIDC) | Tersedia | IT-04 · 2027 | KINRA: employee, auditor; Tenant A: tenant_user; Tenant B: tenant_user |
| **Kelola Pengguna Tenant**<br>`kelola-pengguna-tenant` | Undang, nonaktifkan, dan atur peran pengguna di organisasi tenant Anda sendiri. | Tenant | SSO (OIDC) | Direncanakan | IT-04 · 2027 | Tenant A: tenant_admin; Tenant B: tenant_admin |
