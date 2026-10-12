# OneSeiMangkeiSEZ — Single Digital Gateway KINRA

Portal web yang menjadi satu pintu masuk bagi karyawan, manajemen, administrator, dan tenant
PT Kawasan Industri Nusantara (KINRA) ke aplikasi digital yang menjadi hak aksesnya.
Implementasi MVP dari `PRD_OneKINRA.md` (PRD-ONEKINRA-001 v1.0).

> **Status:** MVP Fase 1 (fondasi), berjalan lokal dengan **adapter identitas MOCK**.
> Belum siap produksi. Lihat [docs/DECISIONS.md](docs/DECISIONS.md) untuk keputusan yang
> menunggu persetujuan KINRA dan [docs/SECURITY.md](docs/SECURITY.md) untuk keterbatasan.

## Fitur MVP

| Kebutuhan PRD | Implementasi |
| --- | --- |
| FR-01 Landing/login | `/login`, redirect otomatis ke workspace setelah masuk |
| FR-02/03 Autentikasi & SSO | OIDC Authorization Code + PKCE (`openid-client`), siap ZITADEL/Keycloak; adapter mock khusus lokal |
| FR-04 Workspace | Workspace Internal KINRA dan Tenant, pemilihan organisasi aktif untuk pengguna multi-organisasi |
| FR-05 Katalog | Kartu aplikasi dengan gambar sampul (unggahan admin atau sampul otomatis per kategori), pencarian, filter kategori, status, empty state |
| FR-06 Peluncuran | `/launch/[slug]`: URL tujuan hanya dari data server, divalidasi ulang terhadap allowlist host |
| FR-07 Profil | `/profile`, hanya-baca |
| FR-08 Admin katalog | `/admin/applications`: pencarian & filter, tambah, ubah, pensiunkan (dengan konfirmasi), kelola hak akses, unggah gambar sampul |
| FR-09 Organisasi & hak akses | Pemetaan organisasi IAM + tabel entitlement (org + peran → aplikasi), deny-by-default |
| FR-10 Audit | Tabel `audit_events` append-only (dikunci trigger DB), sanitasi rahasia, viewer `/admin/audit` |
| FR-11 Error state | Akses ditolak, sesi berakhir, aplikasi tidak tersedia, IdP tidak tersedia, 404, error sistem |
| Layar 7 | `/admin/access`: ikhtisar akses efektif (hanya-baca) |
| FR-13 Pengumuman | Banner "Pengumuman penting" (Kritis/Penting) di beranda, `/announcements`, detail `/announcements/[id]`, konfirmasi baca per versi; admin `/admin/announcements` (draf, pratinjau, terbit/terjadwal, tarik, target audiens org/peran) |
| Berita (tambahan) | `/news` dan panel beranda: judul + cuplikan dari feed RSS situs KEK Sei Mangkei, media, dan pemerintah, difokuskan pada topik prioritas KINRA (investasi, infrastruktur & utilitas, regulasi KEK, risiko & keselamatan kawasan) (daftar tetap di `src/lib/news/sources.ts`), artikel dibuka di situs sumber; admin `/admin/news` (sinkronkan, sembunyikan, status sumber) |
| Asisten AI (tambahan) | Panel "Tanya Asisten" di workspace, menjawab seputar aplikasi di katalog pengguna (Claude API; aktif bila `ANTHROPIC_API_KEY` diisi) |

Belum dikerjakan: favorit & aplikasi terakhir (FR-12), analitik (FR-14), agenda/kegiatan, pusat notifikasi
(menunggu aplikasi sumber nyata yang dapat mengirim event, mis. IT Service Desk).

**Berita:** sinkronkan dari `/admin/news` ("Sinkronkan sekarang"), atau jadwalkan
`POST /api/internal/news-sync` dengan header `Authorization: Bearer $NEWS_SYNC_TOKEN` (mis. cron tiap 30 menit).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · PostgreSQL 17 ·
Drizzle ORM (satu-satunya lapisan data) · `openid-client` · `jose` · Vitest · Playwright.
Alasan pemilihan ada di [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md).

## Menjalankan secara lokal

