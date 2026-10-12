# Keputusan yang Memerlukan Persetujuan KINRA vs Asumsi Implementasi

## A. Keputusan yang menunggu persetujuan (belum dibuat oleh tim pengembang)

| # | Butir | Status saat ini di kode | Tindakan yang dibutuhkan |
| --- | --- | --- | --- |
| 1 | Hostname portal (`one.kinra.co.id`) | Tidak dikonfigurasi; `PORTAL_BASE_URL` per lingkungan | Verifikasi kepemilikan domain, DNS, TLS |
| 2 | Vendor IAM (ZITADEL vs Keycloak) | Adapter OIDC generik + pemetaan klaim ZITADEL/generic | PoC dan review arsitektur/keamanan |
| 3 | Hosting produksi | Dockerfile hosting-agnostik | Tetapkan lingkungan, residensi data, backup, DR |
| 4 | Sumber kebenaran pengguna & organisasi | IdP; portal hanya memetakan ID organisasi | Tetapkan pemilik & sinkronisasi; proses pendaftaran organisasi |
| 5 | Kunci peran & pemetaan ke peran logis | Konvensi: `employee`, `executive`, `marketing`, `finance`, `hr`, `estate_ops`, `it_staff`, `portal_admin`, `auditor`, `tenant_admin`, `tenant_user` | Setujui katalog peran di IAM |
| 6 | MFA untuk admin | Didelegasikan ke IdP | Tetapkan baseline; putuskan apakah portal memeriksa `amr`/`acr` |
| 7 | Masa sesi | 8 jam absolut | Setujui sesuai kebijakan keamanan |
| 8 | Retensi audit & akses log | Tidak ada purge otomatis | Tetapkan masa retensi dan pihak yang berwenang |
| 9 | Siapa yang boleh memberi hak akses aplikasi | `portal_admin` saja, tanpa persetujuan kedua | Putuskan perlu/tidaknya alur persetujuan |
| 10 | Admin tenant swalayan | Tidak diaktifkan (peran `tenant_admin` hanya kunci entitlement) | Persetujuan tata kelola bila ingin diaktifkan |
| 11 | Target ketersediaan 99,5% | Belum diukur | Setujui berdasarkan kekritisan & hosting |
| 12 | Branding resmi | Wordmark teks + palet netral sementara | Serahkan logo dan design token resmi |
| 13 | Aplikasi pilot pertama | Data demo simulasi end state dari draf RSTI 2026–2030 | Tetapkan aplikasi nyata, pemilik, dan URL |
| 16 | Ikon aplikasi PWA | Logo resmi 196×87 px ditempatkan utuh di kanvas putih (agak buram di 512 px) | Serahkan ikon aplikasi persegi resolusi tinggi (≥ 1024 px) dan versi maskable |
| 15 | Pemetaan peran ke aplikasi pada katalog demo | Disusun dari pemilik inisiatif RSTI (Bab 14), belum divalidasi divisi | Validasi oleh pemilik bisnis tiap aplikasi |
| 14 | Daftar host aplikasi yang diizinkan | `*.kinra.example` (demo) | Tetapkan allowlist per lingkungan |
| 17 | Peran pengelola konten & persetujuan pengumuman resmi | Hanya `portal_admin` (konteks KINRA) yang boleh membuat, menerbitkan, dan menarik | Tetapkan peran IAM terpisah (mis. `content_editor`, `content_publisher`) dan perlu/tidaknya persetujuan kedua untuk pengumuman Direksi/kritis |
| 18 | Sumber berita & hak cipta | Feed RSS: seimangkeisez.com, SINDOnews Ekbis, Kontan Industri, ANTARA Ekonomi, Sekretariat Kabinet, ANTARA Sumut (robots.txt diperiksa 2026-10-11). Prioritas pemantauan (arahan 2026-10-11): investasi, infrastruktur & utilitas, regulasi KEK, risiko & keselamatan kawasan; berita eksternal hanya diambil bila cocok dengan salah satu prioritas atau menyebut kawasan/KEK (`src/lib/news/topics.ts`). kek.go.id, BKPM, ESDM belum punya feed yang dapat dibaca. Hanya judul, cuplikan ≤ 280 karakter, dan tautan; tanpa teks penuh. Foto berita KINRA disalin dari situs KINRA sendiri; foto berita media/pemerintah ditautkan langsung dari CDN penerbit tanpa disalin (dipilih 2026-10-11), dengan sampul generatif per topik sebagai cadangan. Mintalah konfirmasi Legal/Sekper bila penerbit keberatan; host dapat dicabut per sumber (`imageHosts`). Feed Kemenperin tidak dipakai karena tidak diperbarui sejak 2023 | Tetapkan daftar media yang disetujui Sekretariat Perusahaan/Legal; pertimbangkan izin atau langganan resmi |
| 19 | Retensi data konfirmasi baca | Disimpan tanpa batas (append-only), memuat nama tampilan pengguna | Tetapkan masa retensi dan pihak yang boleh melihat daftar konfirmasi |

## B. Asumsi yang diambil tim pengembang (dapat diubah)

1. Repositori baru karena folder hanya berisi PRD.
2. Stack sesuai PRD §9.2: Next.js App Router, TypeScript strict, Tailwind, PostgreSQL, Drizzle.
3. Organisasi KINRA dibedakan dari tenant melalui kolom `org_type` di tabel pemetaan portal.
4. Hak akses aplikasi dikelola portal (bukan IAM) karena IAM belum dipilih. Bila IAM
   kelak mengelola entitlement aplikasi, tabel ini dapat diganti adapter tanpa mengubah UI.
5. Aplikasi berstatus `planned`/`maintenance` tetap terlihat (dengan status jelas) tetapi tidak dapat dibuka.
   `retired` disembunyikan dari pengguna biasa.
6. Aplikasi hanya tampil di portal dengan `environment` yang sama dengan `APP_ENV`.
7. Peluncuran membuka tab baru (`noopener noreferrer`).
8. Port lokal 3100 (port 3000 sudah dipakai aplikasi lain di mesin pengembang).
9. Bahasa UI: Bahasa Indonesia, zona waktu tampilan WIB.
10. Katalog demo memakai draf RSTI 2026–2030 dan menggambarkan target 2030, bukan kondisi saat ini.
    Dokumen RSTI masih draf; bila berubah, perbarui `scripts/catalogue-rsti.ts`.
11. Pengumuman: waktu dimasukkan dan ditampilkan dalam WIB. Perubahan judul/ringkasan/isi/wajib-konfirmasi
    setelah terbit membuat versi baru dan meminta konfirmasi ulang. Pengumuman tidak pernah dihapus, hanya ditarik.
12. Berita eksternal disaring berdasarkan topik prioritas KINRA (regulasi wajib berkonteks ekonomi/kawasan; berita emas/saham, olahraga, gawai dikecualikan) dan disimpan 120 hari; berita resmi KINRA disimpan
    tanpa batas. Admin dapat menyembunyikan berita yang tidak relevan.
