# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sistem Informasi Kondisi Jaringan Irigasi — Daerah Irigasi Kali Wening

**Versi dokumen:** 1.0  
**Tanggal:** 18 November 2026  
**Status:** Baseline kebutuhan pengembangan  
**Jenis produk:** Web application + REST API + spatial data processing  
**Dokumen sumber utama:** Tugas Seleksi Full Stack Developer: Kondisi Jaringan Irigasi (8 halaman)  
**Catatan:** Seluruh data DI Kali Wening dalam tugas dinyatakan fiktif.

---

## 1. Ringkasan Eksekutif

Sistem Informasi Kondisi Jaringan Irigasi DI Kali Wening adalah aplikasi web untuk mengintegrasikan inventaris bangunan irigasi, laporan penelusuran lapangan, ruas saluran, dan petak tersier menjadi satu gambaran kondisi jaringan. Sistem membantu petugas memahami kondisi terkini aset, melihat riwayat kerusakan, mengidentifikasi petak tersier yang terdampak apabila bangunan tidak berfungsi, menyusun prioritas pemeliharaan, serta menilai kualitas data sumber.

Produk tidak boleh sekadar menampilkan data mentah. Sistem wajib melakukan normalisasi, validasi, koreksi yang dapat dibuktikan, penandaan anomali, deduplikasi, pencocokan laporan dengan aset, pemrosesan koordinat dan geometri, serta mencatat keputusan pemrosesan secara dapat diaudit. Data sumber tidak boleh diubah secara manual atau ditimpa.

Keberhasilan produk terutama ditentukan oleh kemampuan menjalankan aplikasi melalui Docker Compose, mematuhi kontrak API, memproses data baru yang berbeda secara otomatis, menghasilkan perhitungan spasial dan prioritas yang benar, serta mengimpor laporan susulan secara idempoten.

## 2. Latar Belakang dan Permasalahan

DI Kali Wening memiliki satu bendung, satu saluran primer, beberapa saluran sekunder, dan petak tersier. Informasi aset berasal dari beberapa sumber yang dibuat oleh orang dan alat berbeda. Akibatnya:
- Nomenklatur, nama, jenis bangunan, kondisi, tanggal, angka, dan satuan tidak konsisten.
- Koordinat dapat berupa WGS84 atau UTM zona 49S (EPSG:32749), tanpa penanda per baris.
- Lintang dan bujur dapat tertukar.
- Geometri dapat kosong, tidak valid, duplikat, atau tidak terhubung.
- Sebagian laporan tidak menyebut aset yang valid.
- Data dapat mengandung duplikasi dan konflik antar sumber.

Tanpa integrasi dan aturan pemrosesan yang konsisten, petugas sulit mengetahui kondisi aset terkini, dampak gangguan terhadap area layanan, dan urutan pemeliharaan yang paling bermanfaat.

## 3. Tujuan Produk

1. Menghasilkan satu basis data terintegrasi untuk aset, laporan, saluran, dan petak tersier.
2. Menstandarkan atribut dan geometri sesuai aturan tugas.
3. Mempertahankan data bermasalah yang masih berguna dengan tanda kualitas data, serta membuang duplikasi sesuai aturan.
4. Menentukan kondisi terkini setiap aset berdasarkan sumber bertanggal paling baru.
5. Menghitung petak dan luas layanan yang terdampak di hilir setiap bangunan.
6. Menghitung prioritas pemeliharaan secara deterministik dan dapat dijelaskan.
7. Menyediakan peta jaringan, detail aset, rekap saluran, prioritas, dan kualitas data.
8. Mendukung impor laporan susulan yang aman diulang.
9. Menyediakan API JSON dengan kontrak yang stabil untuk pengujian otomatis dan integrasi frontend.

## 4. Bukan Tujuan (Out of Scope)

- Pengendalian pintu air atau telemetri perangkat lapangan secara real-time.
- Prediksi kerusakan berbasis machine learning.
- Penganggaran biaya konstruksi atau pengadaan.
- Aplikasi mobile native.
- Autentikasi multi-peran kompleks, kecuali ditambahkan sebagai kebutuhan operasional di luar kontrak seleksi.
- Integrasi layanan peta atau geocoding berbayar.
- Mengubah atau memperbaiki file sumber secara langsung.
- Menyimpulkan kondisi fisik yang tidak didukung inventaris atau laporan.

## 5. Pengguna dan Hak Akses

### 5.1 Persona utama
- **Petugas pemeliharaan/juru:** melihat peta, kondisi bangunan, riwayat laporan, tanda anomali, dampak hilir, dan prioritas.
- **Pengamat/koordinator:** memeriksa daftar prioritas, membandingkan kondisi antar saluran, dan meninjau data susulan.
- **Administrator data:** menjalankan atau memantau impor, memeriksa temuan kualitas data, serta meninjau jejak tindakan pembersihan.
- **Penguji/integrator:** memanggil API dan memverifikasi hasil menggunakan dataset pengganti.

### 5.2 Hak akses baseline
Dokumen seleksi tidak menetapkan mekanisme login atau matriks otorisasi. Untuk baseline seleksi, aplikasi dapat berjalan tanpa akun agar pengujian otomatis tidak terhalang. Endpoint impor susulan tetap harus dibatasi pada lingkungan yang dipercaya bila aplikasi dipakai di luar konteks seleksi. Autentikasi/otorisasi produksi merupakan keputusan lanjutan dan tidak boleh mengubah kontrak endpoint yang diwajibkan.

## 6. Ruang Lingkup Fungsional

| ID | Modul | Deskripsi | Prioritas |
|---|---|---|---|
| FR-001 | Bootstrap & health | Menjalankan layanan dan melaporkan status impor | Must |
| FR-002 | Impor data awal | Membaca lima sumber yang relevan sesuai ketentuan; laporan susulan ditunda | Must |
| FR-003 | Normalisasi | Menstandarkan nomenklatur, kondisi, jenis, tanggal, angka, koordinat, dan satuan | Must |
| FR-004 | Validasi geospasial | Memvalidasi, mengonversi, memperbaiki, dan memberi tanda geometri | Must |
| FR-005 | Deduplikasi | Menangani aset, ruas, petak, dan laporan ganda | Must |
| FR-006 | Entity matching | Mencocokkan laporan ke aset | Must |
| FR-007 | Kondisi terkini | Menentukan kondisi aset berdasarkan tanggal sumber | Must |
| FR-008 | Analisis hilir | Menentukan petak terdampak dan luas terdampak | Must |
| FR-009 | Prioritas | Menghitung skor dan urutan pemeliharaan | Must |
| FR-010 | Rekap saluran | Menghitung panjang ruas menurut tingkat dan kondisi | Must |
| FR-011 | Kualitas data | Menyajikan jumlah dan rincian tindakan kualitas data | Must |
| FR-012 | Peta jaringan | Menampilkan saluran, bangunan, petak, legenda, dan highlight dampak | Must |
| FR-013 | Detail aset | Menampilkan atribut, kondisi, tanda, dan seluruh riwayat laporan | Must |
| FR-014 | Impor susulan | Menambah, memperbarui, membatalkan laporan secara idempoten | Must |
| FR-015 | Observabilitas & pengujian | Log impor, unit test, integration test, dan README | Must |

