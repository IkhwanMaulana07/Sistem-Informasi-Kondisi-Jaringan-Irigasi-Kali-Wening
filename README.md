# Sistem Informasi Kondisi Jaringan Irigasi — DI Kali Wening

Sistem Informasi Terpadu Kondisi Jaringan Irigasi Daerah Irigasi (DI) Kali Wening: Inventaris Bangunan, Penelusuran Kerusakan, Analisis Spasial Dampak Hilir Layanan Petak Tersier, dan Prioritas Pemeliharaan Berbasis Bobot Kerusakan.

**Versi Kontrak API:** 1.2  
**Basis Dokumen:** PRD v1.0, TDD v1.0, Database Schema v1.0, OpenAPI Specification v1.2, Implementation Roadmap v1.0, Soal Seleksi Full Stack Developer  

---

## 1. Ringkasan Eksekutif & Arsitektur

Aplikasi ini mengintegrasikan seluruh data aset irigasi DI Kali Wening menjadi satu gambaran kondisi jaringan yang dapat diandalkan oleh petugas operasi dan pemeliharaan (O&P). Sistem melakukan normalisasi, koreksi koordinat (CRS WGS84 & UTM 49S), deduplikasi entitas, perbaikan geometri, penentuan kondisi terkini, analisis topologi jaringan pohon dari bendung, penentuan dampak hilir ke petak tersier, serta pemeringkatan prioritas pemeliharaan secara deterministik.

### Teknologi yang Digunakan
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Leaflet, React-Leaflet, Lucide Icons.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn.
- **Spasial & GIS:** GeoPandas, Shapely 2.0, PyProj, NetworkX, OpenPyXL, Pandas.
- **Basis Data:** PostgreSQL 16 + PostGIS 3.4.
- **Orkestrasi:** Docker Compose dengan health check terintegrasi.

---

## 2. Cara Menjalankan Aplikasi

Aplikasi dirancang untuk dijalankan sepenuhnya menggunakan Docker Compose tanpa langkah manual:

```bash
docker compose up --build
```

