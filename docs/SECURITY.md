# Checklist Keamanan dan Keterbatasan

## Checklist (status implementasi MVP)

| # | Kontrol (PRD §11) | Status | Bukti |
| --- | --- | --- | --- |
| 1 | HTTPS, HSTS | Sebagian | HSTS + `upgrade-insecure-requests` aktif bila `PORTAL_BASE_URL` https. TLS di reverse proxy belum dikonfigurasi |
| 2 | Cookie Secure/HttpOnly/SameSite | Ya | `src/lib/auth/cookies.ts`, prefiks `__Host-` saat HTTPS |
| 3 | CSRF | Ya | SameSite=Lax + cek `Origin`/`Sec-Fetch-Site` di `src/proxy.ts`; logout hanya POST. E2E menguji |
| 4 | CSP & header keamanan | Ya | CSP nonce + `strict-dynamic`, `frame-ancestors 'none'`, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| 5 | Validasi input server-side | Ya | zod di `src/lib/catalogue/validation.ts` |
| 6 | SQLi / XSS / open redirect / akses rusak / SSRF | Ya | Query terparameter (Drizzle); React escaping; `safeReturnPath`; allowlist URL; portal tidak melakukan fetch ke URL katalog. Satu-satunya fetch keluar adalah feed berita dengan URL tetap di kode (`src/lib/news/sources.ts`), hanya https, redirect dibatasi ke host sumber, timeout 15 dtk, batas 3 MB. Isi feed diubah ke teks biasa; tautan artikel harus berada di host sumber. Foto berita KINRA diambil lewat WP REST situs KINRA dengan aturan fetch yang sama (maks. 1 MB, tipe dicek dari magic bytes, tanpa SVG) dan disajikan dari origin portal (`/api/news/[id]/image`, wajib login) sehingga CSP `img-src 'self'` tetap |
| 7 | Rate limit endpoint sensitif | Sebagian | Login, mock-login, launch. In-memory per instance |
| 8 | MFA | Didelegasikan | Ditegakkan di IdP. Belum ada pemeriksaan klaim `amr`/`acr` untuk admin |
| 9 | Secret di luar kode | Ya | `.env.example` tanpa nilai rahasia, `.env*` di `.gitignore` |
| 10 | Pemindaian dependensi | Belum | Tambahkan `pnpm audit` / Dependabot / scanner KINRA di CI |
| 11 | Log audit terlindungi | Ya | Trigger append-only; viewer hanya admin/auditor KINRA |
| 12 | Minimisasi data | Ya | Audit hanya ID, tipe, hasil; sanitizer meredaksi kunci/nilai sensitif |
| 13 | Isolasi tenant | Ya | Policy + SQL per org aktif; tes unit, integrasi, dan E2E negatif |
| 14 | Tidak ada data sensitif di URL/error | Ya | Error API generik + correlation ID; URL tujuan tidak diekspos ke API klien |
| 15 | Review keamanan & uji isolasi sebelum produksi | Belum | Wajib sebelum Fase 3 |
| 16 | Backup/DR | Belum | Bergantung pemilik hosting |
| 21 | Gambar berita pihak ketiga | Ya (dengan catatan) | Thumbnail media/pemerintah ditautkan langsung (hotlink), tidak disalin. CSP `img-src` hanya menambah host gambar yang ditetapkan di kode (`newsImageOrigins()`: cdn.antaranews.com, foto.kontan.co.id, pict.sindonews.com, setkab.go.id); URL divalidasi https + host persis. `referrerpolicy="no-referrer"` mencegah kebocoran halaman portal, tetapi IP dan user-agent pembaca tetap terlihat oleh CDN media. og:image Kontan dibaca server dari halaman artikel dengan aturan fetch yang sama |
| 18 | Isolasi pengumuman | Ya | Filter audiens/target di SQL + policy murni (`canViewAnnouncement`); detail & konfirmasi yang tidak berhak → 404 identik. Tes integrasi & E2E negatif lintas tenant |
| 19 | Konfirmasi baca tidak dapat dipalsukan | Ya | Identitas hanya dari sesi; tabel `announcement_acks` append-only (trigger DB) |
| 20 | Data API Supabase (PostgREST) | Ya (migrasi 0005) | Sebelumnya role `anon`/`authenticated` di stack Supabase lokal punya CRUD penuh atas semua tabel publik tanpa RLS (termasuk menyisipkan baris audit palsu). Migrasi 0005 mengaktifkan RLS tanpa policy di semua tabel; koneksi portal (pemilik tabel) tidak terpengaruh. Bila produksi memakai Supabase, verifikasi ulang dan pertimbangkan menonaktifkan Data API |
| 17 | Cache PWA tidak menyimpan data pengguna | Ya | `/sw.js` hanya cache aset statis + halaman offline; HTML, API, `/launch` selalu dari jaringan. E2E menguji offline tanpa konten ber-login |

## Keterbatasan yang diketahui

1. **Autentikasi produksi belum diuji** terhadap IdP nyata. Alur OIDC diuji hanya untuk
   kegagalan discovery (AT-14). PoC ZITADEL/Keycloak diperlukan.
2. **AT-05 (SSO tanpa prompt kedua)** tidak dapat dibuktikan tanpa aplikasi tujuan yang
   terintegrasi. Portal hanya menjamin pengalihan ke URL yang disetujui.
3. `style-src 'unsafe-inline'` diizinkan untuk kompatibilitas Next.js; skrip tetap dikunci nonce.
4. Pencabutan keanggotaan di IdP berlaku setelah sesi berakhir (maks. `SESSION_MAX_AGE_SECONDS`).
   Pencabutan hak akses aplikasi di portal berlaku seketika.
5. Rate limit dan deduplikasi peristiwa "denied" bersifat in-memory per instance.
6. Tidak ada pemeriksaan MFA (`amr`) di sisi portal untuk peran admin.
7. Tidak ada tabel sesi sehingga tidak ada fitur "paksa logout pengguna X".
8. Admin dapat memberi hak akses aplikasi ke organisasi + peran. Pemisahan tugas
   (persetujuan dua pihak) belum ada dan perlu diputuskan KINRA.
9. Penegakan `environment` mengandalkan `APP_ENV` yang benar di tiap lingkungan.
10. Logo dan warna resmi KINRA belum tersedia; UI memakai wordmark teks dan palet netral sementara.
11. Pengelolaan konten (pengumuman, berita) hanya untuk `portal_admin`. Belum ada pemisahan peran
    penyusun/penerbit maupun persetujuan dua pihak untuk pengumuman resmi (DECISIONS A-17).
12. Throttle sinkronisasi berita (1 menit) dibaca dari DB, bukan kunci terdistribusi; dua pemicu
    yang benar-benar bersamaan dapat berjalan ganda (aman karena upsert idempoten).
13. Pengumuman berisi teks biasa; lampiran belum didukung (belum ada object storage).
11. WCAG 2.1 AA diterapkan secara praktis (HTML semantik, label, fokus terlihat, skip link)
    tetapi belum diaudit formal.
12. Belum ada uji beban.