## 7. Sumber Data dan Profil Dataset

### 7.1 Sumber yang disediakan
| File | Format | Isi | Kolom/properti utama |
|---|---|---|---|
| `aset_bangunan.csv` | CSV | Inventaris bangunan (titik) | `kode_aset`, `nomenklatur`, `jenis`, `nama_saluran`, `x`, `y`, `kondisi`, `tahun_bangun`, `tgl_update` |
| `laporan_penelusuran.xlsx` | XLSX | Laporan kerusakan juru | `id_laporan`, `tanggal`, `petugas`, `nomenklatur`, `jenis_kerusakan`, `kondisi`, `lat`, `lon`, `status`, `keterangan` |
| `saluran.geojson` | GeoJSON | Ruas saluran (garis) | `id_ruas`, `nama_saluran`, `tingkat`, `kondisi` |
| `petak_tersier.geojson` | GeoJSON | Petak tersier (poligon) | `kode_petak`, `nama_petak`, `luas_baku`, `nomenklatur_sadap` |
| `laporan_susulan.xlsx` | XLSX | Periode laporan berikutnya | Sama dengan laporan penelusuran; hanya diimpor melalui endpoint susulan |

### 7.2 Profil aktual file yang diperiksa
Profil berikut menggambarkan file yang dilampirkan saat penyusunan PRD, bukan nilai tetap yang boleh di-hardcode:
- Inventaris: 61 baris; 56 nilai `kode_aset` unik; 2 nilai koordinat x/y kosong; format koordinat, kondisi, jenis, dan tanggal bervariasi.
- Laporan awal: 71 baris; 71 `id_laporan` unik; 5 nomenklatur kosong; 37 baris memiliki koordinat lat/lon kosong; tanggal, status, kondisi, dan format koordinat bervariasi.
- Laporan susulan: 25 baris; 25 `id_laporan` unik pada file susulan; terdapat campuran laporan baru/perubahan/pembatalan, koordinat kosong, dan koordinat dengan format berbeda.
- Saluran: 32 fitur LineString.
- Petak tersier: 47 fitur Polygon.
- Sampel GeoJSON menunjukkan saluran menggunakan koordinat menyerupai WGS84, sedangkan petak tersier menggunakan koordinat menyerupai UTM meter. Karena metadata CRS tidak seragam/tidak eksplisit, sistem harus mendeteksi CRS secara per fitur/geometry dan tidak mengasumsikan satu CRS global.

Profil ini hanya untuk membantu pengujian dan memahami kualitas data. Aplikasi wajib menghitung ulang dari isi folder `./data` setiap deployment/initial bootstrap.

## 8. Aturan Bisnis dan Pembersihan Data

Semua geometri disimpan dan disajikan dalam WGS84 (EPSG:4326). Perhitungan panjang dan luas dilakukan dalam UTM zona 49S (EPSG:32749). Setiap tindakan perbaikan, penandaan, atau pembuangan wajib dicatat.

### 8.1 Normalisasi nomenklatur
- Bentuk kanonis: `B.KW.1`, huruf besar, pemisah titik.
- Huruf akhiran juga kapital, contoh `B.KW.6A`.
- Normalisasi harus mengatasi variasi spasi, tanda hubung, underscore, titik, dan kapitalisasi.
- Jangan mengarang kode jika pemetaan tidak dapat ditentukan secara deterministik.
- Simpan nilai sumber mentah untuk audit dan nilai kanonis untuk pencocokan.

### 8.2 Normalisasi kondisi
Nilai kanonis yang diizinkan:
- `baik`
- `rusak_ringan`
- `rusak_sedang`
- `rusak_berat`

Variasi seperti `RR`, `RS`, `RB`, `BAIK`, spasi berulang, tanda hubung, dan variasi kapitalisasi dinormalisasi ke empat nilai tersebut. Nilai yang tidak dapat dipetakan harus dicatat sebagai anomali; jangan diam-diam menganggapnya baik.

### 8.3 Normalisasi jenis bangunan
Nilai API yang sah:
- `bendung`
- `bangunan_bagi`
- `bangunan_sadap`
- `bangunan_bagi_sadap`
- `bangunan_pelengkap`

Jenis pelengkap seperti gorong-gorong, talang, siphon, dan terjunan dipetakan ke `bangunan_pelengkap`. Normalisasi dilakukan berdasarkan kamus kategori dan variasi penulisan, bukan berdasarkan nomor baris atau nilai khusus dataset.

### 8.4 Tanggal dan angka
- Tanggal disimpan sebagai `YYYY-MM-DD`.
- Format tanggal ambigu dibaca dengan urutan hari terlebih dahulu.
- Angka dengan koma desimal dibaca sebagai angka desimal.
- Nilai yang tidak dapat diparse tidak boleh diam-diam diubah menjadi nol; catat sebagai temuan dan terapkan kebijakan fallback yang aman.

### 8.5 Koordinat dan CRS
- Koordinat dapat berupa WGS84 (derajat) atau UTM 49S EPSG:32749 (meter).
- Deteksi berdasarkan rentang dan validitas koordinat, bukan berdasarkan nama file atau urutan baris.
- UTM 49S dikonversi ke WGS84.
- Jika lat/lon tertukar, koreksi bila rentang dan lokasi hasil konversi/validasi menunjukkan pertukaran secara meyakinkan.
- Koordinat kosong, (0,0), tidak masuk rentang valid, atau berjarak lebih dari 2 km dari saluran terdekat setelah koreksi: simpan aset tanpa geometri dan beri tanda `koordinat_tidak_valid`.
- Untuk laporan, koordinat kosong tidak otomatis menghapus laporan; pencocokan nomenklatur masih dapat dilakukan.
- Semua geometri yang disimpan dan dikirim API menggunakan EPSG:4326.