Prasyarat: Node.js ≥ 20.9, pnpm 10, Docker, Supabase CLI.

```bash
pnpm install
cp .env.example .env.local          # lalu isi SESSION_SECRET: openssl rand -base64 48
pnpm db:up                          # Supabase lokal (DB di port 54362, Studio http://127.0.0.1:54363)
pnpm db:test:init                   # sekali saja: buat + migrasi DB onekinra_test
pnpm db:migrate                     # terapkan migrasi
pnpm db:seed                        # data DEMO (bukan data produksi)
pnpm dev                            # http://localhost:3100
```

Port 3100 dipakai agar tidak bentrok dengan aplikasi lain di 3000.

### Identitas demo (MOCK)

Halaman login menampilkan pemilih identitas demo bila `AUTH_PROVIDER=mock` dan
`MOCK_AUTH_ENABLED=true`. Adapter ini **ditolak** saat `APP_ENV=production`.

| Pengguna | Organisasi & peran | Untuk menguji |
| --- | --- | --- |
| `andi.karyawan` | KINRA: employee | Aplikasi umum karyawan, Digitalization Need |
| `sari.eksekutif` | KINRA: employee, executive | Dashboard Direksi, KEK, IEOC |
| `fajar.pemasaran` | KINRA: employee, marketing | Dashboard KEK, CRM, GIS |
| `lina.keuangan` | KINRA: employee, finance | SAP FI, Meter-to-Cash, billing |
| `hendra.sdm` | KINRA: employee, hr | SAP HC, talent pool |
| `rudi.operasi` | KINRA: employee, estate_ops | GIS, IoT, IEOC, EAM, field service |
| `admin.it` | KINRA: employee, it_staff, portal_admin | Administrasi katalog, integrasi, Assessment TI, konsol IAM |
| `rina.auditor` | KINRA: auditor | Jejak audit hanya-baca |
| `budi.tenant-a` | Tenant A: tenant_user | Workspace tenant |
| `citra.tenant-b` | Tenant B: tenant_user | Isolasi tenant |
| `dewi.multi` | Tenant A: tenant_admin, tenant_user; Tenant B: tenant_user | Ganti organisasi, layanan admin tenant (Kelola Pengguna Tenant) |
| `eko.tanpa-akses` | Organisasi tidak terdaftar | Pengguna tanpa akses |

### Katalog demo: simulasi end state RSTI 2030

Data demo diambil dari draf **RSTI PT KINRA 2026–2030** (`RSTI_PT_KINRA_2026_2030_Draft.docx`)
dan didefinisikan di [scripts/catalogue-rsti.ts](scripts/catalogue-rsti.ts):

- Kategori internal mengikuti lima blok arsitektur aplikasi (RSTI §8.4): Engagement,
  Operasi Kawasan & Utilitas, Enterprise Core, Insight, dan Layanan TI.
  Kategori tenant mengikuti katalog layanan digital tenant (§9.4, §13.1).
- Aplikasi diambil dari portofolio aplikasi (§9.1) dan inisiatif IT-01 s.d. IT-23 (Bab 14).
  Setiap kartu menampilkan kode inisiatif dan periode target, mis. "IT-08 · 2026–27".
- Status menggambarkan kondisi **target 2030**. Video Analytics, Asisten AI, dan Digitalization Need
  berstatus Pilot; Digital Twin (studi kelayakan), Smart Security, Assessment TI, konsol IAM, dan
  Kelola Pengguna Tenant masih Direncanakan; billing utilitas lokal berstatus Dipensiunkan.
- Workspace menampilkan catatan "Simulasi end state 2030" selama data demo dipakai.
- Tambahan di luar RSTI awal: **Assessment TI**, **Digitalization Need**, **Manajemen Identitas & Akses (IAM)**,
  dan **Kelola Pengguna Tenant** (semua IT-01/IT-04). Konsol IAM dan Kelola Pengguna Tenant hanya tautan
  ke konsol IAM (ZITADEL), bukan modul pengelolaan user di portal (PRD FR-08/FR-09).
