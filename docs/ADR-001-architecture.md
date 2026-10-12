# ADR-001 — Arsitektur MVP OneSeiMangkeiSEZ

- **Status:** Diusulkan (menunggu persetujuan pemilik teknis KINRA)
- **Tanggal:** 2026-10-10
- **Konteks:** PRD-ONEKINRA-001 v1.0. Repositori awalnya kosong (hanya PRD), sehingga tidak ada
  konvensi lama yang harus diikuti. Stack mengikuti "Preferred Stack" PRD §9.2.

## 1. Bentuk sistem

Satu aplikasi Next.js (App Router) yang berperan sebagai portal dan peluncur aplikasi.
Aplikasi tujuan tetap di-deploy terpisah. Portal tidak mem-proxy atau meng-embed aplikasi tujuan.
Tidak ada API gateway terpisah (PRD §13.3); route handler Next.js sudah cukup untuk MVP.

Komponen logis (PRD §9.3) dipetakan ke modul:

| Komponen | Modul |
| --- | --- |
| UI & navigasi workspace | `src/app`, `src/components` |
| Integrasi autentikasi/sesi | `src/lib/auth` |
| Otorisasi & konteks organisasi | `src/lib/authz/policy.ts`, `src/lib/auth/current.ts` |
| Layanan katalog | `src/lib/catalogue/service.ts` |
| Antarmuka administrasi | `src/app/admin`, `src/app/api/admin` |
| Layanan audit | `src/lib/audit` |
| Adapter IAM | `src/lib/auth/oidc.ts`, `claims.ts`, `mock-users.ts` |
| Health & telemetri | `/api/live`, `/api/health`, `src/lib/logger.ts` |

## 2. IAM

- Protokol: **OIDC Authorization Code + PKCE (S256)** memakai `openid-client` v6 yang
  memvalidasi issuer, audience, tanda tangan, expiry, dan nonce.
- Mendukung public client (tanpa secret) maupun confidential client (`client_secret_basic`).
- Vendor tidak dikunci. Pemetaan klaim dapat diganti: `zitadel` (klaim
  `urn:zitadel:iam:org:project:roles`) atau `generic` (klaim JSON berisi org + peran,
  mis. lewat protocol mapper Keycloak).
- Portal **tidak** menyimpan kata sandi maupun token IdP. Token dibuang setelah klaim dibaca.
- Logout memakai RP-initiated logout (`end_session_endpoint`) bila tersedia.
  Single logout ke aplikasi tujuan **tidak dijamin** dan harus diuji per aplikasi.
- **Mock adapter** hanya untuk pengembangan lokal dan tes otomatis. Ia ditolak saat
  `APP_ENV=production`, membutuhkan `MOCK_AUTH_ENABLED=true`, dan menampilkan banner peringatan.

## 3. Model sesi

- Cookie sesi berisi JWE (`dir` + `A256GCM`) terenkripsi dengan kunci turunan `SESSION_SECRET`.
  Isinya: `sub`, nama, email, keanggotaan organisasi + peran (dari IdP), org aktif, `exp`.
- Atribut cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` + prefiks `__Host-` saat HTTPS.
- Cookie sesi browser (tanpa Max-Age); masa berlaku absolut dari `exp`
  (`SESSION_MAX_AGE_SECONDS`, bawaan 8 jam). Sesi kedaluwarsa dibedakan dari "belum login"
  sehingga pengguna diarahkan ke halaman "Sesi berakhir".
- Ganti organisasi menulis ulang cookie dengan `exp` yang sama sehingga sesi tidak dapat diperpanjang.
- Stateless: tidak ada tabel sesi. Konsekuensinya, pencabutan keanggotaan di IdP berlaku
  saat login berikutnya / sesi habis. Pencabutan **hak akses aplikasi** di portal berlaku
  seketika karena entitlement dibaca dari DB pada setiap permintaan.

## 4. Otorisasi

- Deny-by-default. Fungsi murni di `policy.ts` diuji unit.
- Konteks aktif = organisasi yang (a) dinyatakan IdP untuk pengguna **dan** (b) terdaftar
  serta aktif di tabel `organizations`. ID organisasi dari browser tidak pernah dipercaya.
- Aplikasi terlihat bila: status ≠ retired, `environment` = `APP_ENV`, audiens cocok dengan
  jenis organisasi, dan ada entitlement (org aktif + salah satu peran pengguna).
- Aplikasi dapat diluncurkan bila terlihat dan status `available` atau `pilot`.
- Admin portal = peran `portal_admin` **dalam konteks KINRA**. Auditor = `auditor`
  (atau `portal_admin`) dalam konteks KINRA, hanya-baca.
- Filter dilakukan di SQL lalu diverifikasi ulang oleh policy (defence in depth).
  Layanan admin juga memeriksa ulang peran meskipun route sudah memeriksa.
- Aplikasi yang tidak ada dan yang tidak berhak menghasilkan respons identik (tanpa kebocoran metadata).

## 5. Penyimpanan data

PostgreSQL hanya untuk data milik portal:

| Tabel | Isi |
| --- | --- |
| `categories` | Kategori katalog |
| `organizations` | Pemetaan ID organisasi IAM → nama, jenis (kinra/tenant), status |
| `applications` | Metadata katalog (PRD §6.2), soft-retire |
| `application_entitlements` | Hak akses aplikasi: (aplikasi, organisasi, kunci peran) |
| `audit_events` | Jejak audit append-only |

Pengguna dan keanggotaan **tidak** diduplikasi; sumber kebenarannya IdP.
Satu lapisan data: Drizzle ORM + migrasi SQL berversi di `drizzle/`.
Trigger DB memblokir UPDATE/DELETE/TRUNCATE pada `audit_events`.

## 6. Deployment

Hosting-agnostik: output `standalone` Next.js + `Dockerfile` (non-root, healthcheck).
Tidak mengasumsikan Vercel atau cloud publik. Lingkungan target harus disetujui KINRA.
Detail di `DEPLOYMENT.md`.

## 7. Alternatif yang ditolak

- **Auth.js / NextAuth:** menambah lapisan abstraksi; `openid-client` langsung lebih transparan
  untuk validasi dan cukup untuk satu IdP.
- **Membangun IdP sendiri:** dilarang PRD §4.3.
- **Sesi di database:** belum diperlukan; dapat ditambahkan bila KINRA mensyaratkan
  pencabutan sesi seketika.
- **shadcn/ui:** komponen ditulis langsung dengan Tailwind + HTML semantik agar dependensi
  minimal. shadcn/Radix dapat diadopsi bila dibutuhkan komponen interaktif kompleks.
