# Laporan Pengujian — MVP Fase 1

**Tanggal:** 2026-10-10 · **Lingkungan:** lokal (macOS, Node 22, PostgreSQL 17 di Docker),
adapter identitas MOCK, database uji terpisah (`onekinra_test`), katalog demo RSTI end state 2030.

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| TypeScript strict | `pnpm typecheck` | Lolos, 0 error |
| ESLint | `pnpm lint` | Lolos, 0 error, 0 warning |
| Unit + integrasi | `pnpm test` | 6 file, 64 tes lolos |
| End-to-end (build produksi) | `pnpm test:e2e` | 23 tes lolos (termasuk 4 tes PWA) |
| Image container | `docker build` + `/api/health` | 200 OK |

## Cakupan skenario penerimaan (PRD §16)

| Skenario | Status | Tes |
| --- | --- | --- |
| AT-01 Pengguna internal | Lolos | integrasi + E2E |
| AT-02 Pengguna tenant | Lolos | integrasi + E2E |
| AT-03 Isolasi lintas tenant | Lolos | unit, integrasi, E2E (API ganti org, detail, launch) |
| AT-04 Launch tanpa hak | Lolos | integrasi + E2E (respons identik untuk slug tak dikenal) |
| AT-05 Aplikasi SSO | **Sebagian** | Pengalihan ke URL disetujui teruji. SSO tanpa prompt kedua butuh IdP + aplikasi tujuan nyata |
| AT-06 Aplikasi non-SSO | Lolos | E2E (label jujur, tanpa klaim SSO) |
| AT-07 Aplikasi pensiun | Lolos | unit, integrasi, E2E |
| AT-08 Administrasi katalog | Lolos | integrasi + E2E (validasi, simpan, audit) |
| AT-09 Admin tanpa hak | Lolos | integrasi + E2E (API langsung 401/403, halaman ditolak) |
| AT-10 Sesi kedaluwarsa | Lolos | unit + E2E |
| AT-11 URL tidak aman | Lolos | unit (14 kasus), integrasi, E2E via UI |
| AT-12 Higiene rahasia audit | Lolos | unit + integrasi (cek baris tersimpan) |
| AT-13 Layout mobile | Lolos | E2E 390×844, tanpa overflow horizontal |
| AT-14 IAM tidak tersedia | **Sebagian** | Integrasi: discovery gagal menjadi error terkendali. Belum diuji E2E dengan IdP nyata |

Tambahan: append-only audit di level DB, CSRF lintas origin ditolak, header CSP/keamanan,
CSP tidak merusak aplikasi di build produksi, cookie sesi palsu ditolak, logout,
pengguna multi-organisasi, pengguna tanpa organisasi.

## PWA

- E2E: manifest & ikon, `/api/version`, `/sw.js` (berubah per build, tanpa cache), service worker
  mengendalikan halaman, halaman offline tanpa konten ber-login, deteksi versi baru + hitung mundur +
  reload tanpa loop, dan tidak ada reload otomatis saat formulir belum disimpan.
- Simulasi deploy nyata (manual): aplikasi terbuka di build A, server diganti ke build B tanpa
  menyentuh browser. Hasil: aplikasi memuat ulang sendiri ke build B, service worker aktif build B,
  cache lama dihapus.
