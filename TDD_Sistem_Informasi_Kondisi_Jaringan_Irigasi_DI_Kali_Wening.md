# TECHNICAL DESIGN DOCUMENT (TDD)
## Sistem Informasi Kondisi Jaringan Irigasi — DI Kali Wening

**Versi:** 1.0 | **Basis:** PRD v1.0 | **API contract:** 1.2

## 1. Tujuan dan prinsip
Dokumen ini menerjemahkan PRD menjadi rancangan implementasi. Ketentuan sumber yang eksplisit tetap menjadi acuan utama. Aplikasi harus data-driven, deterministik, dapat diaudit, tidak mengubah file sumber, dan tidak bergantung pada layanan/kunci berbayar.

## 2. Arsitektur yang dipilih
Gunakan **modular monolith** untuk menjaga deployment sederhana dan tetap memisahkan domain bisnis.

| Layer | Rekomendasi |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Peta | Leaflet + React-Leaflet |
| Backend | Python + FastAPI + Pydantic |
| GIS | GeoPandas, Shapely, PyProj |
| Graph | NetworkX |
| Ingestion | Pandas, openpyxl, GeoJSON parser |
| Database | PostgreSQL + PostGIS |
| ORM/migration | SQLAlchemy + Alembic |
| Testing | Pytest, HTTPX, Playwright |
| Runtime | Docker Compose |

Semua pilihan di atas adalah rekomendasi teknis, bukan kewajiban vendor dari soal.

## 3. Topologi runtime
```text
Browser :8080
   |
   v
Frontend / reverse proxy
   |  /api/*
   v
FastAPI backend
   |---- ingestion + normalization
   |---- data quality + matching
   |---- geospatial graph + analytics
   |
   v
PostgreSQL + PostGIS
```
Backend me-mount `./data` secara read-only. Initial import memproses inventaris, laporan awal, saluran, dan petak. `laporan_susulan.xlsx` hanya dibaca melalui endpoint susulan.

## 4. Struktur repository
```text
repo/
├── apps/web/                 # Next.js
├── apps/api/app/
│   ├── api/v1/               # HTTP routes
│   ├── core/                 # config, logging
│   ├── db/                   # session, migrations
│   ├── models/               # ORM models
│   ├── schemas/              # request/response schemas
│   ├── repositories/         # persistence
│   ├── ingestion/             # CSV/XLSX/GeoJSON parsers
│   ├── normalization/         # canonical values
│   ├── geospatial/            # CRS, geometry, graph
│   ├── analytics/             # impact, priority, summaries
│   └── services/              # orchestration
├── data/                      # source files, unchanged
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 5. Batas modul
- **Ingestion:** membaca sumber dan menyimpan staging/provenance; tidak mengubah file.
- **Normalization:** nomenklatur, kondisi, jenis, tanggal, angka, status, tingkat saluran.
- **Validation:** skema, koordinat, CRS, geometri, dan nilai.
- **Deduplication:** aset, ruas, petak, laporan.
- **Matching:** laporan ke aset dengan urutan aturan PRD.
- **Geospatial:** transformasi CRS, jarak, panjang, luas, graph.
- **Analytics:** kondisi terkini, penugasan petak, dampak, rekap, prioritas.
- **API:** kontrak HTTP dan serialisasi; business logic tidak ditulis di route handler.
- **Audit:** import run dan temuan kualitas data.

## 6. Initial import pipeline
```text
Compose starts
 -> DB healthy
 -> API health = memuat
 -> acquire import lock
 -> validate required files/columns
 -> parse into staging
 -> normalize raw values
 -> detect CRS / axis order
 -> transform geometries to EPSG:4326
 -> validate/repair geometries
 -> deduplicate entities
 -> match reports to assets
 -> derive current conditions
 -> build directed canal graph from bendung
 -> assign plots to serving structures
 -> calculate downstream impacts
 -> calculate canal lengths and priorities
 -> persist quality findings and import summary
 -> commit
 -> health = siap