- **Dashboard KEK** diposisikan sementara sampai **CRM** aktif; setelah itu direncanakan digabung ke entri CRM.
- Daftar lengkap per kategori, termasuk hak akses: [docs/KATALOG_DEMO.md](docs/KATALOG_DEMO.md)
  (dibuat ulang dengan `pnpm catalogue:doc` setiap kali `scripts/catalogue-rsti.ts` berubah).

Seluruh organisasi, aplikasi, dan URL demo bersifat fiktif (host `*.kinra.example`, TLD
cadangan yang tidak dapat di-resolve). Tombol "Buka" akan mengarah ke host yang tidak ada.
Pengecualian sementara: **Digitalization Need** mengarah ke `http://localhost:3000/` (prototipe lokal);
ini membutuhkan `localhost` di `APP_URL_ALLOWED_HOSTS` dan `APP_URL_ALLOW_HTTP=true` di `.env.local`.

### Menghubungkan ke ZITADEL / Keycloak (dev/test)

```env
AUTH_PROVIDER=oidc
OIDC_ISSUER=https://<iam-dev>/
OIDC_CLIENT_ID=<client id>
OIDC_CLIENT_SECRET=            # kosong untuk public client (PKCE)
OIDC_CLAIM_MAPPING=zitadel     # atau generic + OIDC_MEMBERSHIPS_CLAIM
```

Redirect URI yang didaftarkan di IdP: `<PORTAL_BASE_URL>/api/auth/callback`.
Post-logout redirect URI: `<PORTAL_BASE_URL>/login?logged_out=1`.
ZITADEL: aktifkan "Assert Roles on Authentication" agar klaim `urn:zitadel:iam:org:project:roles`
masuk ke ID token. ID organisasi IAM harus didaftarkan di tabel `organizations`
(kolom `external_org_id`) sebelum anggotanya mendapat konteks.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Pengembangan / build produksi / jalankan build |
| `pnpm typecheck` / `pnpm lint` | TypeScript strict / ESLint |
| `pnpm test` | Unit + integrasi (Vitest, memakai `TEST_DATABASE_URL`) |
| `pnpm test:e2e` | E2E Playwright terhadap build produksi di port 3200 + DB test |
| `pnpm db:generate` | Buat migrasi baru dari perubahan `src/lib/db/schema.ts` |
| `pnpm db:migrate` / `pnpm db:seed` | Terapkan migrasi / isi data demo |
| `pnpm db:reset` | Kosongkan DB **lokal** lalu migrasi + seed (menolak host non-lokal) |

Sebelum E2E pertama kali: `pnpm exec playwright install chromium`.

## Variabel environment

Lihat [.env.example](.env.example); setiap variabel dijelaskan di sana. Rahasia produksi
wajib berasal dari secret store yang disetujui, tidak pernah di-commit.

## Struktur

```
src/proxy.ts                 Header keamanan, CSP nonce, request ID, cek Origin (CSRF)
src/lib/env.ts               Validasi konfigurasi
src/lib/auth/                Sesi terenkripsi, OIDC, mock, pemetaan klaim, guard halaman
src/lib/authz/policy.ts      Keputusan otorisasi murni (deny-by-default)
src/lib/catalogue/           Layanan katalog & admin, validasi input
src/lib/audit/               Pencatatan audit + sanitasi rahasia
src/lib/security/            Validasi URL, return path aman, rate limit
src/lib/db/                  Schema Drizzle + koneksi
src/app/                     Halaman dan route API
drizzle/                     Migrasi SQL berversi
scripts/                     migrate, seed (demo), reset (lokal)
tests/unit|integration|e2e   Pengujian
docs/                        ADR, deployment, keamanan, onboarding, keputusan
```

## Troubleshooting

