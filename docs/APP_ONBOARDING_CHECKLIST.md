# Checklist Onboarding Aplikasi ke OneSeiMangkeiSEZ

Gunakan untuk setiap aplikasi baru (PRD §13.2, §14). Entri katalog **tidak** berarti
integrasi SSO atau API sudah selesai.

## A. Tata kelola
- [ ] Pemilik bisnis/layanan ditetapkan (nama + unit)
- [ ] Pemilik teknis ditetapkan
- [ ] Kontak/jalur dukungan tersedia dan diuji
- [ ] Klasifikasi data dan tingkat kekritisan layanan ditetapkan
- [ ] Persetujuan onboarding tercatat (tiket/ID permintaan)

## B. Teknis
- [ ] URL tujuan per lingkungan (production / staging / development)
- [ ] Host URL disetujui dan ditambahkan ke `APP_URL_ALLOWED_HOSTS` lingkungan terkait
- [ ] Hanya `https://`, tanpa kredensial di URL
- [ ] Metode autentikasi: OIDC SSO / SAML SSO / login di aplikasi / tautan eksternal
- [ ] Bila SSO: klien terdaftar di IAM, klaim/peran yang dibutuhkan didokumentasikan
- [ ] Bila SSO: login tanpa prompt kedua **diuji** (AT-05) sebelum mode diset `oidc_sso`/`saml_sso`
- [ ] Perilaku logout diuji dan didokumentasikan (single logout tidak diasumsikan)
- [ ] Model isolasi tenant aplikasi tujuan dipahami (untuk aplikasi tenant)
- [ ] Endpoint kesehatan (opsional; belum ditampilkan portal)

## C. Konfigurasi di portal
- [ ] Buat entri di `/admin/applications/new` dengan status **Direncanakan**
- [ ] Isi kategori, audiens, mode integrasi, lingkungan, pemilik, kontak dukungan
- [ ] Tambah hak akses: organisasi + kunci peran IdP (prinsip least privilege)
- [ ] Verifikasi di staging dengan akun uji: terlihat oleh yang berhak, tidak oleh yang lain
- [ ] Ubah status ke **Pilot** lalu **Tersedia** setelah persetujuan
- [ ] Cek jejak audit untuk perubahan di atas

## D. Pasca go-live
- [ ] Peninjauan hak akses berkala dijadwalkan
- [ ] Prosedur pensiun: ubah status ke **Dipensiunkan** (soft retire, riwayat audit tetap)