### 8.6 Keterkaitan bangunan dengan saluran
- Bangunan lebih dari 50 m dari saluran mana pun tetap disimpan.
- Beri tanda `jauh_dari_saluran`.
- Bangunan tersebut tidak disertakan dalam analisis dampak hilir.
- Jarak dihitung dalam meter pada EPSG:32749.

### 8.7 Deduplikasi aset
- Kunci duplikasi: `kode_aset`.
- Pertahankan baris dengan `tgl_update` paling baru.
- Baris yang dibuang dicatat sebagai temuan `aset_ganda`.
- Jika tanggal sama, implementasi harus menggunakan tie-break deterministik dan mendokumentasikannya; jangan memilih secara acak.

### 8.8 Deduplikasi saluran
- Ruas dengan geometri sama disimpan satu.
- Perbandingan geometri harus mengabaikan arah digitasi garis (koordinat maju/mundur) dan toleransi representasi numerik yang wajar.
- Catat fitur duplikat sebagai `ruas_ganda`.

### 8.9 Konektivitas ruas
- Untuk pembersihan/topologi jaringan, celah antarujuang ruas tidak lebih dari 5 m dianggap tersambung.
- Untuk analisis dampak hilir, ketentuan tugas menyebut ruas dianggap tersambung bila ujungnya tidak lebih dari 10 m. Terapkan toleransi sesuai konteks masing-masing dan jangan menyamakan kedua ambang ini.
- Arah digitasi garis tidak dapat diandalkan sebagai arah aliran.

### 8.10 Poligon petak
- Poligon tidak valid harus diperbaiki dengan operasi geometri yang valid dan hasilnya diverifikasi.
- Petak dengan `kode_petak` sama disimpan satu; catat `petak_ganda`.
- `luas_baku` semestinya hektare; nilai yang diketahui dalam m² dikonversi menjadi hektare.
- Hitung luas geometri dalam EPSG:32749.
- Jika luas atribut setelah konversi berbeda lebih dari 20% terhadap luas geometri, gunakan luas geometri dan beri tanda `luas_tidak_wajar`.
- Luas hasil API dinyatakan hektare.

### 8.11 Deduplikasi laporan
- Laporan ganda didefinisikan sebagai aset, tanggal, dan kondisi sama.
- Simpan satu dan catat duplikasi sebagai `laporan_ganda`.
- Seluruh laporan yang cocok dengan aset, termasuk status `batal`, tetap tersedia dalam riwayat aset.
- Hanya laporan berstatus aktif yang dapat memengaruhi kondisi terkini.

### 8.12 Pencocokan laporan ke aset
Urutan:
1. Cocokkan nomenklatur laporan yang telah dinormalisasi dengan nomenklatur aset.
2. Jika nomenklatur kosong/tidak dikenal, cocokkan ke bangunan terdekat dalam radius 30 m dari koordinat laporan.
3. Jika tetap tidak cocok, simpan laporan dengan tanda `laporan_tanpa_aset`.
4. Simpan metode pencocokan dan jarak untuk audit.

### 8.13 Kondisi terkini aset
- Bandingkan `tgl_update` inventaris dengan tanggal laporan berstatus aktif yang cocok.
- Sumber bertanggal paling baru menjadi kondisi terkini.
- Jika tanggal sama, laporan yang dipakai.
- Laporan batal tidak memengaruhi kondisi terkini.
- `tgl_kondisi` adalah tanggal sumber yang menghasilkan kondisi terkini.
- Riwayat pada detail aset tetap memuat semua laporan yang cocok, termasuk batal.

### 8.14 Temuan kualitas data wajib
Kategori minimum:
`koordinat_utm_dikonversi`, `koordinat_tertukar_dibetulkan`, `koordinat_tidak_valid`, `jauh_dari_saluran`, `aset_ganda`, `ruas_ganda`, `petak_ganda`, `geometri_diperbaiki`, `luas_tidak_wajar`, `laporan_ganda`, `laporan_tanpa_aset`.

Jumlah dihitung per baris/fitur yang diperbaiki, ditandai, atau dibuang dari semua berkas yang sudah diimpor. Sistem boleh menambahkan kategori lain. Setiap temuan minimal menyimpan sumber berkas, pengenal baris/fitur, kategori, masalah, tindakan, nilai sumber, nilai hasil bila relevan, dan waktu pemrosesan.

## 9. Analisis Spasial Dampak Hilir

### 9.1 Tujuan
Menentukan semua petak tersier yang jalur airnya dari bendung melewati bangunan X, termasuk petak yang disadap tepat pada bangunan X, serta total luas petak tersebut.

### 9.2 Aturan jaringan
1. Posisi bangunan pada jaringan adalah titik terdekat pada saluran, hanya untuk bangunan dengan jarak maksimal 50 m.
2. Bangunan tanpa geometri atau bertanda `jauh_dari_saluran` tidak memiliki posisi jaringan; luas dampak = 0.
3. Ruas saluran dianggap tersambung untuk analisis ini bila ujung berjarak maksimal 10 m.
4. Arah aliran diturunkan dari bendung ke hilir, bukan dari arah koordinat garis.
5. Jaringan berbentuk pohon: tidak ada jalur melingkar.
6. Petak dilayani oleh bangunan pada `nomenklatur_sadap`.
7. Jika nomenklatur sadap kosong/tidak dikenal, cari bangunan sadap atau bagi-sadap terdekat dari batas petak, maksimal 200 m.
8. Jika tidak ada bangunan yang memenuhi, beri tanda petak `tanpa_sadap` dan jangan ikut dihitung.
9. Petak terdampak oleh X adalah semua petak yang jalur airnya dari bendung melewati X.
10. Luas terdampak = jumlah luas petak terdampak dalam hektare, dua angka desimal.

### 9.3 Strategi algoritmik yang disarankan
- Transformasikan seluruh geometri ke EPSG:32749 untuk operasi jarak/panjang/luas.
- Bangun graph node-edge dari ujung ruas; gabungkan endpoint dalam toleransi 10 m untuk analisis dampak.
- Identifikasi bendung sebagai sumber (root). Tentukan orientasi aliran dengan traversal graph dari root.
- Proyeksikan posisi bangunan ke edge terdekat yang valid (maksimum 50 m), simpan edge dan posisi sepanjang edge.
- Tentukan relasi predecessor/descendant pada graph berarah.
- Tentukan bangunan layanan tiap petak melalui nomenklatur sadap atau fallback nearest eligible building hingga 200 m dari batas petak.
- Untuk bangunan X, petak terdampak adalah petak yang titik sadap/layanan berada pada X atau pada node/edge descendant X di jalur aliran.
- Pastikan petak di hulu X tidak ikut terdampak.
- Jika data topologi ambigu/tidak membentuk pohon yang dapat diorientasikan, catat kualitas/topology warning dan gunakan strategi deterministik yang didokumentasikan; jangan menghasilkan dampak palsu secara diam-diam.