```
Status siap hanya setelah seluruh proses awal dan kalkulasi wajib selesai, dengan target maksimal 10 menit. Jika file wajib/kolom wajib gagal, catat run failed dan jangan menyatakan data siap secara menyesatkan.

### Atomicity and repeatability
Gunakan staging dan transaction boundary. Gunakan advisory lock agar bootstrap/import tidak berjalan bersamaan. Initial re-import sebaiknya mengganti dataset final dari staging dalam transaction. Sumber tetap read-only.

## 7. Normalisasi dan koordinat
- Canonical nomenclature: bentuk titik, kapital, termasuk suffix huruf.
- Conditions: `baik`, `rusak_ringan`, `rusak_sedang`, `rusak_berat`.
- Asset type: lima enum sesuai PRD.
- Tanggal: `YYYY-MM-DD`; format ambigu day-first.
- Angka koma dibaca sebagai decimal.
- WGS84 disimpan sebagai SRID 4326.
- UTM 49S dikonversi dari EPSG:32749 ke EPSG:4326.
- Semua jarak/panjang/luas dihitung pada EPSG:32749.
- Deteksi CRS per record/feature berdasarkan rentang, validitas axis, dan plausibility; jangan mengasumsikan CRS seragam per file.
- Aset kosong, (0,0), tidak valid, atau >2 km dari saluran setelah koreksi: geometry null dan `koordinat_tidak_valid`.
- Bangunan >50 m dari saluran: simpan, beri `jauh_dari_saluran`, kecualikan dari dampak.

Normalisasi harus mengembalikan nilai hasil beserta metadata perubahan/alasan agar audit dapat dilakukan. Nilai tidak dikenal tidak boleh diam-diam diubah menjadi nilai default.

## 8. Deduplikasi dan matching
- Aset: kunci `kode_aset`, pilih `tgl_update` terbaru.
- Ruas: geometri sama, abaikan arah digitasi.
- Petak: kunci `kode_petak`.
- Laporan: aset + tanggal + kondisi.
- Semua tindakan buang/perbaiki/tandai dicatat.
- Matching laporan: nomenklatur normalisasi exact; jika kosong/tidak dikenal, nearest asset dalam 30 m; jika gagal, simpan tanpa aset dan tag `laporan_tanpa_aset`.
- Simpan `matching_method` dan `matching_distance_m`.
- Tie-break kandidat sama jarak harus deterministik dan didokumentasikan (misalnya kode aset alfabetis setelah jarak).

## 9. Kondisi terkini
Bandingkan kondisi inventaris bertanggal `tgl_update` dengan laporan cocok berstatus aktif. Pilih tanggal terbaru. Jika tanggal sama, laporan menang. Laporan batal tetap ada di riwayat tetapi tidak memengaruhi kondisi. Simpan `condition_inventory`, `condition_current`, dan `tgl_kondisi` terpisah.

## 10. Graph dan analisis dampak
- Endpoint ruas menjadi kandidat node.
- Aturan konektivitas 5 m untuk pembersihan/topologi dan 10 m untuk analisis dampak harus tetap dibedakan.
- Identifikasi bendung sebagai root; orientasikan edge dari bendung ke hilir, bukan dari arah digitasi garis.
- Validasi graph: root, komponen terputus, siklus, degree/topology.
- Project bangunan ke saluran terdekat maksimal 50 m; simpan edge dan measure/offset.
- Petak dilayani oleh `nomenklatur_sadap`; fallback bangunan sadap/bagi-sadap terdekat dari batas petak maksimal 200 m.
- Tidak ada sadap yang cocok: tag `tanpa_sadap`, jangan hitung.
- Petak terdampak X adalah petak dengan jalur air dari bendung melewati X, termasuk yang disadap di X.
- Luas terdampak adalah jumlah `luas_ha`, dua desimal.
- Bangunan tanpa posisi jaringan menghasilkan dampak nol.

Jika root/topologi ambigu atau graph tidak membentuk pohon yang dapat diorientasikan, simpan diagnostic dan jangan menghasilkan dampak yang tampak valid tanpa dasar.

## 11. Rekap dan prioritas
Panjang ruas dihitung setelah deduplikasi, transform EPSG:32749, dikelompokkan `tingkat` dan `kondisi`, dikonversi km, dibulatkan dua desimal.

| Kondisi | Bobot |
|---|---:|
| baik | 0 |
| rusak_ringan | 1 |
| rusak_sedang | 2 |
| rusak_berat | 4 |

`skor = bobot kondisi × luas_terdampak_ha`. Hanya skor >0. Urut skor descending, tie-break `kode_aset` ascending. Default limit 20.

## 12. Frontend
Routes:
- `/` Dashboard
- `/peta` Peta jaringan
- `/aset` Daftar bangunan
- `/aset/[kode_aset]` Detail
- `/prioritas` Prioritas
- `/rekap-saluran` Rekap saluran
- `/kualitas-data` Kualitas data
- `/impor-susulan` Impor susulan

Komponen utama: `MapCanvas`, `MapLegend`, canal/asset/plot layers, `AssetDetailPanel`, `ReportHistoryTable`, `PriorityTable`, `CanalSummaryTable`, `QualityFindingTable`, `ImpactSummary`.

Peta menampilkan saluran berdasarkan kondisi, marker menurut jenis, poligon petak, legenda, layer control, klik bangunan untuk detail, dan highlight dampak. Kondisi tidak boleh dibedakan hanya dengan warna. Geometri invalid/null tidak boleh merusak seluruh peta. Semua angka UI berasal dari API.

## 13. API runtime
- Prefix `/api`.
- Endpoint wajib mengikuti API Specification.
- `/api/health` dan `/api/versi` tersedia saat startup.
- Semua respons JSON.
- Error konsisten: `{"error":{"code":"...","message":"..."}}`.
- Route handler hanya validasi, panggil service, dan serialize.
- Nama properti kontrak tidak boleh berubah.

## 14. Database strategy
PostgreSQL + PostGIS. Geometry disimpan 4326; metric calculations menggunakan transform ke 32749. Gunakan GiST untuk geometri, B-tree untuk kode, status, kondisi, tanggal. Alembic mengelola migration. Import dan recomputation memakai transaction. Simpan raw value, source file, source row/feature, import run, dan audit findings.

## 15. Supplemental import
Endpoint memproses path workbook yang dikonfigurasi tetap, bukan path dari user. Lock proses, parse, normalize, upsert by `id_laporan`, proses status batal, recalculate condition/impact/priority, commit, lalu return counter. Retry file sama harus idempoten. Tentukan dan dokumentasikan kebijakan reaktivasi laporan batal karena PRD tidak sepenuhnya menetapkan skenario tersebut.

## 16. Docker and configuration
Services: PostGIS, FastAPI, Next.js/reverse proxy. Hanya gateway web expose host port 8080; `/api/*` diproxy ke backend. `./data` read-only mount. Startup otomatis menjalankan migration dan initial import.

Contoh `.env.example`:
```dotenv
APP_ENV=development
API_CONTRACT_VERSION=1.2
DATABASE_URL=postgresql+psycopg://irigasi:irigasi@db:5432/irigasi
DATA_DIR=/app/data
INITIAL_ASSET_FILE=aset_bangunan.csv
INITIAL_REPORT_FILE=laporan_penelusuran.xlsx
CANAL_FILE=saluran.geojson
PLOT_FILE=petak_tersier.geojson
SUPPLEMENTAL_REPORT_FILE=laporan_susulan.xlsx
WEB_ORIGIN=http://localhost:8080
```
Password contoh hanya untuk development; ganti untuk deployment bersama/produksi.

## 17. Security and observability
- Validasi format aktual, ukuran, sheet, kolom; jangan menerima arbitrary path.
- Jangan mengeksekusi macro/formula workbook.
- Parameterized SQL/ORM; cegah mass assignment.
- Batasi endpoint import pada lingkungan tepercaya bila dipublikasikan.
- Secrets melalui environment; tidak ada API key berbayar.
- Log terstruktur: import_run_id, source, stage, row counts, duration, errors, algorithm version.
- Monitor import duration/status, findings per category, graph nodes/edges/components, plots without service, API latency/status.
- Container non-root bila praktis.

## 18. Testing
**Unit:** parser, normalizer, CRS/axis, geometry repair, dedup, matching, current condition, graph orientation, impact, length, priority.  
**Integration:** bootstrap, health transition, endpoints, report history, quality categories including zero, supplemental transaction/idempotency.  
**Spatial:** branched tree, upstream exclusion, downstream inclusion, 5m/10m tolerances, 30m/50m/200m rules, no-sadap, 1% numeric tolerance.  
**Black-box:** replace `./data` with different values but same filenames/columns; run only `docker compose up --build`.

## 19. Risiko dan keputusan terbuka
1. Deteksi CRS per fitur ketika metadata hilang.
2. Pemilihan bendung/root jika kandidat lebih dari satu.
3. Orientasi graph bercabang dari geometri saja.
4. Collision nomenklatur setelah normalisasi.
5. Tie-break nearest matching.
6. Deteksi satuan luas m²/ha.
7. Pemilihan fitur ruas duplikat jika atribut berbeda.
8. Topologi tidak membentuk pohon.
9. Reaktivasi laporan batal.
10. Proteksi import endpoint pada deployment publik.

Semua keputusan harus deterministik, diuji, dan dicatat di README.

## 20. Delivery checklist
- [ ] Docker Compose menjalankan database, API, web.
- [ ] Health memuat → siap maksimal 10 menit.
- [ ] Versi kontrak 1.2.
- [ ] Initial import tidak membaca laporan susulan.
- [ ] Semua temuan kualitas dapat diaudit.
- [ ] Kondisi terkini dan tie-date benar.
- [ ] Dampak hilir mengikuti graph dari bendung.
- [ ] Rekap dan prioritas sesuai formula.
- [ ] UI lengkap sesuai PRD.
- [ ] Supplemental import idempoten.
- [ ] README, `.env.example`, tests, video, ZIP lengkap.
