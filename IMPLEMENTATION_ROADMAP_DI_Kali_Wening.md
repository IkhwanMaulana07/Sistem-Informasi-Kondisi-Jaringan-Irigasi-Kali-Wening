# IMPLEMENTATION ROADMAP
## Sistem Informasi Kondisi Jaringan Irigasi — DI Kali Wening

**Versi:** 1.0 | **Basis:** PRD v1.0, TDD v1.0, API contract 1.2

## 1. Strategi delivery
Prioritaskan berdasarkan bobot seleksi: data cleaning (25), spatial analytics (20), Docker/API (15), supplemental import (10), UI (10), code/docs/tests (10), waktu (5), video (5). Jangan mengorbankan kebenaran data dan dampak spasial demi polish visual. Semua pengujian harus menghindari hardcoding dataset contoh.

## 2. Milestone

### M0 — Bootstrap dan kontrak dasar
- [ ] Struktur repo web/API/docs.
- [ ] Docker Compose untuk PostGIS, FastAPI, Next.js.
- [ ] Healthcheck database.
- [ ] `GET /api/health`: `memuat` lalu `siap`.
- [ ] `GET /api/versi`: `{"versi_kontrak":"1.2"}`.
- [ ] Web di `localhost:8080`, API di `/api`.
- [ ] `.env.example`; startup tanpa langkah manual.
**Gate:** `docker compose up --build` sukses dan dua endpoint dasar sesuai kontrak.

### M1 — Database dan ingestion
- [ ] Aktifkan PostGIS dan migration.
- [ ] Parser `aset_bangunan.csv`.
- [ ] Parser `laporan_penelusuran.xlsx`.
- [ ] Parser `saluran.geojson`.
- [ ] Parser `petak_tersier.geojson`.
- [ ] Validasi nama file, kolom, sheet, dan tipe.
- [ ] Simpan provenance file/baris/fitur.
- [ ] Jangan impor `laporan_susulan.xlsx` saat startup.
- [ ] Import run dan transaction.
**Gate:** empat sumber awal terbaca otomatis; file sumber tetap tidak berubah.

### M2 — Normalisasi dan data quality
- [ ] Nomenklatur canonical.
- [ ] Kondisi, jenis, status, tingkat saluran canonical.
- [ ] Tanggal day-first dan angka koma.
- [ ] Deteksi CRS per record/feature.
- [ ] Konversi UTM 49S ke WGS84.
- [ ] Deteksi axis tertukar.
- [ ] Rule invalid coordinate 2 km.
- [ ] Rule `jauh_dari_saluran` >50 m.
- [ ] Deduplikasi aset berdasarkan tanggal terbaru.
- [ ] Deduplikasi ruas tanpa sensitif arah digitasi.
- [ ] Repair polygon invalid.
- [ ] Deduplikasi petak.
- [ ] Konversi luas m² ke ha dan ambang 20%.
- [ ] Deduplikasi laporan.
- [ ] Seluruh kategori quality wajib dan detail temuan.
**Gate:** unit tests untuk semua aturan pembersihan lulus; tidak ada hardcode row ID.

### M3 — Matching dan kondisi terkini
- [ ] Exact match nomenklatur.
- [ ] Fallback nearest dalam 30 m.
- [ ] Simpan unmatched dengan tag.
- [ ] Simpan metode dan jarak matching.
- [ ] Riwayat laporan termasuk batal.
- [ ] Kondisi terbaru berdasarkan tanggal.
- [ ] Laporan menang pada tanggal sama.
- [ ] Batal tidak memengaruhi current condition.
**Gate:** detail aset dan kondisi terkini sesuai aturan PRD.

### M4 — Graph dan dampak hilir
- [ ] Transform geometri ke EPSG:32749 untuk metric calculations.
- [ ] Bangun node-edge graph.
- [ ] Toleransi 5 m dan 10 m dipisahkan sesuai konteks.
- [ ] Root bendung detection.
- [ ] Orientasi aliran dari root, bukan arah digitasi.
- [ ] Validasi komponen/siklus.
- [ ] Project bangunan maksimal 50 m.
- [ ] Assign petak melalui nomenklatur sadap.
- [ ] Fallback sadap/bagi-sadap maksimal 200 m.
- [ ] Tag `tanpa_sadap`.
- [ ] Hitung descendant plots dan luas terdampak.
- [ ] Spatial tests cabang, hulu/hilir, posisi bangunan.
**Gate:** hasil spasial sesuai acuan dalam toleransi 1%; ambiguity tercatat, bukan disembunyikan.

### M5 — Rekap dan prioritas
- [ ] Panjang ruas setelah dedup.
- [ ] Group by tingkat dan kondisi.
- [ ] Meter ke kilometer, 2 desimal.
- [ ] Bobot kondisi 0/1/2/4.
- [ ] Skor = bobot × luas terdampak.
- [ ] Filter skor >0.
- [ ] Sort skor desc, kode aset asc untuk tie.
- [ ] `limit` default 20 dan validasi.
**Gate:** rekap dan prioritas lulus unit/integration tests.

### M6 — API contract completion
- [ ] Daftar aset + filter.
- [ ] Detail aset + riwayat.
- [ ] Dampak.
- [ ] Rekap saluran.
- [ ] Prioritas.
- [ ] Kualitas data.
- [ ] Health dan versi.
- [ ] Error response konsisten.
- [ ] OpenAPI 3.1 dan contract tests.
**Gate:** semua endpoint dan nama properti sesuai kontrak.