### 9.4 Output
`GET /api/aset/{kode_aset}/dampak` mengembalikan:
- `kode_aset`
- `jumlah_petak`
- `luas_terdampak_ha` (2 desimal)
- `petak`: array objek `{kode_petak, luas_ha}`

Bangunan tanpa posisi jaringan harus menghasilkan `jumlah_petak: 0`, `luas_terdampak_ha: 0`, dan array petak kosong.

## 10. Prioritas Pemeliharaan

### 10.1 Bobot kondisi
| Kondisi | Bobot |
|---|---:|
| `baik` | 0 |
| `rusak_ringan` | 1 |
| `rusak_sedang` | 2 |
| `rusak_berat` | 4 |

### 10.2 Formula
`skor = bobot_kondisi × luas_terdampak_ha`

- Hanya bangunan dengan skor > 0 yang ditampilkan.
- Urutkan skor terbesar ke terkecil.
- Jika skor sama, urutkan `kode_aset` secara alfabetis.
- `limit` opsional pada endpoint, default 20.
- Jangan memasukkan bangunan yang tidak punya posisi jaringan sebagai dampak positif; luasnya nol.
- Angka luas dan skor disajikan konsisten dengan presisi yang terdokumentasi.

## 11. Rekap Panjang Saluran

- Buang ruas duplikat terlebih dahulu.
- Hitung panjang geometri dalam EPSG:32749.
- Kelompokkan menurut `tingkat` dan `kondisi` yang sudah dinormalisasi.
- Konversi ke kilometer.
- Bulatkan `panjang_km` menjadi dua angka desimal.
- Nilai tingkat yang sah: `primer`, `sekunder`.
- Pastikan hasil tidak menghitung ruas yang sama lebih dari satu kali.

## 12. Kebutuhan Fungsional Terperinci

### FR-001 — Bootstrap dan health
**Deskripsi:** Seluruh aplikasi dapat dijalankan dengan satu perintah Docker Compose.

**Acceptance criteria:**
- `docker compose up --build` dari root repo menjalankan database, backend, dan frontend tanpa langkah manual.
- Web tersedia di `http://localhost:8080`.
- API tersedia di `http://localhost:8080/api`.
- `GET /api/health` mengembalikan `{"status":"memuat"}` selama impor berjalan dan `{"status":"siap"}` setelah selesai.
- Status siap dicapai paling lambat 10 menit sejak aplikasi dinyalakan.
- `GET /api/versi` mengembalikan `{"versi_kontrak":"1.2"}`.

### FR-002 — Impor awal
- Backend membaca folder `./data` saat bootstrap.
- Memproses inventaris, laporan penelusuran, saluran, dan petak.
- Tidak mengimpor `laporan_susulan.xlsx` saat startup.
- Impor harus tahan restart dan tidak menggandakan data.
- Semua tahapan impor dicatat; health tetap `memuat` sampai seluruh proses awal dan kalkulasi selesai.
- Jika sumber tidak ditemukan/rusak, status error harus tercatat dengan pesan diagnostik; jangan menyatakan siap dengan data parsial tanpa penanda.

### FR-003 — Daftar aset
- `GET /api/aset` mengembalikan `{"jumlah": <integer>, "data": [...]}`.
- Filter opsional: `jenis`, `kondisi`, `saluran`.
- Field objek minimal sesuai kontrak: `kode_aset`, `nomenklatur`, `jenis`, `nama_saluran`, `kondisi`, `tgl_kondisi`, `lon`, `lat`, `tanda`.
- Geometri kosong menggunakan `null` untuk `lon` dan `lat`.
- Nilai `jenis` harus salah satu kategori sah.

### FR-004 — Detail aset dan riwayat
- `GET /api/aset/{kode_aset}` menampilkan satu aset dan properti `riwayat`.
- `riwayat` berisi semua laporan yang cocok, termasuk status batal.
- Tampilkan kondisi terkini, tanggal kondisi, tanda kualitas, dan metadata sumber.
- Kode aset tidak ditemukan menghasilkan HTTP 404 dengan JSON error yang konsisten.

### FR-005 — Dampak
- `GET /api/aset/{kode_aset}/dampak` menghitung petak dan luas sesuai Bagian 9.
- Hasil dapat digunakan frontend untuk menyorot poligon petak.
- Aset tanpa posisi jaringan mengembalikan dampak nol.

### FR-006 — Rekap saluran
- `GET /api/rekap/saluran` mengembalikan array `data` dengan `tingkat`, `kondisi`, `panjang_km`.
- Perhitungan panjang memakai EPSG:32749 dan pembulatan dua desimal.

### FR-007 — Prioritas
- `GET /api/prioritas?limit=N`.
- Default limit 20.
- Setiap item memuat `peringkat`, `kode_aset`, `kondisi`, `luas_terdampak_ha`, `skor`.
- Hanya skor positif; urutan sesuai aturan bisnis.

### FR-008 — Kualitas data
- `GET /api/kualitas-data` mengembalikan jumlah per kategori.
- Kategori wajib tetap muncul meskipun jumlahnya nol.
- UI menyediakan daftar rincian temuan: sumber berkas, pengenal baris/fitur, masalah, tindakan.
- Penghitungan lintas semua sumber yang sudah diimpor.

### FR-009 — Impor susulan
- `POST /api/impor/susulan` memproses `laporan_susulan.xlsx`.
- File tidak diproses saat startup.
- `id_laporan` baru → tambah.
- `id_laporan` sudah ada dan isi berubah → ganti isi lama.
- `id_laporan` sudah ada dengan status batal → ubah status menjadi batal.
- Laporan batal tidak lagi berkontribusi pada kondisi terkini.
- Terapkan semua aturan normalisasi, matching, deduplikasi, dan audit yang relevan.
- Setelah impor, kondisi terkini, dampak, dan prioritas dihitung ulang.
- Endpoint idempoten: pemanggilan berkali-kali menghasilkan keadaan akhir sama dan tidak menggandakan data.
- Respons berbentuk `{"ditambah": n, "diubah": n, "dibatalkan": n, "tidak_berubah": n}`.
- Impor sebaiknya memakai transaksi database agar kegagalan tidak meninggalkan keadaan setengah ter-update.