Setelah aplikasi menyala, seluruh layanan tersedia pada alamat berikut:
- **Antarmuka Web (Frontend):** [http://localhost:8080](http://localhost:8080)
- **REST API Base URL:** [http://localhost:8080/api](http://localhost:8080/api)
- **Status Healthcheck:** [http://localhost:8080/api/health](http://localhost:8080/api/health)
  - Mengembalikan `{"status": "memuat"}` selama proses migrasi dan impor awal berjalan.
  - Mengembalikan `{"status": "siap"}` setelah seluruh data awal dan kalkulasi spasial selesai.
- **Versi Kontrak:** [http://localhost:8080/api/versi](http://localhost:8080/api/versi) (`{"versi_kontrak": "1.2"}`)
- **Dokumentasi OpenAPI / Swagger UI:** [http://localhost:8080/api/docs](http://localhost:8080/api/docs)

---

## 3. Struktur Direktori Repositori

```text
.
├── apps/
│   ├── web/                     # Frontend Next.js (TypeScript, Tailwind, Leaflet)
│   │   ├── app/                 # App Router pages (/peta, /aset, /prioritas, /rekap-saluran, /kualitas-data, /impor-susulan)
│   │   ├── components/          # Reusable UI & Map components (MapCanvas, Navbar)
│   │   ├── lib/                 # API client services
│   │   └── types/               # Strict TypeScript definitions
│   │
│   └── api/                     # Backend FastAPI
│       ├── app/
│       │   ├── api/             # REST API endpoint handlers
│       │   ├── core/            # Configuration & application state
│       │   ├── db/              # SQLAlchemy session & Base
│       │   ├── models/          # ORM models (PostGIS geometry, ENUMs)
│       │   ├── schemas/         # Pydantic schemas (OpenAPI v1.2 compliant)
│       │   ├── normalization/   # Canonical format normalizers (nomenklatur, kondisi, jenis, tanggal, angka)
│       │   ├── geospatial/      # CRS detection, axis correction, geometry repair, network graph DAG
│       │   ├── analytics/       # Condition resolver, canal summary, priority ranking
│       │   ├── ingestion/       # CSV, Excel, GeoJSON parsers & pipeline orchestrator
│       │   └── services/        # Supplemental import service
│       ├── migrations/          # Alembic database migrations
│       └── tests/               # Automated unit, integration, and spatial test suite
│
├── data/                        # Berkas data sumber (read-only, tidak dimodifikasi)
│   ├── aset_bangunan.csv
│   ├── laporan_penelusuran.xlsx
│   ├── saluran.geojson
│   ├── petak_tersier.geojson
│   └── laporan_susulan.xlsx
│
├── docs/                        # Dokumentasi teknis & spesifikasi acuan
│   ├── PRD.md
│   ├── TDD.md
│   ├── DATABASE_SCHEMA.sql
│   ├── API_SPECIFICATION.yaml
│   └── IMPLEMENTATION_ROADMAP.md
│
├── docker-compose.yml           # Orkestrasi Docker (db, api, web)
├── .env.example                 # Contoh variabel lingkungan
├── .gitignore
└── README.md
```

---

## 4. Kebijakan Pembersihan Data & 11 Kategori Kualitas

Setiap baris data yang bermasalah diperbaiki, ditandai, atau dibuang menurut aturan bisnis PRD dan dicatat dalam tabel `data_quality_findings`:

1. **`koordinat_utm_dikonversi`**: Koordinat dalam sistem UTM Zona 49S (meter) dikonversi ke derajat WGS84 (EPSG:4326).
2. **`koordinat_tertukar_dibetulkan`**: Lintang dan bujur yang terbalik posisinya (misalnya Lintang bernilai positif ~110 atau Bujur bernilai negatif ~-7.6) ditukar ke sumbu yang benar.
3. **`koordinat_tidak_valid`**: Koordinat kosong, bernilai (0,0), di luar rentang geografis valid, atau berjarak > 2 km dari saluran terdekat setelah koreksi. Geometri diset `null` dan ditandai.
4. **`jauh_dari_saluran`**: Bangunan yang berjarak > 50 m dari saluran terdekat disimpan, ditandai, dan dikecualikan dari analisis dampak hilir.
5. **`aset_ganda`**: Duplikasi `kode_aset` pada inventaris disaring dengan mempertahankan baris bertanggal `tgl_update` paling baru (dengan tie-breaker nomor baris pertama).
6. **`ruas_ganda`**: Ruas saluran dengan geometri identik disaring menjadi satu, mengabaikan arah penggambaran garis maju/mundur menggunakan hash kanonis.
7. **`petak_ganda`**: Duplikasi `kode_petak` pada petak tersier disaring menjadi satu poligon.
8. **`geometri_diperbaiki`**: Poligon yang mengalami self-intersection atau tidak valid diperbaiki menggunakan operasi validasi topologi (`make_valid` / `buffer(0)`).
9. **`luas_tidak_wajar`**: Deteksi otomatis satuan luas atribut ($m^2$ vs ha). Apabila luas atribut berselisih > 20% terhadap luas hasil perhitungan geometri (EPSG:32749), sistem menggunakan luas geometri dan menandainya.
10. **`laporan_ganda`**: Laporan penelusuran dengan aset, tanggal, dan kondisi yang sama disaring menjadi satu.
11. **`laporan_tanpa_aset`**: Laporan yang tidak menemukan aset cocok baik melalui pencocokan nomenklatur maupun radius spasial 30 meter tetap disimpan dengan tanda ini.

---

## 5. Logika Pencocokan Laporan & Kondisi Terkini

### Pencocokan Laporan ke Aset
1. **Langkah 1:** Cocokkan nomenklatur laporan yang dinormalisasi dengan nomenklatur aset kanonis (`B.KW.1`).
2. **Langkah 2:** Bila nomenklatur kosong atau tidak dikenal, cari bangunan terdekat dalam radius 30 meter dari koordinat laporan.
3. **Langkah 3:** Bila tidak ditemukan, simpan laporan dengan metode `unmatched` dan tanda `laporan_tanpa_aset`.

### Penentuan Kondisi Terkini Aset
- Kondisi ditentukan dari sumber bertanggal paling baru antara `tgl_update` inventaris dan tanggal laporan aktif yang cocok.
- **Aturan Seri (Tied Date):** Bila tanggal inventaris dan laporan sama persis, laporan penelusuran yang menang.
- **Laporan Batal:** Laporan berstatus `batal` **tidak memengaruhi** kondisi terkini, namun tetap tersimpan lengkap di riwayat detail aset (`GET /api/aset/{kode_aset}`).

---

## 6. Analisis Spasial Dampak Hilir & Prioritas Pemeliharaan

### Topologi Jaringan & Orientasi Aliran
1. Ruas saluran dihubungkan melalui snapping titik ujung dalam toleransi 10 meter.
2. Bangunan bendung (`KW-0001` / `B.KW.0`) diidentifikasi sebagai root (sumber air jaringan).
3. Graph diarahkan dari bendung ke hilir menggunakan algoritma traversal BFS, tanpa bergantung pada arah digitasi garis GIS sumber.
4. Setiap bangunan diproyeksikan ke saluran terdekat (maksimal 50 meter) untuk memperoleh posisi dan measure jarak aliran.

### Penugasan Layanan Petak Tersier
1. Dicocokkan ke bangunan berdasarkan `nomenklatur_sadap` petak.
2. Fallback: bila kosong atau tidak dikenal, petak dilayani oleh bangunan sadap atau bagi-sadap terdekat dari batas poligon petak (maksimal 200 meter).
3. Bila tidak ada yang memenuhi radius, ditandai `tanpa_sadap` dan tidak dihitung.

### Perhitungan Dampak & Skor Prioritas
- Untuk bangunan $X$, seluruh petak tersier yang jalur airnya dari bendung melewati $X$ (termasuk yang disadap di $X$) dinyatakan terdampak. Petak di hulu $X$ dikecualikan secara ketat.
- **Formula Skor Prioritas:**  
  $$\text{skor} = \text{bobot\_kondisi} \times \text{luas\_terdampak\_ha}$$
  - `baik`: bobot 0
  - `rusak_ringan`: bobot 1
  - `rusak_sedang`: bobot 2
  - `rusak_berat`: bobot 4
- Hanya menampilkan bangunan dengan $\text{skor} > 0$, diurutkan dari skor terbesar, dengan tie-breaker alfabetis `kode_aset`.

---

## 7. Impor Susulan & Idempotensi

- Endpoint `POST /api/impor/susulan` memproses berkas tetap `laporan_susulan.xlsx` dari direktori data server.
- Mengembalikan counter hasil pemrosesan:
  ```json
  {
    "ditambah": 14,
    "diubah": 6,
    "dibatalkan": 3,
    "tidak_berubah": 2
  }
  ```
- **Idempotensi:** Pemanggilan berkali-kali pada berkas yang sama aman dijalankan, tidak menggandakan data, dan menghasilkan status akhir yang konsisten (`tidak_berubah: 25` pada panggilan ulang berikutnya).
- Menggunakan lock dan transaksi database yang otomatis memperbarui kondisi terkini dan prioritas pemeliharaan.

---

## 8. Pengujian Otomatis

Seluruh logika pembersihan, transformasi spasial, graph, dan kontrak API diuji secara otomatis:

```bash
# Menjalankan seluruh test suite
pytest apps/api/tests/ -v
```

Cakupan pengujian:
- **Unit Tests:** Normalisasi nomenklatur, kondisi, jenis, tingkat, tanggal ambigu day-first, angka koma desimal, deteksi CRS & perbaikan pertukaran sumbu koordinat, repair poligon, hash ruas saluran, kondisi terkini, formula prioritas.
- **Spatial Tests:** Analisis graph pohon berarah, eksklusi petak hulu, inklusi petak hilir, proyeksi bangunan 50m, fallback sadap 200m.
- **Contract Tests:** Verifikasi skema respon OpenAPI v1.2, format error konsisten `{"error": {"code": "...", "message": "..."}}`.

---

## 9. Asumsi yang Diambil

1. **Titik Hulu Jaringan (Root Tree):** Bangunan bendung (kode `KW-0001` / tipe `bendung`) merupakan satu-satunya sumber pasokan air utama jaringan DI Kali Wening.
2. **Rentang Geografis & CRS Deteksi:** Daerah Irigasi Kali Wening berada di wilayah D.I. Yogyakarta dengan koordinat bujur $110.3^\circ - 110.5^\circ$ BT dan lintang $-7.8^\circ - -7.6^\circ$ LS. Angka di luar rentang ini atau berorde ratusan ribu/jutaan meter diidentifikasi sebagai proyeksi UTM Zona 49S (EPSG:32749).
3. **Toleransi Geometris Saluran:** Celah antaruas saluran hingga 10 meter dianggap saling tersambung (snapping). Toleransi jarak bangunan ke saluran adalah 50 meter; jika melebihi 50 meter, bangunan ditandai `jauh_dari_saluran` dan memiliki luas terdampak 0 ha.
4. **Fallback Sadap Petak Tersier:** Petak tersier tanpa `nomenklatur_sadap` yang valid dilayani oleh bangunan sadap atau bagi-sadap terdekat dalam radius maksimal 200 meter dari batas poligon petak. Apabila tidak ada bangunan sadap dalam radius tersebut, petak ditandai `tanpa_sadap`.
5. **Koreksi Satuan Luas Baku:** Nilai luas baku petak tersier $> 500$ diinterpretasikan sebagai satuan meter persegi ($m^2$) dan dikonversi ke hektare. Jika perbedaan antara luas atribut dan luas poligon hasil hitung geometri pada EPSG:32749 melebihi 20%, sistem menggunakan luas geometri dan menandai `luas_tidak_wajar`.
6. **Resolusi Kondisi Terkini:** Jika tanggal inventaris dan tanggal laporan aktif bernilai sama, laporan penelusuran diutamakan. Laporan berstatus `batal` diabaikan dalam penentuan kondisi terkini.

---

## 10. Status Penyelesaian Bagian Tugas

| Bagian | Deskripsi | Status | Keterangan |
| :--- | :--- | :---: | :--- |
| **Bagian A** | Syarat Minimal & Infrastruktur Docker | **Selesai (100%)** | `docker compose up --build`, web di port 8080, api di port 8000/8080, kontrak versi 1.2, healthcheck siap < 10 menit |
| **Bagian B** | Integrasi & Pembersihan Data | **Selesai (100%)** | Penanganan 11 kategori kualitas, normalisasi nomenklatur, kondisi, CRS WGS84/UTM 49S, deduplikasi entitas |
| **Bagian C** | Kepatuhan Kontrak REST API | **Selesai (100%)** | Seluruh 9 endpoint utama sesuai kontrak API v1.2 dengan nama properti dan format JSON presisi |
| **Bagian D** | Dampak Hilir, Rekap Saluran & Prioritas | **Selesai (100%)** | Graph pohon NetworkX dari bendung, perhitungan luas terdampak (ha), rekap saluran per tingkat/kondisi, ranking prioritas |
| **Bagian E** | Antarmuka Pengguna (Web UI) | **Selesai (100%)** | Peta interaktif Leaflet (saluran per warna kondisi, simbol bangunan, poligon petak, legenda), detail aset & riwayat, rekap saluran, tabel prioritas dengan zoom peta, katalog kualitas data |
| **Bagian F** | Data Susulan & Impor Berulang | **Selesai (100%)** | `POST /api/impor/susulan` idempoten, tracking ditambah/diubah/dibatalkan/tidak_berubah, rekalkulasi kondisi terkini & prioritas |

**Bagian yang Belum Selesai:** Tidak ada. Seluruh Bagian A sampai F telah diselesaikan 100% dan terverifikasi penuh.

---

## 11. Jawaban atas Dua Pertanyaan Penilaian

### 1. Masalah data apa saja yang Anda temukan?
- **Ketidakseragaman Nomenklatur:** Format beragam (`B.KW.1`, `BKW 1`, `bkw1`, spasi berlebih).
- **Variasi Nilai Kondisi:** Penulisan akronim (`RR`, `Rusak Ringan`, `rusak ringan`).
- **Inkonsistensi Format Tanggal & Angka:** Tanggal ambigu (`DD/MM/YYYY` vs `YYYY-MM-DD`) dan pemisah desimal berupa koma (`3,45`).
- **Anomali Sistem Koordinat & Sumbu Terbalik:** Campuran koordinat WGS84 derajat desimal dan UTM Zona 49S meter tanpa metadata, serta koordinat dengan posisi Lintang dan Bujur yang tertukar.
- **Geometri Rusak & Invalid:** Koordinat `(0, 0)`, koordinat kosong, poligon petak tersier yang mengalami self-intersection, dan titik aset yang berada jauh (> 2 km) dari jaringan saluran.
- **Duplikasi Data:** Duplikasi `kode_aset` pada inventaris, duplikasi ruas saluran (termasuk arah digitasi berkebalikan), duplikasi petak tersier, dan duplikasi laporan inspeksi lapangan.
- **Ketidaksesuaian Satuan & Nilai Luas Baku:** Satuan luas petak tercatat dalam $m^2$ alih-alih hektare, serta diskrepansi $> 20\%$ antara luas atribut dan luas poligon geometri.
- **Laporan Yatim (Orphan Reports):** Laporan dengan nomenklatur kosong atau tidak terdaftar pada master inventaris aset.

### 2. Keputusan teknis mana yang paling sulit?
**Membangun topologi aliran air jaringan pohon (DAG) dari berkas saluran tanpa mengandalkan arah digitasi garis GIS, serta penentuan dampak hilir secara deterministik.**  
Pada data mentah GIS, urutan titik koordinat (vertex) pada LineString saluran seringkali tidak konsisten dengan arah gravitasi/aliran air nyata (sebagian ruas digambar dari hilir ke hulu). Jika arah digitasi langsung dipakai untuk menentukan arah aliran, analisis hilir akan salah total.  
Keputusan teknis yang diambil adalah memodelkan jaringan saluran sebagai graf titik ujung dengan snapping toleransi 10 meter, kemudian menetapkan bangunan bendung (`KW-0001`) sebagai akar (*root*) sumber air utama. Arah aliran dari hulu ke hilir ditentukan menggunakan algoritma *Breadth-First Search (BFS)* transversal dari bendung. Posisi setiap bangunan diproyeksikan secara ortogonal ke segmen saluran terdekat dalam radius 50 meter untuk memperoleh titik injeksi aliran. Dengan pendekatan ini, petak terdampak dapat diisolasi secara presisi hanya pada cabang-cabang sub-tree di sebelah hilir bangunan yang mengalami kerusakan, sedangkan petak di sebelah hulu tetap aman.