### M7 — Frontend
- [ ] Layout dan navigasi.
- [ ] Dashboard dinamis dari API.
- [ ] Peta, legenda, layer control.
- [ ] Saluran diwarnai menurut kondisi.
- [ ] Bangunan marker menurut jenis.
- [ ] Petak poligon.
- [ ] Klik bangunan membuka detail.
- [ ] Riwayat termasuk batal.
- [ ] Highlight dampak dan total luas.
- [ ] Prioritas click-through ke peta.
- [ ] Rekap panjang.
- [ ] Kualitas data summary + detail.
- [ ] Import UI.
- [ ] Loading, empty, error, responsive states.
**Gate:** seluruh alur pengguna utama berjalan tanpa data hardcoded.

### M8 — Supplemental import
- [ ] Endpoint membaca workbook dari path tetap terkonfigurasi.
- [ ] Tambah ID baru.
- [ ] Update ID existing.
- [ ] Proses status batal.
- [ ] Counter `ditambah`, `diubah`, `dibatalkan`, `tidak_berubah`.
- [ ] Lock dan transaction.
- [ ] Recompute kondisi, dampak, prioritas.
- [ ] Uji pemanggilan berulang dan rollback.
**Gate:** file sama berulang kali menghasilkan state akhir yang sama dan tidak menggandakan data.

### M9 — Hardening dan submission
- [ ] Unit, integration, spatial, UI smoke tests.
- [ ] Uji dataset pengganti dengan nama file/kolom sama.
- [ ] Startup siap maksimal 10 menit.
- [ ] Audit hardcoding.
- [ ] Audit semua kategori quality.
- [ ] README: cara run, asumsi, masalah, tindakan, incomplete items.
- [ ] `.env.example`.
- [ ] Video demo 3–5 menit.
- [ ] ZIP berisi source dan `.git`; tanpa node_modules/build; maksimal 100 MB.
**Gate:** semua acceptance criteria PRD terpenuhi.

## 3. Dependency map
```text
M0 Bootstrap
 -> M1 Database + ingestion
   -> M2 Normalization + quality
     -> M3 Matching + current condition
       -> M4 Graph + impact
         -> M5 Summary + priority
           -> M6 API contract
             -> M7 UI
             -> M8 Supplemental import (bergantung M1-M6)
               -> M9 Final verification
```
Frontend skeleton dapat dimulai paralel setelah M0, tetapi integrasi data menunggu endpoint stabil.

## 4. Estimasi jadwal (rencana engineering)
Estimasi 10–15 hari kerja untuk satu developer penuh waktu; ini estimasi perencanaan, bukan tenggat dari dokumen seleksi.

| Hari kerja | Fokus |
|---|---|
| 1 | M0 + schema awal |
| 2–3 | M1 ingestion |
| 4–5 | M2 cleaning dan audit |
| 6 | M3 matching/current condition |
| 7–8 | M4 graph/dampak |
| 9 | M5 + M6 |
| 10–11 | M7 frontend |
| 12 | M8 supplemental import |
| 13–15 | M9 regression, README, video, packaging |

Jika tenggat lebih pendek, pertahankan M0–M6 dan M8 sebagai prioritas; UI dibuat fungsional dan fokus pada kriteria wajib.

## 5. Test plan
**Unit:** parsing, normalisasi, CRS/axis, geometry repair, dedup, matching, current condition, graph, impact, panjang, skor.  
**Integration:** bootstrap, health, semua endpoint, riwayat batal, quality zero-count, supplemental transaction/idempotency.  
**Spatial:** jaringan bercabang, petak upstream/downstream, 5m/10m, 30m/50m/200m, tanpa sadap, toleransi 1%.  
**Black-box:** ganti isi `./data` dengan dataset berbeda yang memakai nama file dan kolom sama, lalu jalankan hanya Docker Compose.

## 6. Risk register
| Risiko | Dampak | Mitigasi |
|---|---|---|
| CRS campuran | Lokasi dan jarak salah | Deteksi per fitur dan validasi |
| Graph ambigu | Dampak hilir salah | Root/topology diagnostics dan synthetic tests |
| Luas m²/ha ambigu | Luas prioritas salah | Bandingkan geometri dan catat keputusan |
| Nomenklatur collision | Salah matching | Collision detection; jangan auto-match ambigu |
| Import retry | Duplikasi | Unique key, lock, transaction |
| Map terlalu berat | UX buruk | Layer control, simplify display geometry |

## 7. Definition of Done
Setiap milestone harus terintegrasi, memiliki test, log error, dokumentasi, tidak mengandung hardcode dataset contoh, dan tidak merusak `docker compose up --build` maupun kontrak API 1.2.

## 8. Release checklist
- [ ] Web `localhost:8080`, API `/api`.
- [ ] Health `memuat` → `siap`.
- [ ] Versi `1.2`.
- [ ] Initial import mengecualikan laporan susulan.
- [ ] Quality categories wajib tersedia.
- [ ] Riwayat laporan memuat batal.
- [ ] Panjang/luas menggunakan EPSG:32749.
- [ ] Prioritas bobot 0/1/2/4.
- [ ] Supplemental import idempoten.
- [ ] Dataset pengganti berhasil diuji.
- [ ] README, env example, video, ZIP siap.