## 13. Kontrak API

Semua endpoint mengembalikan JSON. Prefix API: `/api`.

| Method | Path | Kegunaan |
|---|---|---|
| GET | `/api/health` | Status impor |
| GET | `/api/versi` | Versi kontrak |
| GET | `/api/aset` | Daftar aset; filter `jenis`, `kondisi`, `saluran` |
| GET | `/api/aset/{kode_aset}` | Detail aset dan riwayat |
| GET | `/api/aset/{kode_aset}/dampak` | Petak terdampak |
| GET | `/api/rekap/saluran` | Panjang saluran per tingkat/kondisi |
| GET | `/api/prioritas` | Prioritas; query `limit`, default 20 |
| GET | `/api/kualitas-data` | Ringkasan dan rincian temuan |
| POST | `/api/impor/susulan` | Impor file laporan susulan |

### 13.1 Contoh respons aset
```json
{
  "kode_aset": "KW-0012",
  "nomenklatur": "B.KW.3",
  "jenis": "bangunan_bagi_sadap",
  "nama_saluran": "Primer Kali Wening",
  "kondisi": "rusak_sedang",
  "tgl_kondisi": "2026-08-14",
  "lon": 110.41235,
  "lat": -7.65412,
  "tanda": ["jauh_dari_saluran"]
}
```

### 13.2 Contoh respons dampak
```json
{
  "kode_aset": "KW-0012",
  "jumlah_petak": 7,
  "luas_terdampak_ha": 312.45,
  "petak": [
    {"kode_petak": "KW.3.Ki", "luas_ha": 41.2}
  ]
}
```

### 13.3 Contoh respons rekap saluran
```json
{
  "data": [
    {"tingkat": "sekunder", "kondisi": "rusak_berat", "panjang_km": 3.42}
  ]
}
```

### 13.4 Contoh respons prioritas
```json
{
  "data": [
    {
      "peringkat": 1,
      "kode_aset": "KW-0012",
      "kondisi": "rusak_berat",
      "luas_terdampak_ha": 312.45,
      "skor": 1249.8
    }
  ]
}
```

### 13.5 Contoh respons kualitas data
```json
{
  "data": [
    {"kategori": "koordinat_utm_dikonversi", "jumlah": 37}
  ]
}
```

### 13.6 Contoh respons impor susulan
```json
{
  "ditambah": 14,
  "diubah": 6,
  "dibatalkan": 3,
  "tidak_berubah": 0
}
```

### 13.7 Ketentuan API umum
- JSON UTF-8.
- Gunakan HTTP status yang tepat: 200 sukses, 400 input/query tidak valid, 404 resource tidak ada, 409 konflik keadaan impor bila relevan, 500 kesalahan tak terduga.
- Error response konsisten, misalnya `{"error":{"code":"...","message":"..."}}`.
- Jangan mengubah nama properti wajib atau bentuk respons yang dicontohkan.
- `GET /api/health` dan `/api/versi` harus tersedia selama proses bootstrap.
- Parameter `limit` harus divalidasi sebagai bilangan bulat positif; batas maksimum dapat diterapkan dan didokumentasikan tanpa mengubah default 20.

## 14. Kebutuhan UI/UX

Antarmuka dioptimalkan untuk petugas pemeliharaan: mudah dibaca, peta dominan, informasi operasional jelas, dan tidak memprioritaskan dekorasi dibanding kegunaan.

### 14.1 Struktur navigasi
1. Dashboard
2. Peta Jaringan
3. Data Bangunan
4. Prioritas Pemeliharaan
5. Rekap Saluran
6. Kualitas Data
7. Impor Data Susulan

### 14.2 Dashboard
- Ringkasan jumlah aset, kondisi, laporan aktif/batal, jumlah petak, dan total luas layanan jika dapat dihitung.
- Ringkasan prioritas tertinggi.
- Grafik distribusi kondisi bangunan.
- Grafik panjang saluran menurut tingkat dan kondisi.
- Status impor dan waktu pemrosesan terakhir.
- Semua angka berasal dari API/database, bukan angka statis.

### 14.3 Peta jaringan
- Menampilkan ruas saluran sebagai garis, bangunan sebagai titik, dan petak tersier sebagai poligon.
- Warna saluran berdasarkan kondisi.
- Simbol bangunan dibedakan menurut jenis.
- Petak dapat diberi gaya berbeda saat terdampak.
- Legenda wajib tersedia.
- Layer dapat dinyalakan/dimatikan.
- Klik bangunan membuka panel detail.
- Zoom ke aset dari daftar prioritas.
- Geometri invalid/tanpa koordinat tidak boleh menyebabkan peta gagal dirender.
- Peta menggunakan geometri WGS84; basemap tidak boleh mensyaratkan API key berbayar.

### 14.4 Detail bangunan
- Kode aset dan nomenklatur.
- Jenis dan nama saluran.
- Kondisi terkini dan tanggal sumber.
- Koordinat jika tersedia.
- Tanda kualitas data.
- Riwayat laporan lengkap termasuk batal.
- Tombol/aksi “Tampilkan dampak” untuk highlight petak terdampak dan total luas.
- Metode pencocokan laporan dapat ditampilkan untuk transparansi.

### 14.5 Prioritas pemeliharaan
- Daftar terurut berdasarkan skor.
- Kolom peringkat, kode aset, kondisi, luas terdampak, skor.
- Filter dan pencarian.
- Klik baris memusatkan peta ke aset.
- Penjelasan formula skor dapat diakses pengguna.

### 14.6 Rekap saluran
- Tabel tingkat, kondisi, panjang km.
- Total dapat ditampilkan sebagai ringkasan tambahan.
- Angka dua desimal.

### 14.7 Kualitas data
- Ringkasan jumlah temuan per kategori.
- Tabel detail: sumber berkas, pengenal baris/fitur, kategori, masalah, tindakan.
- Filter kategori dan sumber.
- Bedakan tindakan diperbaiki, ditandai, dan dibuang.
- Jangan menyembunyikan temuan hanya karena data masih dapat digunakan.

### 14.8 Impor susulan
- Aksi eksplisit untuk menjalankan impor.
- Tampilkan konfirmasi file sumber yang akan diproses.
- Tampilkan hasil jumlah ditambah/diubah/dibatalkan/tidak berubah.
- Tampilkan status sukses/gagal dan waktu proses.
- Hindari pemanggilan berulang yang tidak disengaja; backend tetap wajib idempoten.

