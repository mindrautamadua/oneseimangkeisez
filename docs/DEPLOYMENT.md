# Deployment dan Rollback

> Jangan deploy ke produksi, mengubah DNS, atau mengubah IAM produksi tanpa otorisasi
> tertulis KINRA (PRD §19.12). Lingkungan hosting belum ditetapkan.

## Prasyarat lingkungan

1. PostgreSQL 15+ dengan backup terjadwal dan uji restore.
2. Klien OIDC terdaftar di IAM (dev/staging/production terpisah).
3. Reverse proxy / load balancer dengan TLS, meneruskan `X-Forwarded-For`.
4. Secret store untuk `SESSION_SECRET`, `DATABASE_URL`, `OIDC_CLIENT_SECRET`.
5. Penampung log terstruktur (stdout JSON) dan pemantauan uptime pada `/api/health`.

## Variabel wajib produksi

```
APP_ENV=production
PORTAL_BASE_URL=https://one.kinra.co.id       # usulan, verifikasi DNS dahulu
DATABASE_URL=...
SESSION_SECRET=...                             # ≥ 32 karakter acak, rotasi per kebijakan
AUTH_PROVIDER=oidc
OIDC_ISSUER=... OIDC_CLIENT_ID=... [OIDC_CLIENT_SECRET=...]
APP_URL_ALLOWED_HOSTS=...                      # daftar host aplikasi yang disetujui
APP_URL_ALLOW_HTTP=false
```

Aplikasi gagal start dengan pesan jelas bila konfigurasi tidak valid atau mock diaktifkan di produksi.

## Langkah deployment

```bash
# 1. Build image bertag versi
docker build --target runtime -t onekinra:<versi> .
docker build --target migrate -t onekinra-migrate:<versi> .

# 2. Backup database sebelum migrasi
pg_dump "$DATABASE_URL" -Fc -f onekinra-<versi>-pre.dump

# 3. Terapkan migrasi (job sekali jalan)
docker run --rm -e DATABASE_URL="$DATABASE_URL" onekinra-migrate:<versi>

# 4. Jalankan versi baru, tunggu /api/health = 200, lalu alihkan trafik
docker run -d -p 3000:3000 --env-file <secret-file> onekinra:<versi>
curl -f https://<host>/api/health
```

Jangan jalankan `pnpm db:seed` di produksi (skrip menolak bila `APP_ENV=production`).
Data katalog produksi dimasukkan melalui UI admin sesuai proses onboarding.

## PWA

- Set `APP_BUILD_ID` (mis. git SHA) saat build agar setiap rilis punya ID unik; tanpa itu dipakai stempel waktu build.
  Semua instance dalam satu rilis harus memakai build yang sama (ID sama).
- `/sw.js` dan `/api/version` dikirim dengan `Cache-Control: no-cache/no-store`. Pastikan reverse proxy/CDN
  **tidak** meng-cache keduanya, atau klien tidak akan mendeteksi versi baru.
- Service worker dan instalasi PWA hanya berfungsi di HTTPS (atau `localhost`).
- Rollback = deploy ulang build lama. Build ID-nya berbeda dari yang sedang berjalan sehingga klien
  juga otomatis kembali ke versi tersebut.

## Smoke test pasca-deploy

1. `/api/health` → 200 `{"status":"ok"}`.
2. Login via IdP dengan akun uji internal, lalu akun uji tenant.
3. Pastikan workspace dan katalog sesuai hak akses; buka satu aplikasi.
4. Cek `/admin/audit`: peristiwa `auth.login` dan `app.launch` tercatat.
5. Cek header respons: `Content-Security-Policy`, `Strict-Transport-Security`.
6. `/api/version` menampilkan build ID rilis baru; aplikasi terpasang memperbarui diri dalam ≤ 5 menit.

## Rollback

1. Alihkan trafik ke image versi sebelumnya (`onekinra:<versi-lama>`). Image lama tetap disimpan.
2. Migrasi dirancang aditif. Bila versi baru memuat migrasi yang tidak kompatibel ke belakang,
   pulihkan backup langkah 2:
   ```bash
   pg_restore --clean --if-exists -d "$DATABASE_URL" onekinra-<versi>-pre.dump
   ```
   Catatan: trigger append-only pada `audit_events` harus dinonaktifkan sementara oleh
   peran DB pemeliharaan untuk restore penuh, dan tindakan ini wajib dicatat.
3. Verifikasi `/api/health` dan smoke test.
4. Bila `SESSION_SECRET` dirotasi, semua pengguna harus login ulang (perilaku yang diharapkan).

## Operasional

- **Log:** JSON satu baris per peristiwa ke stdout/stderr, tanpa rahasia.
- **Health:** `/api/live` (proses hidup), `/api/health` (DB terhubung). Kesehatan aplikasi
  tujuan tidak dilaporkan karena belum ada sumber status tepercaya.
- **Skala horizontal:** sesi stateless sehingga aman dijalankan multi-instance.
  Rate limiter dan deduplikasi audit bersifat in-memory per instance; gunakan
  rate limiting di reverse proxy/WAF untuk multi-instance.
- **Berita:** jadwalkan `curl -fsS -X POST -H "Authorization: Bearer $NEWS_SYNC_TOKEN" https://<portal>/api/internal/news-sync`
  (mis. tiap 30 menit). Server membutuhkan akses HTTPS keluar ke host feed di `src/lib/news/sources.ts`.
  Tanpa `NEWS_SYNC_TOKEN` endpoint mengembalikan 404 dan berita hanya diperbarui manual dari `/admin/news`.
- **Retensi audit:** belum ditetapkan (lihat DECISIONS.md). Purge dilakukan oleh peran DB
  pemeliharaan, bukan oleh peran aplikasi.