| Gejala | Penyebab umum |
| --- | --- |
| `Konfigurasi environment tidak valid` | Variabel wajib kosong, mis. `SESSION_SECRET` < 32 karakter |
| `EADDRINUSE :3100` | Port terpakai; ubah `-p` di `package.json` dan `PORTAL_BASE_URL` |
| Login OIDC kembali dengan "identity provider tidak dapat dihubungi" | `OIDC_ISSUER` salah atau IdP mati; cek `/.well-known/openid-configuration` |
| Login berhasil tetapi "Akun belum terhubung ke organisasi" | ID organisasi IAM belum ada di tabel `organizations`, atau klaim peran tidak dikirim IdP |
| Aplikasi tidak tampil di workspace | Tidak ada baris hak akses (org + peran), status `retired`, atau `environment` ≠ `APP_ENV` |
| Simpan aplikasi ditolak "host tidak termasuk daftar" | Tambahkan host ke `APP_URL_ALLOWED_HOSTS` (melalui proses persetujuan) |
| `/api/health` 503 | Database tidak dapat dihubungi |
| Halaman dev terus reload ("HMR hash mismatch") | Cache `.next/dev` rusak. Hentikan `pnpm dev`, hapus `.next/dev`, jalankan ulang. Build E2E memakai `.next-e2e` agar tidak bentrok |
| `next build` gagal mengunduh font | Font Lexend & Source Sans 3 diunduh saat build lalu di-host sendiri; build butuh akses ke Google Fonts atau ganti ke font lokal di `src/app/fonts.ts` |

## PWA dan pembaruan otomatis

OneSeiMangkeiSEZ dapat dipasang sebagai aplikasi (Progressive Web App) di Chrome/Edge (desktop & Android) lewat
tombol **Pasang** di header atau halaman Profil, dan di iOS lewat Safari → Bagikan → Tambah ke Layar Utama.

Cara kerja pembaruan otomatis:

1. Setiap build mendapat **build ID** unik (`APP_BUILD_ID`, bawaan: stempel waktu build). ID ini tertanam di
   bundle klien, di `/api/version`, dan di skrip service worker `/sw.js`.
2. Aplikasi yang terbuka memeriksa `/api/version` dan meminta browser mengunduh ulang `/sw.js`
   setiap 5 menit, saat aplikasi kembali dibuka/terlihat, dan saat koneksi kembali.
3. Bila build ID server berbeda, pembaruan diterapkan otomatis pada saat aman:
   - aplikasi di latar belakang: langsung dimuat ulang;
   - aplikasi sedang dilihat: hitung mundur 10 detik (bisa "Perbarui sekarang" atau "Tunda" 30 menit);
   - ada formulir yang belum disimpan (`data-unsaved="true"`): **tidak pernah** dimuat ulang otomatis.
4. Pengaman loop: build yang sama tidak dicoba ulang lebih dari sekali per sesi browser.

Service worker hanya meng-cache aset statis publik (`/_next/static`, ikon, logo) dan halaman offline.
Halaman ber-login, API, dan `/launch` **tidak pernah** di-cache (data tenant tetap di server).
Di mode `pnpm dev` service worker dinonaktifkan; aktifkan dengan `NEXT_PUBLIC_ENABLE_SW=true` bila perlu.
Ikon dibuat dari `public/brand/kinra-logo.png` dengan `node scripts/generate-pwa-icons.mjs`.

## Desain UI

Gaya "Trust & Authority" untuk portal enterprise: header dan hero navy, aksen biru untuk internal dan
teal untuk tenant, tipografi Lexend (judul) + Source Sans 3 (isi). Token warna dan font ada di
[src/app/globals.css](src/app/globals.css) dan [src/app/fonts.ts](src/app/fonts.ts), masih placeholder
sampai brand resmi KINRA tersedia. Pencarian dapat difokuskan dengan `/` atau `Ctrl/⌘+K`.

## Dokumen terkait

- [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md) — keputusan arsitektur
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deployment dan rollback
- [docs/SECURITY.md](docs/SECURITY.md) — checklist keamanan dan keterbatasan
- [docs/APP_ONBOARDING_CHECKLIST.md](docs/APP_ONBOARDING_CHECKLIST.md) — onboarding aplikasi
- [docs/KATALOG_DEMO.md](docs/KATALOG_DEMO.md) — daftar katalog demo (dibuat otomatis)
- [docs/DECISIONS.md](docs/DECISIONS.md) — keputusan yang memerlukan persetujuan KINRA
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md) — hasil pengujian