### 14.9 Prinsip visual dan aksesibilitas
- Layout responsif desktop, tablet, dan mobile.
- Kontras warna memadai; kondisi tidak dibedakan hanya dengan warna, sertakan label/ikon.
- Tabel memiliki header jelas, sorting, empty state, loading state, dan error state.
- Peta memiliki legenda dan kontrol yang jelas.
- Format tanggal konsisten `DD MMM YYYY` pada UI; API tetap `YYYY-MM-DD`.
- Angka luas/panjang menampilkan satuan.
- Bahasa antarmuka utama: Bahasa Indonesia.

## 15. Model Data dan Database

Database relasional dengan dukungan geospasial direkomendasikan (misalnya PostgreSQL + PostGIS). Pilihan ini adalah rekomendasi implementasi; kontrak tugas tidak mewajibkan vendor database tertentu.

### 15.1 Entitas inti
**assets**
- `id` (PK)
- `kode_aset` (unique)
- `nomenklatur_raw`
- `nomenklatur_normalized`
- `jenis`
- `nama_saluran`
- `condition_inventory`
- `condition_current`
- `tgl_update`
- `tgl_kondisi`
- `tahun_bangun`
- `geom` (Point, SRID 4326, nullable)
- `lon`, `lat` (derived nullable)
- `created_at`, `updated_at`

**asset_tags**
- `id` (PK)
- `asset_id` (FK)
- `tag_code`
- `created_at`
- Unique gabungan `asset_id`, `tag_code` bila tag bersifat unik per aset.

**canals**
- `id` (PK)
- `id_ruas`
- `nama_saluran`
- `tingkat`
- `kondisi`
- `geom` (LineString/MultiLineString, SRID 4326)
- `length_m` (hasil hitung EPSG:32749)
- `source_feature_id`

**tertiary_plots**
- `id` (PK)
- `kode_petak` (unique)
- `nama_petak`
- `luas_baku_raw`
- `luas_ha`
- `nomenklatur_sadap_raw`
- `nomenklatur_sadap_normalized`
- `geom` (Polygon/MultiPolygon, SRID 4326)
- `has_valid_geometry`
- `source_feature_id`

**inspection_reports**
- `id` (PK)
- `id_laporan` (unique)
- `asset_id` (FK nullable)
- `tanggal`
- `petugas`
- `nomenklatur_raw`
- `nomenklatur_normalized`
- `jenis_kerusakan`
- `kondisi`
- `lat`, `lon` nullable
- `geom` Point nullable
- `status`
- `keterangan`
- `matching_method`
- `matching_distance_m`
- `source_file`
- `source_row`
- `created_at`, `updated_at`

**data_quality_findings**
- `id` (PK)
- `source_file`
- `source_record_id`
- `category`
- `problem`
- `action_taken`
- `raw_value` JSON nullable
- `normalized_value` JSON nullable
- `severity` nullable
- `created_at`

**plot_service_assignments**
- `id` (PK)
- `plot_id` (FK)
- `serving_asset_id` (FK nullable)
- `assignment_method` (`nomenklatur_sadap` / `nearest_fallback` / `none`)
- `distance_m` nullable
- `tag` nullable

**asset_impact_cache** (opsional)
- `asset_id` (PK/FK)
- `jumlah_petak`
- `luas_terdampak_ha`
- `computed_at`
- `algorithm_version`

**import_runs**
- `id` (PK)
- `source_file`
- `import_type` (`initial` / `supplemental`)
- `status`
- `started_at`, `finished_at`
- `rows_read`, `rows_inserted`, `rows_updated`, `rows_skipped`
- `error_summary`

### 15.2 Indeks dan constraint
- Unique index `assets.kode_aset`, `inspection_reports.id_laporan`, `tertiary_plots.kode_petak`.
- Index pada kondisi, jenis, nama saluran, tanggal laporan, status, foreign key.
- Spatial index GiST untuk seluruh kolom geometri.
- Check constraint untuk enum kategori yang sah.
- Foreign key laporan ke aset nullable agar laporan tanpa aset tetap disimpan.
- Transaksi untuk impor dan pembaruan agregat.

### 15.3 Catatan audit
Simpan nilai mentah dan hasil normalisasi agar keputusan dapat ditelusuri. File sumber tidak dimodifikasi. Untuk kebutuhan audit lebih lanjut, pertimbangkan tabel raw staging yang menyimpan baris sumber sebelum transformasi.

## 16. Arsitektur Sistem yang Direkomendasikan

### 16.1 Komponen
1. **Frontend web:** dashboard, peta, tabel, detail, visualisasi.
2. **Backend REST API:** kontrak endpoint, validasi query, orchestration.
3. **Import/processing module:** pembacaan CSV/XLSX/GeoJSON, normalisasi, deduplikasi, matching.
4. **Spatial analysis module:** transformasi CRS, geometri, graph jaringan, dampak hilir, luas/panjang.
5. **Database geospasial:** data terstruktur, geometri, audit, hasil kalkulasi.
6. **Bootstrap/worker:** proses impor awal sebelum health menjadi siap.

### 16.2 Alur startup
`Docker Compose → database healthy → backend status memuat → baca ./data → staging → normalize → validate/repair → deduplicate → match reports → derive current conditions → build network graph → calculate plot service/impact → calculate aggregates → status siap → frontend consumes API`

### 16.3 Alur impor susulan
`POST /api/impor/susulan → lock/import run → read workbook → normalize → upsert by id_laporan → update matching → recalculate current conditions → recalculate impacts/priorities → commit transaction → return counters`

### 16.4 Prinsip teknis
- Pemrosesan harus data-driven dan generik.
- Pisahkan parser, normalizer, validator, matching, spatial analysis, repository, dan API handler.
- Semua perhitungan spasial memakai CRS metrik yang ditetapkan.
- Gunakan transaksi dan idempotency.
- Gunakan konfigurasi environment dengan default aman.
- Tidak ada dependensi pada layanan berbayar atau API key eksternal.

## 17. Non-Functional Requirements

