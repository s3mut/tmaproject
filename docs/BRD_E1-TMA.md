# Business Requirement Document (BRD)
## E1-TMA — Field Asset Management Companion for Odoo ERP
### (Telegram Mini App untuk Pengelolaan Aset Cadangan & Inventaris Lapangan)

---

| **Informasi Dokumen** | **Detail** |
|---|---|
| **Nama Dokumen** | Business Requirement Document (BRD) |
| **Nama Proyek** | E1-TMA — Field Operational Companion for Odoo Asset Inventory |
| **Versi Dokumen** | 2.0 (Comprehensive Enterprise & Odoo Synchronization Architecture) |
| **Tanggal Pembaruan** | 27 Agustus 2026 |
| **Status** | Approved / Production Baseline |
| **Penyusun** | Tim Pengembang E1-TMA |

---

## Daftar Isi

1. [Eksekutif & Konsep Dasar Sistem](#1-eksekutif--konsep-dasar-sistem)
2. [Latar Belakang: Mengapa E1-TMA Dibangun?](#2-latar-belakang-mengapa-e1-tma-dibangun)
   - 2.1 [Kondisi Awal: Keterbatasan Odoo di Operasional Lapangan](#21-kondisi-awal-keterbatasan-odoo-di-operasional-lapangan)
   - 2.2 [Peran E1-TMA: Tangan Panjang Odoo di Garis Depan](#22-peran-e1-tma-tangan-panjang-odoo-di-garis-depan)
3. [Tujuan Bisnis & Sasaran Proyek](#3-tujuan-bisnis--sasaran-proyek)
4. [Ruang Lingkup Sistem (Scope of System)](#4-ruang-lingkup-sistem-scope-of-system)
   - 4.1 [Dalam Lingkup (In-Scope)](#41-dalam-lingkup-in-scope)
   - 4.2 [Di Luar Lingkup (Out-of-Scope)](#42-di-luar-lingkup-out-of-scope)
5. [Analisis Kesenjangan: Odoo ERP vs. E1-TMA](#5-analisis-kesenjangan-odoo-erp-vs-e1-tma)
6. [Kelemahan Sistem & Titik Kritis Rekonsiliasi (The Synchronization Gap)](#6-kelemahan-sistem--titik-kritis-rekonsiliasi-the-synchronization-gap)
   - 6.1 [Sumber Kerancuan Data (Status Mismatch)](#61-sumber-kerancuan-data-status-mismatch)
   - 6.2 [Standar Prosedur Operasional (SOP) Rekonsiliasi Ekspor-Impor](#62-standar-prosedur-operasional-sop-rekonsiliasi-ekspor-impor)
   - 6.3 [Peta Jalan Integrasi Masa Depan (Phase 2 Roadmap)](#63-peta-jalan-integrasi-masa-depan-phase-2-roadmap)
7. [Kebutuhan Fungsional (Functional Requirements)](#7-kebutuhan-fungsional-functional-requirements)
   - 7.1 [Modul Sinkronisasi Staging Data Odoo (CSV Import/Export)](#71-modul-sinkronisasi-staging-data-odoo-csv-importexport)
   - 7.2 [Modul Transaksi Khusus Peminjaman Unit Backup (6-Phase Loan Lifecycle)](#72-modul-transaksi-khusus-peminjaman-unit-backup-6-phase-loan-lifecycle)
   - 7.3 [Modul Persetujuan Interaktif Wilayah & Bot Webhook](#73-modul-persetujuan-interaktif-wilayah--bot-webhook)
   - 7.4 [Modul Stock Opname Lapangan (Mobile Camera QR/Barcode Scanner)](#74-modul-stock-opname-lapangan-mobile-camera-qrbarcode-scanner)
   - 7.5 [Modul Pemusnahan Aset & Usulan Afkir (Bulk Disposal Draft)](#75-modul-pemusnahan-aset--usulan-afkir-bulk-disposal-draft)
   - 7.6 [Modul Pelaporan Administrasi Odoo & Generator BAST](#76-modul-pelaporan-administrasi-odoo--generator-bast)
   - 7.7 [Modul Autentikasi Ganda & Manajemen Role Lapangan](#77-modul-autentikasi-ganda--manajemen-role-lapangan)
8. [Kebutuhan Non-Fungsional (Non-Functional Requirements)](#8-kebutuhan-non-fungsional-non-functional-requirements)
9. [Arsitektur Aliran Data: Odoo ⮂ E1-TMA](#9-arsitektur-aliran-data-odoo--e1-tma)
10. [Model Data & Siklus Status Aset](#10-model-data--siklus-status-aset)
11. [Matriks Hak Akses (RBAC Matrix)](#11-matriks-hak-akses-rbac-matrix)
12. [Alur Operasional Lapangan (Business Workflows)](#12-alur-operasional-lapangan-business-workflows)
13. [Batasan, Asumsi & Dependensi](#13-batasan-asumsi--dependensi)
14. [Kriteria Keberhasilan & Penerimaan (Acceptance Criteria)](#14-kriteria-keberhasilan--penerimaan-acceptance-criteria)
15. [Glosarium](#15-glosarium)

---

## 1. Eksekutif & Konsep Dasar Sistem

Sistem **E1-TMA** (*Enterprise IT Asset Inventory Telegram Mini App*) dirancang dan dibangun sebagai **aplikasi pendamping operasional lapangan (*Field Operational Companion*)** bagi sistem ERP utama perusahaan, yaitu **Odoo ERP**.

Dalam arsitektur tata kelola teknologi informasi perusahaan:
1. **Odoo ERP** diposisikan sebagai **System of Record (Pusat Pembukuan & Master Induk)** untuk kepatuhan akuntansi, aset finansial, dan audit korporasi pusat.
2. **E1-TMA** diposisikan sebagai **System of Engagement (Aplikasi Eksekusi Lapangan)** yang memberikan antarmuka ultra-ringan, interaktif, dan *mobile-first* bagi tim teknisi gudang regional serta staf toko/cabang yang tersebar di 2.000+ lokasi.

E1-TMA mengatasi jurang pemisah (*gap*) antara antarmuka Odoo yang berorientasi *desktop/back-office* dengan kebutuhan nyata di lapangan yang menuntut kecepatan pemindaian barcode dengan kamera ponsel, persetujuan cepat melalui obrolan Telegram, serta pemantauan ketat atas sirkulasi unit cadangan (*backup unit loan lifecycle*).

---

## 2. Latar Belakang: Mengapa E1-TMA Dibangun?

### 2.1 Kondisi Awal: Keterbatasan Odoo di Operasional Lapangan
Pada awalnya, seluruh pendataan inventaris aset TI mengandalkan sistem **Odoo**. Meskipun Odoo sangat kuat untuk pencatatan tingkat korporat, tim lapangan menghadapi berbagai hambatan praktis:
- **Kurang *Mobile-Friendly* untuk Staf Toko:** Mengakses Odoo melalui browser smartphone di toko sangat tidak praktis, membutuhkan login yang kompleks, memuat halaman yang berat, dan memiliki kurva pembelajaran (*learning curve*) yang tinggi bagi staf cabang.
- **Ketiadaan Pemindai Barcode Kamera Bawaan yang Praktis:** Odoo membutuhkan perangkat keras pemindai (*barcode scanner*) fisik atau terminal industri khusus (PDT) yang mahal. Tidak memungkinkan menyediakan alat scanner fisik di ribuan toko hanya untuk kebutuhan insidental.
- **Ketiadaan Alur Khusus Sirkulasi Mesin *Backup*:** Odoo mencatat perpindahan stok secara generik, namun tidak memiliki *workflow* terpandu untuk pinjam-pakai darurat unit backup (seperti: masa tenggang 14 hari, hitung mundur jatuh tempo, peringatan otomatis H-3, eskalasi visual *OVERDUE*, dan verifikasi kondisi fisik saat retur).
- **Komunikasi Persetujuan yang Lambat:** Notifikasi persetujuan mutasi di Odoo berbasis email atau harus membuka modul web Odoo, sehingga respon Admin IT lambat saat toko mengalami keadaan darurat mesin kasir/PC mati.

### 2.2 Peran E1-TMA: Tangan Panjang Odoo di Garis Depan
Untuk mengatasi kendala di atas tanpa membongkar struktur Odoo yang sudah berjalan, dibangunlah **E1-TMA** sebagai jembatan:
1. Data master aset dari Odoo diekspor ke dalam bentuk file spreadsheet/CSV.
2. Data tersebut diimpor dan diolah ke dalam E1-TMA yang didesain ringan berbasis **Telegram Mini App (TMA)**.
3. Seluruh pengguna lapangan (Teknisi IT Regional & Toko) berinteraksi harian melalui Telegram untuk scan barcode dengan kamera HP, mengajukan pinjaman unit, memantau pengiriman, dan melakukan audit fisik (*Stock Opname*).
4. Hasil transaksi operasional di E1-TMA kemudian diekspor kembali menjadi laporan data yang siap diimpor ulang ke Odoo guna memperbarui status resmi di pembukuan pusat.

---

## 3. Tujuan Bisnis & Sasaran Proyek

| No | Sasaran Bisnis | Indikator Keberhasilan (KPI) |
|----|----------------|------------------------------|
| 1 | **Adopsi Lapangan Maksimal** | 100% toko dan teknisi dapat melakukan transaksi aset langsung dari Telegram tanpa perlu instalasi aplikasi baru. |
| 2 | **Pemanfaatan Kamera Smartphone** | Eliminasi kebutuhan pembelian alat scanner eksternal di toko; pemindaian barcode/QR 100% memanfaatkan kamera ponsel. |
| 3 | **Visibilitas Unit Cadangan (*Backup*)** | Mengurangi kasus mesin cadangan yang tertahan atau hilang di toko menjadi **0 kasus** melalui *tracking lifecycle* dan pengingat harian Telegram. |
| 4 | **Kecepatan Respon Darurat Toko** | Waktu respon persetujuan pengiriman mesin cadangan dari regional ke toko turun dari 1-2 hari menjadi **< 15 menit** via persetujuan 1-klik di Bot Telegram. |
| 5 | **Standardisasi Data untuk Rekonsiliasi Odoo** | Format data hasil operasional E1-TMA terstandarisasi penuh (UTF-8 BOM CSV / Excel) agar siap diimpor kembali ke Odoo secara presisi. |

---

## 4. Ruang Lingkup Sistem (Scope of System)

### 4.1 Dalam Lingkup (In-Scope)
- **Ekstensi Operasional Lapangan Odoo:** Staging data aset hasil ekspor Odoo dengan validasi ketat nama kategori dan kode site.
- **Manajemen Peminjaman Unit Backup (6-Phase Loan Lifecycle):**
  1. *Requested* (Pengajuan toko dengan durasi hari wajib)
  2. *Approved* (Persetujuan Admin Regional via Web/Bot)
  3. *In Transit* (Pengiriman unit backup dari gudang)
  4. *In Progress* (Penerimaan toko & penguncian otomatis *Due Date*)
  5. *Returning* (Pengembalian fisik unit oleh toko ke IT)
  6. *Completed* (Penerimaan di gudang & **restorasi otomatis lokasi aset kembali ke gudang asal**).
- **Mutasi Aset Permanen (Mutation):** Pencatatan pemindahan lokasi aset antar cabang secara permanen.
- **Stock Opname Hybrid:** Audit fisik aset di toko/gudang menggunakan kamera HP (QR/Barcode) dengan opsi *fallback* ketik manual nomor seri.
- **Bot Approval & Overdue Cron:** Notifikasi persetujuan interaktif via *Inline Keyboard* Telegram dan pengecekan otomatis harian untuk pinjaman yang jatuh tempo.
- **Manajemen Usulan Pemusnahan (Bulk Disposal Draft):** Fasilitas memilih aset rusak dan mengekspor daftarnya ke Excel untuk ditandatangani manajemen sebelum eksekusi sistem.
- **Generator Dokumen Legal:** Pembuatan BAST Digital, Label Pengiriman (*Shipping Label*), dan Berkas Rekapitulasi Sinkronisasi Odoo.

### 4.2 Di Luar Lingkup (Out-of-Scope)
- Modul Keuangan & Jurnal Akuntansi (sepenuhnya tetap ditangani di Odoo).
- Pengadaan Aset Baru (*Purchase Order*) dan Pembayaran Vendor (tetap di Odoo).
- Sinkronisasi API dua arah *Real-Time Full Duplex* (pada fase 1 ini integrasi dilakukan secara terstruktur melalui mekanisme *Batch Staging Export-Import CSV*).

---

## 5. Analisis Kesenjangan: Odoo ERP vs. E1-TMA

Berikut perbandingan peran fungsional antara Odoo ERP dengan E1-TMA:

| Fitur / Parameter | Odoo ERP (Sistem Induk) | E1-TMA (Tangan Panjang Lapangan) |
|---|---|---|
| **Fokus Utama** | Pembukuan akuntansi, kepatuhan audit korporasi, master aset resmi. | Operasional harian lapangan, mobilitas, kemudahan input pengguna toko. |
| **Akses Platform** | Web Desktop / ERP Portal (memerlukan bandwidth stabil & login ERP). | **Telegram Mini App (TMA)** langsung di smartphone (akses cepat via Telegram). |
| **Metode Scanner** | Memerlukan hardware scanner USB/Bluetooth eksternal atau PDT mahal. | **Kamera HP bawaan** (HTML5 QR/Barcode Scanner) langsung di aplikasi. |
| **Alur Peminjaman Backup** | Pencatatan mutasi stok internal standar, tidak ada siklus pinjam khusus. | **Siklus 6-Fase Khusus:** Request ➡️ Approve ➡️ Transit ➡️ Pinjam ➡️ Retur ➡️ Restorasi Otomatis. |
| **Pengingat Jatuh Tempo** | Terbatas pada notifikasi internal/email sistem yang jarang dibuka toko. | **Notifikasi Bot Telegram Harian** (Peringatan H-3 dan alarm *OVERDUE* merah). |
| **Mekanisme Approval** | Login ke portal Odoo ➡️ Buka modul inventaris ➡️ Validasi. | **1-Klik di Chat Telegram** (Tombol *Inline Keyboard* `✅ Setujui` / `❌ Tolak`). |
| **Audit Fisik (Opname)** | Input daftar opname via tabel desktop atau scanner terhubung. | Pemindaian visual di lapangan dengan klasifikasi instan: `Ditemukan`, `Nyasar`, `Hilang`. |

---

## 6. Kelemahan Sistem & Titik Kritis Rekonsiliasi (The Synchronization Gap)

### 6.1 Sumber Kerancuan Data (Status Mismatch)
Karena E1-TMA berposisi sebagai tangan panjang yang menjembatani operasional lapangan ke Odoo melalui mekanisme **Ekspor-Impor Berkas (File-based Batch Sync)**, sistem ini memiliki titik kritis (*trade-off*) yang harus dipahami oleh seluruh pemangku kepentingan:

```
┌─────────────────┐       (1) Export CSV Master        ┌─────────────────┐
│                 ├───────────────────────────────────►│                 │
│    ODOO ERP     │                                    │     E1-TMA      │
│ (Core Database) │◄───────────────────────────────────┤ (Lapangan/TMA)  │
└─────────────────┘       (2) Import Rekap Hasil       └─────────────────┘
                                   Operasional
                                        ▲
                                        │
                         ⚠️ TITIK RANCU / GAP STATUS:
               Terjadi jeda waktu (Data Latency) antara saat
               barang sudah berpindah/selesai di lapangan (E1-TMA)
               dengan saat data diimpor kembali ke Odoo.
```

**Penyebab Kerancuan Status:**
1. **Jeda Waktu Sinkronisasi (*Data Latency*):** Aset yang sudah disetujui, dipinjam, atau dikembalikan di E1-TMA secara *real-time* status fisiknya sudah berubah di lapangan, namun di Odoo statusnya masih status lama hingga Admin IT melakukan ekspor rekap dari E1-TMA dan mengimpornya ke Odoo.
2. **Ketergantungan pada Disiplin Admin:** Kecepatan pembaruan Odoo sangat bergantung pada jadwal rutin Admin IT dalam melakukan ekspor-impor data.
3. **Potensi Perubahan Paralel:** Jika ada staf yang mengubah data aset langsung di Odoo tanpa melalui E1-TMA, maka akan terjadi benturan data saat ekspor CSV berikutnya ditimpa ke E1-TMA.

### 6.2 Standar Prosedur Operasional (SOP) Rekonsiliasi Ekspor-Impor
Untuk mengatasi kerancuan di atas, ditetapkan aturan bisnis berikut:
- **Aturan Tunggal Operasional:** Seluruh pergerakan fisik unit backup, mutasi, dan stock opname **WAJIB dicatat melalui E1-TMA**, bukan diinput manual langsung ke Odoo.
- **Jadwal Rekonsiliasi Rutin (Batch Closing):**
  - **Harian / Mingguan:** Admin IT mengekspor laporan transaksi dari E1-TMA (`Export CSV/Excel`) dan mengunggahnya ke modul penyesuaian Odoo untuk menyinkronkan status aset.
  - **Bulanan (Pasca Opname):** Hasil Stock Opname dan Berita Acara Pemusnahan (BAST Disposal) diekspor dari E1-TMA sebagai lampiran penyesuaian stok (*Inventory Adjustment*) resmi di Odoo.
- **UPSERT & Strict Trigger:** Pengunggahan master dari Odoo ke E1-TMA selalu menggunakan proteksi `UPSERT` berbasis `serial_number` dan trigger validasi kategori guna memastikan data yang masuk ke E1-TMA tidak korup/typo.

### 6.3 Peta Jalan Integrasi Masa Depan (Phase 2 Roadmap)
Sebagai solusi jangka panjang untuk meniadakan proses manual ekspor-impor:
- **Pengembangan REST API / Webhook Connector:** Membangun konektor langsung antara Supabase Edge Functions dan Odoo External API (XML-RPC / JSON-RPC), sehingga saat transaksi di E1-TMA berstatus `Completed`, sistem secara otomatis memicu pembaruan status lokasi aset di Odoo secara *real-time* tanpa intervensi file CSV.

---

## 7. Kebutuhan Fungsional (Functional Requirements)

### 7.1 Modul Sinkronisasi Staging Data Odoo (CSV Import/Export)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-OD-01** | Sistem mampu mengimpor data inventaris aset hasil ekspor dari Odoo (mencakup field: S/N, No. Aktiva, Kategori, Merek, Model, Computer Name, Site/Cabang, dan Status). | **High** |
| **FR-OD-02** | Sistem menerapkan **Strict Category Validation Trigger** PostgreSQL (`handle_asset_category_strict_sync`) saat import data Odoo untuk mencegah anomali nama kategori yang tidak sesuai standar. | **High** |
| **FR-OD-03** | Sistem memproses unggahan file CSV besar dari Odoo (ribuan baris) menggunakan teknik **Batch Chunking (250 baris per batch)** untuk menghindari kegagalan request browser. | **High** |
| **FR-OD-04** | Import data Odoo menggunakan metode **UPSERT** berbasis `serial_number` sehingga aman dijalankan berulang kali untuk memperbarui master data tanpa menduplikasi catatan. | **High** |
| **FR-OD-05** | Sistem menyediakan fitur **Export Rekap Transaksi & Penyesuaian Status** ke dalam format Excel CSV (UTF-8 BOM) yang terstruktur rapi agar siap diimpor kembali ke modul Odoo. | **High** |

### 7.2 Modul Transaksi Khusus Peminjaman Unit Backup (6-Phase Loan Lifecycle)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-LN-01** | Toko dapat mengajukan permohonan peminjaman unit backup darurat dengan memilih kategori perangkat dan wajib mengisi **Durasi Pinjam (Hari)**. | **High** |
| **FR-LN-02** | Penomoran tiket transaksi dibuat otomatis dengan format unik (`LOAN-[SITE]-[YYMM]-[SEQ]`). | **High** |
| **FR-LN-03** | Sistem mendukung siklus hidup 6 fase peminjaman: `Requested` ➡️ `Approved` ➡️ `In Transit` ➡️ `In Progress` ➡️ `Returning` ➡️ `Completed`. | **High** |
| **FR-LN-04** | Sistem secara otomatis mengunci **Tanggal Jatuh Tempo (`due_date`)** tepat saat toko menekan tombol *"Terima Unit"* (transisi ke status `In Progress`). | **High** |
| **FR-LN-05** | Toko dapat menekan tombol **"Kembalikan Unit (Return)"** yang mengubah status menjadi `Returning` saat unit dikirim balik ke gudang IT. | **High** |
| **FR-LN-06** | **Otomasi Restorasi Lokasi Fisik:** Saat Admin IT menekan tombol *"Terima di Gudang"* (`Completed`), sistem **secara otomatis mengembalikan `site_alias` aset fisik ke gudang asal (`from_site_code`)**. | **High** |
| **FR-LN-07** | Pada transaksi mutasi permanen (*Mutation*), saat status `Completed`, sistem memindahkan lokasi aset secara permanen ke `to_site_code`. | **High** |

### 7.3 Modul Persetujuan Interaktif Wilayah & Bot Webhook

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-BOT-01** | Notifikasi pengajuan pinjaman/mutasi dikirimkan seketika oleh Edge Function `telegram-bot` ke grup/chat Telegram Admin IT Regional terkait. | **High** |
| **FR-BOT-02** | Pesan notifikasi dilengkapi tombol interaktif (*Inline Keyboard*) yang memungkinkan Admin IT menyetujui (`✅ Setujui`) atau menolak (`❌ Tolak`) langsung dari aplikasi Telegram tanpa perlu login ke web. | **High** |
| **FR-BOT-03** | Pembatasan wewenang persetujuan di web: Admin Regional hanya berhak menyetujui transaksi dengan lokasi tujuan (`to_site_region`) di bawah wilayahnya, sedangkan Super Admin (`assigned_region = 'ALL'`) dapat menyetujui seluruh wilayah. | **High** |
| **FR-BOT-04** | **Cron Job Pengingat Overdue:** Edge Function `cron-overdue` berjalan otomatis setiap hari untuk memeriksa transaksi yang melewati batas `due_date` atau paket *In Transit* > 3 hari, lalu mengirimkan rekap peringatan ke Telegram Admin Region. | **High** |

### 7.4 Modul Stock Opname Lapangan (Mobile Camera QR/Barcode Scanner)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-SCN-01** | Pengguna dapat melakukan audit fisik aset langsung di toko/gudang menggunakan **kamera smartphone** melalui modul Stock Opname di Telegram Mini App. | **High** |
| **FR-SCN-02** | Mendukung pembacaan berbagai format barcode standar operasional (Code 128, Code 39, EAN-13, dan QR Code). | **High** |
| **FR-SCN-03** | **Fallback Input Manual S/N:** Tersedia kolom pencarian nomor seri manual (+ Enter) untuk memverifikasi aset jika stiker fisik barcode di toko rusak, kotor, atau robek. | **High** |
| **FR-SCN-04** | Sistem mengklasifikasikan aset hasil opname secara instan menjadi: `Ditemukan` (sesuai lokasi), `Nyasar` (terdaftar di toko lain), atau `Hilang` (tercatat di sistem tapi tidak ada fisiknya). | **High** |

### 7.5 Modul Pemusnahan Aset & Usulan Afkir (Bulk Disposal Draft)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-DSP-01** | Admin IT dapat memfilter unit-unit rusak (`Retired`) dan memilih beberapa unit sekaligus untuk proses pemusnahan massal (*Bulk Disposal*). | **High** |
| **FR-DSP-02** | **Export Draft Usulan Afkir:** Sistem menyediakan tombol untuk mengunduh daftar aset yang dipilih ke dalam berkas Excel/CSV guna meminta persetujuan tanda tangan pimpinan manajemen sebelum status diubah di sistem. | **High** |
| **FR-DSP-03** | Setelah persetujuan fisik didapat, Super Admin mengeksekusi pemusnahan di sistem yang mengubah status aset menjadi `Disposed` dan otomatis menghasilkan BAST Pemusnahan digital. | **High** |

### 7.6 Modul Pelaporan Administrasi Odoo & Generator BAST

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-DOC-01** | Sistem menghasilkan dokumen **Berita Acara Serah Terima (BAST)** resmi dengan format standar korporasi, rincian spesifikasi unit, dan kolom tanda tangan digital para pihak yang siap cetak / simpan PDF. | **High** |
| **FR-DOC-02** | Sistem menghasilkan **Label Pengiriman (Shipping Label)** siap cetak untuk ditempelkan pada fisik koli pengiriman unit backup ke toko. | **Medium** |
| **FR-DOC-03** | Dashboard analitik menyediakan visualisasi Recharts untuk tren pergerakan aset 12 bulan terakhir, sebaran status unit, dan ranking utilisasi peminjaman cabang. | **Medium** |
| **FR-DOC-04** | Fasilitas ekspor data langsung ke **Google Sheets** dan unduh cadangan database lengkap dalam format JSON. | **Low** |

### 7.7 Modul Autentikasi Ganda & Manajemen Role Lapangan

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-AUTH-01**| **Seamless Telegram Login:** Pengguna di lapangan otomatis login berbasis identitas Telegram ID dari Telegram WebApp SDK tanpa perlu input username/password. | **High** |
| **FR-AUTH-02**| **Web Browser Login:** Akses melalui browser PC desktop menggunakan verifikasi username/ID dan password terenkripsi hash bcrypt via RPC `SECURITY DEFINER`. | **High** |
| **FR-AUTH-03**| Pengguna baru (Guest) dapat mengajukan kenaikan hak akses Tim IT via tombol *"Request Access"* yang diteruskan ke grup Admin untuk persetujuan 1-klik di bot Telegram. | **High** |

---

## 8. Kebutuhan Non-Fungsional (Non-Functional Requirements)

- **NFR-PF-01 (Kecepatan Muat Mobile):** Halaman awal aplikasi harus terbuka dalam **< 2.5 detik** pada koneksi seluler 4G melalui Telegram Mini App.
- **NFR-PF-02 (Pencarian Ringan):** Komponen pencarian lokasi (`SiteSearchInput`) harus mampu memfilter 2.000+ lokasi dalam waktu **< 150 ms** tanpa kendala lag rendering.
- **NFR-SC-01 (Keamanan Data):** Seluruh data aset dilindungi kebijakan **Row Level Security (RLS)** PostgreSQL. Password web di-hash menggunakan algoritma **bcrypt** (salt round 10+).
- **NFR-SC-02 (Integritas Master Data):** Trigger database PostgreSQL memblokir penyimpanan data aset jika kategori tidak terdaftar pada tabel master (`RAISE EXCEPTION`).
- **NFR-UX-01 (Aksesibilitas Visual):** Antarmuka mendukung **Mode Gelap (Dark Mode)** dan **Mode Terang (Light Mode)** secara otomatis sesuai pengaturan perangkat.
- **NFR-UX-02 (Zero-Installation):** Aplikasi tidak memerlukan instalasi file APK/IPA tambahan; cukup dijalankan dari aplikasi Telegram yang sudah ada di smartphone staf.

---

## 9. Arsitektur Aliran Data: Odoo ⮂ E1-TMA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ODOO ERP (SYSTEM OF RECORD)                      │
│   - Master Asset Inventory & Accounting                                 │
│   - Periodic Inventory Adjustment & Final Audit Trail                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    (A) Ekspor Data Master Aset (CSV)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     E1-TMA OPERATIONAL PLATFORM                         │
│                                                                         │
│   ┌───────────────────────────────┐   ┌─────────────────────────────┐   │
│   │   Supabase PostgreSQL DB      │   │  Serverless Edge Functions  │   │
│   │  - Strict Category Trigger    │   │  - telegram-bot (Webhook)   │   │
│   │  - Unified asset_transactions │   │  - cron-overdue (Scheduled) │   │
│   └───────────────▲───────────────┘   └──────────────┬──────────────┘   │
│                   │                                  │                  │
│                   │ REST API / PostgREST             │ Telegram Bot API │
│                   ▼                                  ▼                  │
│   ┌───────────────────────────────┐   ┌─────────────────────────────┐   │
│   │  Telegram Mini App (React 19) │   │ Telegram Bot Chat / Group   │   │
│   │  - Camera Barcode Scanner     │   │ - 1-Click Interactive       │   │
│   │  - 6-Phase Loan Lifecycle     │   │   Approval Buttons          │   │
│   │  - Hybrid Stock Opname        │   │ - Daily Overdue Broadcasts  │   │
│   └───────────────────────────────┘   └─────────────────────────────┘   │
│                                                                         │
│   Operasional Harian: Teknisi Regional & Staf Toko (2.000+ Cabang)      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    (B) Ekspor Rekap Hasil Transaksi (CSV)
                        (Penyesuaian Mutasi, Retur & Disposal)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ODOO ERP (UPDATE STATUS)                         │
│   Admin IT mengimpor berkas penyesuaian untuk update status resmi Odoo  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Model Data & Siklus Status Aset

### 10.1 Master Status Aset Fisik
* **`Active`**: Aset sedang aktif digunakan untuk operasional di toko/cabang.
* **`Backup`**: Aset cadangan dalam kondisi baik, tersimpan di gudang regional, dan siap dipinjamkan.
* **`Retired`**: Aset dalam kondisi rusak/afkir, ditarik dari operasional, dan menunggu usulan pemusnahan (*Disposal*).
* **`Disposed`**: Aset telah resmi dimusnahkan dan dihapus dari buku operasional fisik.

### 10.2 Siklus Hidup Transaksi Peminjaman Unit Backup (*6-Phase Loan*)

```
[1. REQUESTED]   : Toko input pengajuan pinjam di TMA (Wajib isi Durasi Hari).
       │
       ▼
[2. APPROVED]    : Admin Region menyetujui via Web / 1-Klik Bot Telegram.
       │
       ▼
[3. IN TRANSIT]  : Admin IT kirim fisik barang & input nomor resi ekspedisi.
       │
       ▼
[4. IN PROGRESS] : Toko klik "Terima Unit". Sistem OTOMATIS mengunci Tanggal Jatuh Tempo.
       │           (Cron memantau H-3 & peringatan OVERDUE harian).
       ▼
[5. RETURNING]   : Mesin utama toko selesai diservis. Toko klik "Kembalikan Unit" & kirim balik.
       │
       ▼
[6. COMPLETED]   : Admin IT cek fisik di gudang & klik "Terima di Gudang".
                   Sistem OTOMATIS mengembalikan lokasi aset ke GUDANG ASAL.
```

---

## 11. Matriks Hak Akses (RBAC Matrix)

| Modul / Tindakan | Guest | User (Toko) | Admin Regional | Super Admin (HQ) |
|---|:---:|:---:|:---:|:---:|
| Melihat Daftar & Status Aset | ✅ | ✅ | ✅ | ✅ |
| Scan Barcode via Kamera HP | ✅ | ✅ | ✅ | ✅ |
| Mengajukan Pinjaman Unit Backup | ✅ | ✅ | ✅ | ✅ |
| Menyetujui Pinjaman via Bot/Web | ❌ | ❌ | ✅ (Regionnya) | ✅ (Semua Region) |
| Konfirmasi Terima Unit (`In Progress`) | ❌ | ✅ (Toko Terkait) | ✅ | ✅ |
| Inisiasi Retur Barang (`Returning`) | ❌ | ✅ (Toko Terkait) | ✅ | ✅ |
| Closing Penerimaan Retur (`Completed`) | ❌ | ❌ | ✅ (Gudang Asal) | ✅ |
| Melakukan Audit Stock Opname | ❌ | ❌ | ✅ (Regionnya) | ✅ (Semua Region) |
| Ekspor Usulan Afkir (Draft CSV) | ❌ | ❌ | ✅ | ✅ |
| Eksekusi Pemusnahan (`Disposed`) | ❌ | ❌ | ❌ | ✅ |
| Impor Master Data CSV dari Odoo | ❌ | ❌ | ❌ | ✅ |
| Ekspor Rekap Sinkronisasi ke Odoo | ❌ | ❌ | ✅ | ✅ |
| Manajemen Role User & Wilayah | ❌ | ❌ | ❌ | ✅ |

---

## 12. Alur Operasional Lapangan (Business Workflows)

### 12.1 Alur Penggantian Mesin Rusak Toko dengan Unit Backup
1. **Insiden di Toko:** Mesin kasir toko rusak. Staf toko membuka E1-TMA di Telegram ➡️ Mengajukan pinjaman unit backup dengan durasi 7 hari.
2. **Persetujuan Instan:** Notifikasi masuk ke Telegram Admin IT Regional. Admin menekan tombol `✅ Setujui` langsung dari gelembung chat Telegram.
3. **Pengiriman & Serah Terima:** Admin IT mengalokasikan unit backup dan mengirimkannya. Saat barang tiba, toko membuka E1-TMA dan mengklik **"Terima Unit"** (Status menjadi `In Progress`, sistem mulai menghitung jatuh tempo).
4. **Monitoring:** Jika peminjaman mendekati H-3 atau melewati batas 7 hari, bot otomatis mengirim alarm peringatan ke grup IT Regional.
5. **Pengembalian & Tutup Tiket:** Toko mengembalikan barang setelah mesin utama selesai diservis dengan menekan **"Kembalikan Unit"**. Admin IT menerima fisik unit di gudang dan menekan **"Terima di Gudang"** (Lokasi aset otomatis direset ke gudang asal).
6. **Sinkronisasi Odoo:** Setiap akhir pekan, Admin IT mengunduh rekap mutasi dari E1-TMA dan mengimpornya ke Odoo untuk memperbarui catatan pembukuan pusat.

---

## 13. Batasan, Asumsi & Dependensi

- **Batasan (Constraints):** Sinkronisasi antara E1-TMA dan Odoo pada fase ini masih bersifat berkala (*batch-oriented via CSV Export-Import*). Perbedaan status sementara dapat terjadi sebelum rekonsiliasi berkala dieksekusi.
- **Asumsi (Assumptions):** Setiap unit fisik aset di lapangan memiliki label barcode/QR yang terbaca kamera. Staf cabang memiliki akses ke aplikasi Telegram pada smartphone operasional.
- **Dependensi (Dependencies):** Koneksi internet aktif, ketersediaan layanan Supabase Platform (PostgreSQL & Edge Functions), serta operasional Telegram Bot API.

---

## 14. Kriteria Keberhasilan & Penerimaan (Acceptance Criteria)

- [x] Antarmuka Telegram Mini App dapat diakses mulus oleh staf cabang tanpa instalasi aplikasi tambahan.
- [x] Pemindaian barcode aset dapat dilakukan langsung menggunakan kamera HP bawaan serta mendukung fallback input nomor seri manual.
- [x] Alur peminjaman unit backup berjalan lengkap melalui 6 fase dengan perhitungan jatuh tempo otomatis dan restorasi lokasi gudang asal saat selesai.
- [x] Notifikasi dan persetujuan 1-klik di obrolan Telegram Bot berfungsi secara real-time.
- [x] Sistem mampu menghasilkan file ekspor CSV/Excel terformat yang valid untuk diimpor kembali ke Odoo.
- [x] Berkas BAST Serah Terima dan BAST Pemusnahan terbuat secara digital dan siap dicetak/disimpan dalam format PDF.

---

## 15. Glosarium

| Istilah | Definisi |
|---|---|
| **Odoo ERP** | Sistem Enterprise Resource Planning induk yang berfungsi sebagai *System of Record* inventaris korporasi. |
| **E1-TMA** | Telegram Mini App pendamping operasional lapangan (*System of Engagement*) untuk manajemen aset bergerak. |
| **Unit Backup** | Perangkat cadangan operasional yang disimpan di gudang regional untuk menggantikan sementara unit toko yang rusak. |
| **Data Latency** | Jeda waktu antara pencatatan riil transaksi di lapangan (E1-TMA) dengan pembaruan status di sistem induk (Odoo). |
| **Status Mismatch** | Kondisi perbedaan status aset sementara antara E1-TMA dan Odoo sebelum proses rekonsiliasi file CSV dijalankan. |
| **Due Date** | Tanggal batas akhir peminjaman unit backup sebelum dinyatakan berstatus *Overdue*. |
| **BAST** | Berita Acara Serah Terima — Dokumen legalitas formal penyerahan dan pemindahan tanggung jawab aset. |
| **UPSERT** | Operasi database untuk melakukan *Update* jika data sudah ada, atau *Insert* jika data baru. |

---

*Dokumen ini merupakan spesifikasi kebutuhan bisnis resmi (BRD Versi 2.0) yang merefleksikan posisi arsitektur E1-TMA sebagai tangan panjang Odoo ERP per 27 Agustus 2026.*  
*Diterbitkan dan disahkan oleh Tim Pengembang E1-TMA.*