| ID | Kategori | Persyaratan |
|---|---|---|
| NFR-001 | Deployability | `docker compose up --build` menjalankan seluruh sistem |
| NFR-002 | Startup | Status siap maksimal 10 menit |
| NFR-003 | Port | Web `localhost:8080`, API `localhost:8080/api` |
| NFR-004 | Contract | Nama path dan properti sesuai kontrak versi 1.2 |
| NFR-005 | Portability | Berjalan pada dataset pengganti dengan nama file/kolom sama |
| NFR-006 | Determinism | Hasil normalisasi, deduplikasi, matching, dan ranking konsisten |
| NFR-007 | Accuracy | Angka spasial mengikuti toleransi pemeriksaan maksimum 1% |
| NFR-008 | Data integrity | Sumber tidak dimodifikasi; impor transaksional |
| NFR-009 | Idempotency | Impor susulan berulang tidak menggandakan data |
| NFR-010 | Observability | Log tahapan, durasi, jumlah baris, error, dan import run |
| NFR-011 | Maintainability | Modul terpisah, dokumentasi, unit test |
| NFR-012 | Usability | Antarmuka jelas untuk petugas pemeliharaan |
| NFR-013 | Accessibility | Informasi tidak hanya dibedakan melalui warna |
| NFR-014 | Security | Validasi file, pembatasan ukuran/format, query parameter tervalidasi |
| NFR-015 | Cost | Tidak bergantung pada akun/kunci layanan berbayar |

Target performa rinci selain batas startup belum ditetapkan dalam soal. Angka seperti response time p95, concurrency, dan ukuran maksimum file perlu ditentukan melalui pengujian lingkungan target, bukan dianggap sebagai persyaratan sumber.

## 18. Error Handling dan Edge Cases

- File hilang, tidak dapat dibaca, sheet tidak ditemukan, atau kolom wajib tidak ada.
- Nilai tanggal/angka tidak dapat diparse.
- CRS tidak dapat dipastikan.
- Koordinat valid secara numerik tetapi berada jauh dari jaringan.
- Geometri kosong, self-intersection, ring tidak tertutup, atau tipe geometri tidak sesuai.
- Banyak kandidat aset dalam radius matching yang sama.
- Kode nomenklatur normalisasi bertabrakan.
- Jaringan tidak memiliki bendung/root yang dapat dikenali.
- Graph memiliki komponen terputus atau siklus padahal jaringan diasumsikan pohon.
- Petak tidak memiliki sadap.
- Aset tanpa geometri.
- Laporan batal yang sebelumnya aktif.
- Laporan susulan dengan ID yang sama dan konten identik.
- Dua laporan memiliki tanggal sama dengan kondisi berbeda.
- Limit API tidak valid.
- Impor gagal di tengah proses.

Setiap kasus harus menghasilkan keputusan deterministik, log/temuan yang dapat ditelusuri, dan tidak merusak data yang sudah valid.

## 19. Keamanan dan Integritas

- Validasi ekstensi, MIME/format aktual, ukuran file, sheet, dan skema kolom.
- Jangan menerima path file arbitrer dari request.
- Jangan mengeksekusi formula/macro workbook.
- Gunakan parameterized query/ORM.
- Cegah mass assignment pada endpoint.
- Batasi akses endpoint impor pada lingkungan tepercaya bila dipublikasikan.
- Simpan secret hanya melalui environment; `.env.example` berisi nilai default non-secret.
- Tidak ada kredensial atau API key layanan berbayar yang diwajibkan.
- Jangan mencatat informasi sensitif yang tidak diperlukan.
- Gunakan transaction/rollback untuk operasi impor.

## 20. Testing dan Quality Assurance

### 20.1 Unit tests
- Normalisasi nomenklatur untuk titik, spasi, underscore, dash, suffix huruf.
- Normalisasi kondisi dan jenis.
- Parsing tanggal day-first dan format teks.
- Parsing angka koma desimal.
- Deteksi WGS84/UTM, konversi, pertukaran lat/lon.
- Validasi jarak 2 km, 50 m, 30 m, 200 m.
- Deduplikasi aset dengan tanggal terbaru.
- Kesetaraan geometri ruas tanpa bergantung arah digitasi.
- Perbaikan poligon invalid.
- Konversi m² ke ha dan ambang 20%.
- Deduplikasi laporan.
- Kondisi terkini termasuk tie tanggal.
- Formula skor dan tie-break alfabetis.

### 20.2 Integration tests
- Import awal dari folder `./data`.
- Health berubah dari `memuat` ke `siap`.
- Seluruh endpoint sesuai kontrak.
- Detail aset memuat laporan batal.
- Dampak hilir hanya memasukkan petak downstream.
- Rekap panjang mengabaikan ruas duplikat.
- Kualitas data mencakup kategori wajib bernilai nol.
- Impor susulan menambah/mengubah/membatalkan.
- Pemanggilan impor berulang tidak menggandakan data.

### 20.3 Spatial tests
- Jaringan sederhana berbentuk pohon dengan cabang.
- Bangunan tepat pada titik sadap.
- Bangunan pada saluran utama yang memengaruhi cabang hilir.
- Bangunan di hulu tidak memengaruhi petak di hilir yang tidak melewati bangunan.
- Endpoint saluran dalam 10 m tersambung untuk dampak.
- Gap 5 m untuk aturan pembersihan/topologi.
- Petak sadap eksplisit dan fallback nearest.
- Petak tanpa sadap tidak dihitung.
- Pengujian luas dan panjang terhadap nilai acuan dengan toleransi 1%.

### 20.4 Black-box acceptance tests
- Ganti isi file pada `./data` dengan dataset lain yang memakai nama file dan kolom sama.
- Jalankan hanya `docker compose up --build`.
- Pastikan aplikasi tidak bergantung pada nilai ID/nama baris tertentu.
- Pastikan kontrak API persis.
- Pastikan siap maksimal 10 menit.
- Pastikan angka spasial berada dalam toleransi 1%.

## 21. Acceptance Criteria Global

Produk dinyatakan memenuhi baseline jika:
1. Semua container dapat dijalankan dengan satu perintah.
2. Web dan API tersedia di port/path yang diwajibkan.
3. Health dan versi mengembalikan bentuk JSON persis.
4. Impor awal membaca data dari `./data`, bukan data hardcoded.
5. Seluruh aturan Bagian B diterapkan dan dicatat.
6. Kondisi terkini memakai sumber terbaru dan laporan menang saat tanggal sama.
7. Dampak hilir mengikuti topologi dari bendung dan aturan layanan petak.
8. Rekap panjang dan luas sesuai toleransi 1%.
9. Prioritas menggunakan bobot 0/1/2/4, hanya skor > 0, dan tie-break kode aset.
10. UI memuat peta, detail aset, rekap, prioritas, kualitas data, dan highlight dampak.
11. Impor susulan mendukung tambah/ubah/batal dan idempotent.
12. README menjelaskan cara menjalankan, asumsi, temuan data, penanganan, dan pekerjaan belum selesai.
13. `.env.example` tersedia bila memakai environment variables dan default-nya dapat dijalankan.
14. Unit/integration tests mencakup aturan utama.

## 22. Deliverables

- Source code lengkap.
- `docker-compose.yml` dan Dockerfile untuk layanan terkait.
- `.env.example` jika diperlukan.
- `README.md`.
- Database schema/migrations.
- Unit dan integration tests.
- Dokumentasi kontrak API.
- Dokumentasi asumsi dan keputusan pembersihan.
- Video demo 3–5 menit yang menunjukkan aplikasi berjalan dan menjelaskan satu keputusan teknis sambil membuka kode.
- ZIP seluruh kode dengan folder `.git`, tanpa `node_modules` dan hasil build, ukuran maksimal 100 MB.

## 23. Penilaian dan Strategi Prioritas

Bobot penilaian dari dokumen tugas:
| Aspek | Bobot |
|---|---:|
| Integrasi dan pembersihan data, diuji dengan data lain (Bagian B) | 25 |
| Rekap panjang, dampak hilir, dan prioritas (Bagian D) | 20 |
| Docker Compose, impor otomatis, kontrak API (Bagian A dan C) | 15 |
| Data susulan dan impor berulang (Bagian F) | 10 |
| Antarmuka (Bagian E) | 10 |
| Kualitas kode, README, unit test | 10 |
| Waktu pengumpulan | 5 |
| Video penjelasan | 5 |
| **Total** | **100** |

### Urutan implementasi yang disarankan
1. Docker, health, versi, struktur backend.
2. Parser seluruh format dan pipeline normalisasi.
3. Validasi CRS/geometri, deduplikasi, audit kualitas data.
4. Matching laporan dan kondisi terkini.
5. Graph jaringan dan dampak hilir.
6. Rekap panjang dan prioritas.
7. Endpoint kontrak dan pengujian black-box.
8. UI peta, detail, rekap, prioritas, kualitas data.
9. Impor susulan idempoten.
10. README, video, packaging dan verifikasi dataset pengganti.

## 24. Asumsi, Ambiguitas, dan Keputusan yang Harus Didokumentasikan

Dokumen tugas tidak menjelaskan secara eksplisit beberapa detail berikut. Implementasi wajib memilih pendekatan deterministik dan mencatatnya di README:
- Cara mendeteksi CRS per fitur ketika GeoJSON tidak memiliki metadata CRS dan satu file dapat berisi koordinat dalam sistem berbeda.
- Cara menentukan bendung/root jaringan jika lebih dari satu kandidat atau tidak ada nomenklatur eksplisit.
- Cara mengorientasikan ruas pada jaringan bercabang ketika hanya tersedia geometri dan nama saluran.
- Tie-break bila beberapa aset memiliki nomenklatur kanonis sama.
- Tie-break bila beberapa bangunan berjarak sama pada matching radius 30 m atau fallback 200 m.
- Cara membedakan nilai luas baku m² dan hektare secara otomatis; gunakan rentang/geometri dan aturan yang transparan, jangan sekadar menebak tanpa validasi.
- Cara memilih satu fitur duplikat jika atributnya berbeda tetapi geometrinya sama.
- Cara menghitung posisi bangunan di edge yang sama dan menentukan urutan hulu-hilir.
- Perilaku saat topologi tidak membentuk pohon yang konsisten.
- Apakah data susulan boleh memperbarui laporan yang sudah batal menjadi aktif; dokumen hanya menyebut status batal sebagai pembatalan dan isi baru menggantikan isi lama untuk ID yang sudah ada. Kebijakan reaktivasi harus ditetapkan secara eksplisit.
- Detail autentikasi tidak ditentukan oleh kontrak seleksi.

Jangan mengubah ketentuan yang eksplisit dalam dokumen sumber. Jika ada konflik implementasi, prioritaskan kontrak dan aturan yang dinyatakan pada dokumen tugas serta catat interpretasinya.

## 25. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| CRS tidak diketahui per fitur | Koordinat/lokasi salah | Deteksi rentang, validasi spasial, catat confidence dan temuan |
| Topologi tidak dapat diorientasikan | Dampak hilir salah | Root detection, graph validation, diagnostic, test jaringan bercabang |
| Normalisasi terlalu agresif | Salah mencocokkan aset | Simpan raw value, kamus eksplisit, collision detection |
| Perbedaan sumber kondisi | Kondisi terkini salah | Aturan tanggal tunggal dan laporan menang saat tanggal sama |
| Duplikasi tidak terdeteksi | Panjang/luas/ranking bias | Canonical geometry dan unique constraints |
| Impor gagal parsial | Data tidak konsisten | Transaction, import run, rollback |
| Dataset penguji berbeda | Aplikasi gagal otomatis | Hindari hardcode, black-box tests dengan dataset sintetis |
| Library GIS berat | Startup lambat | Optimasi pipeline, indeks spasial, batasi kalkulasi ulang |
| API berubah tidak sengaja | Gagal kontrak | Contract tests dan versi API |

## 26. Definition of Done

Sebuah fitur dianggap selesai jika:
- Implementasi sesuai aturan dan kontrak.
- Validasi input dan error path tersedia.
- Unit test dan integration test relevan lulus.
- Tidak ada nilai dataset spesifik yang di-hardcode.
- Temuan/perubahan data dapat diaudit.
- Dokumentasi diperbarui.
- UI memiliki loading, empty, success, dan error state bila relevan.
- Fitur berjalan dalam Docker Compose.
- Tidak memerlukan layanan berbayar atau langkah manual tersembunyi.

## 27. Referensi Sumber

1. **Tugas Seleksi Full Stack Developer: Kondisi Jaringan Irigasi**, 8 halaman. Menjadi sumber normatif untuk latar belakang, format data, aturan pembersihan, kontrak API, algoritma dampak, prioritas, UI, impor susulan, dan penilaian.
2. `aset_bangunan.csv` — inventaris aset.
3. `laporan_penelusuran.xlsx` — laporan awal.
4. `saluran.geojson` — geometri ruas saluran.
5. `petak_tersier.geojson` — geometri petak tersier.
6. `laporan_susulan.xlsx` — data susulan yang hanya diproses melalui endpoint impor.

---

**Akhir dokumen PRD — versi 1.0**
