# Business Requirement Document (BRD)
## E1-TMA — IT Asset Inventory Telegram Mini App

---

| **Informasi Dokumen** | **Detail** |
|---|---|
| **Nama Dokumen** | Business Requirement Document (BRD) |
| **Nama Proyek** | E1-TMA — Enterprise IT Asset Inventory Telegram Mini App |
| **Versi Dokumen** | 1.1 (Updated Post-Refactoring & Lifecycle Enhancement) |
| **Tanggal Pembaruan** | 27 Agustus 2026 |
| **Status** | Approved / Production Baseline |
| **Penyusun** | Tim Pengembang E1-TMA |

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Latar Belakang & Masalah Bisnis](#2-latar-belakang--masalah-bisnis)
3. [Tujuan Bisnis](#3-tujuan-bisnis)
4. [Ruang Lingkup Sistem (Scope)](#4-ruang-lingkup-sistem-scope)
5. [Pemangku Kepentingan (Stakeholders)](#5-pemangku-kepentingan-stakeholders)
6. [Kebutuhan Bisnis Utama (Business Requirements)](#6-kebutuhan-bisnis-utama-business-requirements)
7. [Kebutuhan Fungsional (Functional Requirements)](#7-kebutuhan-fungsional-functional-requirements)
   - 7.1 [Modul Master Data & Inventaris Aset](#71-modul-master-data--inventaris-aset)
   - 7.2 [Modul Transaksi Terpadu (Peminjaman, Mutasi, Perbaikan)](#72-modul-transaksi-terpadu-peminjaman-mutasi-perbaikan)
   - 7.3 [Modul Persetujuan Wilayah & Bot Webhook](#73-modul-persetujuan-wilayah--bot-webhook)
   - 7.4 [Modul Stock Opname (Audit Fisik Hybrid)](#74-modul-stock-opname-audit-fisik-hybrid)
   - 7.5 [Modul Pemusnahan Aset & Usulan Afkir (Bulk Disposal)](#75-modul-pemusnahan-aset--usulan-afkir-bulk-disposal)
   - 7.6 [Modul Pelaporan, Analitik & Generator BAST](#76-modul-pelaporan-analitik--generator-bast)
   - 7.7 [Modul Impor Massal CSV & Validasi Strict](#77-modul-impor-massal-csv--validasi-strict)
   - 7.8 [Modul Autentikasi Ganda & Manajemen Pengguna (RBAC)](#78-modul-autentikasi-ganda--manajemen-pengguna-rbac)
8. [Kebutuhan Non-Fungsional (Non-Functional Requirements)](#8-kebutuhan-non-fungsional-non-functional-requirements)
9. [Arsitektur Sistem & Integrasi](#9-arsitektur-sistem--integrasi)
10. [Model Data & State Machine Transaksi](#10-model-data--state-machine-transaksi)
11. [Matriks Peran & Hak Akses (RBAC Matrix)](#11-matriks-peran--hak-akses-rbac-matrix)
12. [Alur Proses Bisnis Utama (Workflow)](#12-alur-proses-bisnis-utama-workflow)
13. [Batasan, Asumsi & Dependensi](#13-batasan-asumsi--dependensi)
14. [Kriteria Penerimaan Sistem (Acceptance Criteria)](#14-kriteria-penerimaan-sistem-acceptance-criteria)
15. [Glosarium Istilah](#15-glosarium-istilah)

---

## 1. Pendahuluan

Dokumen ini merupakan **Business Requirement Document (BRD) Versi 1.1** untuk sistem **E1-TMA** (*Enterprise IT Asset Inventory Telegram Mini App*). Dokumen ini merinci secara komprehensif seluruh kebutuhan fungsional, non-fungsional, arsitektur teknis, aturan bisnis (*business rules*), serta alur kerja (*workflows*) transaksi aset yang telah diimplementasikan dan disempurnakan pada sistem per **27 Agustus 2026**.

### 1.1 Tujuan Dokumen
- Mendokumentasikan spesifikasi fungsional dan teknis aplikasi terkini secara menyeluruh.
- Menjadi standar acuan (*baseline*) untuk pengujian (*Quality Assurance*), audit kepatuhan IT, dan serah terima sistem.
- Menjadi panduan operasional bagi Tim IT Pusat (HQ), Admin Regional, dan Tim Lapangan (Toko/Cabang).

### 1.2 Audiens Dokumen
- Direksi & Manajemen Teknologi Informasi
- IT Asset Manager & IT Regional Coordinator
- Tim Pengembang Perangkat Lunak (Software Engineering Team)
- Tim QA & Auditor Internal IT
- Tim Helpdesk & Teknisi IT Lapangan

---

## 2. Latar Belakang & Masalah Bisnis

### 2.1 Kondisi Sebelum Sistem (As-Is)
Pengelolaan aset TI perusahaan menghadapi kendala operasional yang kritis:
- **Pencatatan Terfragmentasi (Silo Spreadsheet):** Setiap regional dan cabang mencatat data aset secara manual di file Excel terpisah, memicu ketidaksinkronan data, duplikasi nomor seri, dan potensi *human error*.
- **Ketidakpastian Lokasi Unit Backup:** Mesin/perangkat cadangan (*backup unit*) yang dipinjamkan ke toko seringkali tidak terlacak kepulangannya, berujung pada hilangnya aset (*untracked missing assets*).
- **Proses Persetujuan Lambat:** Persetujuan pemindahan barang membutuhkan koordinasi chat/email manual yang tidak memiliki jejak audit formal.
- **Audit Fisik (Stock Opname) Tidak Efisien:** Pemeriksaan manual membutuhkan waktu berhari-hari, rentan salah hitung, dan sulit membedakan unit resmi dengan unit nyasar antar cabang.
- **Skala Operasional Luas:** Perusahaan mengelola lebih dari **6.000+ unit aset TI** yang tersebar di **2.000+ lokasi cabang/toko** di seluruh wilayah Indonesia.

### 2.2 Kondisi yang Dituju (To-Be)
E1-TMA menghadirkan platform inventaris aset terpadu berbasis **Telegram Mini App (TMA)** yang memungkinkan:
- Akses cepat tanpa instalasi aplikasi tambahan bagi staf cabang dan teknisi via Telegram.
- Siklus hidup transaksi terstruktur (*Requested ➡️ Approved ➡️ In Transit ➡️ In Progress ➡️ Returning ➡️ Completed*).
- Notifikasi dan persetujuan 1-klik via Telegram Bot Webhook secara instan.
- Audit fisik berbasis *hybrid scanner* (Kamera QR/Barcode + Input Manual S/N).
- Laporan analitik dan dokumen formal (BAST & Label Pengiriman) yang siap cetak.

---

## 3. Tujuan Bisnis

| No | Sasaran Strategis | Indikator Kinerja Utama (KPI) |
|----|-------------------|-------------------------------|
| 1 | **Akurasi Data Inventaris** | Tingkat integritas dan validitas data aset mencapai **≥ 99.5%** tanpa duplikasi serial number. |
| 2 | **Kecepatan Persetujuan Transaksi** | Waktu respon persetujuan mutasi/peminjaman terpangkas dari rata-rata 1-2 hari menjadi **< 15 menit** via Telegram Bot Approval. |
| 3 | **Eliminasi Keterlambatan Pengembalian** | Mengurangi angka aset cadangan yang tertahan di toko (*overdue*) hingga **0 kasus** tanpa notifikasi peringatan harian. |
| 4 | **Efisiensi Audit Fisik Cabang** | Mempercepat durasi Stock Opname per cabang hingga **≥ 60%** melalui pemindaian kamera dan pencocokan otomatis. |
| 5 | **Jejak Audit & Akuntabilitas** | 100% pergerakan unit fisik memiliki catatan log kronologis (*Audit Trail*), lengkap dengan pencatat, tanggal, dan dokumen BAST digital. |

---

## 4. Ruang Lingkup Sistem (Scope)

### 4.1 Termasuk dalam Lingkup (In-Scope)
- **Master Data Management:** Pengelolaan Master Kategori (37 kategori standar), Master Site (2.000+ lokasi beserta pemetaan wilayah), dan Master Pengguna.
- **Manajemen Inventaris Aset:** CRUD aset lengkap dengan atribut Serial Number, No. Aktiva/BTA, Merek, Model, Computer Name, Status (`Active`, `Backup`, `Disposed`, `Retired`), dan Site Alias.
- **Transaksi Terpadu (Unified Transactions):**
  - **Peminjaman (Borrowing):** Siklus 6 fase dengan input durasi wajib, auto-kalkulasi jatuh tempo, dan restorasi lokasi otomatis saat selesai.
  - **Mutasi (Mutation):** Perpindahan kepemilikan dan lokasi aset fisik antar cabang secara permanen.
  - **Perbaikan (Repair):** Pelacakan servis perangkat rusak ke vendor/workshop IT.
- **Otorisasi Berbasis Wilayah (Regional Approval):** Validasi wilayah ketat untuk Admin Regional dan bypass Super Admin (`assigned_region = 'ALL'`).
- **Integrasi Telegram Bot & Serverless Webhook:**
  - Notifikasi permohonan baru dengan tombol *Inline Keyboard* (`✅ Setujui` / `❌ Tolak`).
  - Cron job otomatis harian untuk mendeteksi *Overdue Loans* dan *Stuck In Transit (> 3 hari)*.
- **Audit Fisik (Stock Opname Hybrid):** Kamera pemindai QR/Barcode bawaan + Input manual S/N dengan status `Ditemukan`, `Nyasar`, dan `Hilang`.
- **Modul Pemusnahan Aset (Bulk Disposal):** Eksekusi pemusnahan massal dan fitur unduh **Daftar Usulan Afkir (Draft CSV)** untuk otorisasi atasan fisik.
- **Dokumentasi & Generator Berkas:** BAST Serah Terima, BAST Pemusnahan, Label Pengiriman (*Shipping Label*), dan Ekspor ke Google Sheets / CSV Excel (UTF-8 BOM).
- **Import Massal CSV:** Chunking 250 baris per batch dengan validasi ketat kategori via PostgreSQL Trigger.
- **Autentikasi Ganda:** Auto-login via Telegram WebApp SDK dan Login Web Form via username/ID + password terenkripsi bcrypt.

### 4.2 Di Luar Lingkup (Out-of-Scope)
- Modul Akuntansi Finansial (Perhitungan nilai depresiasi/penyusutan buku fiskal).
- Modul Pengadaan/Purchasing Order (PO) pembelian barang baru ke vendor.
- Manajemen Lisensi Perangkat Lunak (*Software Licensing Management*).

---

## 5. Pemangku Kepentingan (Stakeholders)

| Peran | Deskripsi | Tanggung Jawab & Kepentingan |
|---|---|---|
| **Super Admin (IT HQ)** | Administrator IT Pusat (`assigned_region = 'ALL'`) | Memiliki akses global ke seluruh region, menyetujui transaksi lintas wilayah, melakukan impor massal, manajemen user, dan pengawasan sistem. |
| **Admin Regional** | Staf IT / Gudang Regional (`assigned_region = 'Region X'`) | Mengelola aset gudang regional, menyetujui peminjaman/mutasi di wilayahnya, melakukan *dispatch* unit, dan menerima unit retur. |
| **User (Toko / Cabang)** | Kepala Toko / Staf Operasional Cabang | Mengajukan peminjaman unit backup, mengonfirmasi penerimaan barang, dan menginisiasi retur (*Returning*) unit selesai pakai. |
| **Guest** | Pengguna Telegram baru yang belum diverifikasi | Mengajukan permohonan aktivasi akun Tim IT melalui tombol *Request Access*. |
| **Manajemen / Eksekutif IT** | Head of IT, General Manager IT | Memantau KPI kesehatan aset, laporan utilisasi, tren mutasi, dan menyetujui berkas usulan pemusnahan barang afkir. |

---

## 6. Kebutuhan Bisnis Utama (Business Requirements)

* **BR-01 (Single Source of Truth):** Seluruh data aset TI wajib terpusat pada satu pangkalan data relasional Supabase PostgreSQL dengan pengamanan Row Level Security (RLS).
* **BR-02 (Seamless Mobile Operations):** Aplikasi harus dapat diakses langsung dari Telegram tanpa perlu instalasi aplikasi terpisah melalui Telegram Mini App.
* **BR-03 (Controlled Backup Lifecycle):** Unit cadangan (*backup*) tidak boleh dipinjamkan tanpa batas waktu; durasi harus ditentukan di awal dan status keterlambatan harus dipantau otomatis.
* **BR-04 (Regional Governance):** Persetujuan transaksi harus terisolasi sesuai wilayah wewenang masing-masing Admin Regional guna mencegah intervensi antar wilayah.
* **BR-05 (Audit Trail & Legal Compliance):** Setiap perpindahan fisik wajib menghasilkan Berita Acara Serah Terima (BAST) dan tercatat dalam linimasa audit yang tidak dapat dimanipulasi.
* **BR-06 (Disposal Governance):** Pemusnahan aset afkir wajib melalui tahap verifikasi usulan tertulis sebelum status aset diubah menjadi `Disposed` di sistem.

---

## 7. Kebutuhan Fungsional (Functional Requirements)

### 7.1 Modul Master Data & Inventaris Aset

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-AST-01** | Sistem mampu mengelola data master aset dengan atribut: Serial Number (unik), No. Aktiva/BTA, Kategori ID, Merek, Model, Computer Name, Status, Site Alias, External ID, dan Deskripsi. | **High** |
| **FR-AST-02** | Master status aset terdiri dari 4 nilai resmi: `Active`, `Backup`, `Disposed`, dan `Retired`. | **High** |
| **FR-AST-03** | Sistem menyajikan daftar aset yang dikelompokkan per Region dalam format *collapsible accordion* yang responsif. | **High** |
| **FR-AST-04** | Sistem mendukung mekanisme *Paginated Auto-Fetch* untuk memuat 6.000+ baris data tanpa terhalang batas limit 1.000 baris Supabase/PostgREST. | **High** |
| **FR-AST-05** | Sistem menyediakan fitur pencarian instan multisumbu (S/N, Merek, Model, Site, No. Aktiva) serta filter berbasis kategori dan status. | **High** |
| **FR-AST-06** | Sistem mendukung penghapusan logis (*Soft Delete*) via kolom `deleted_at` untuk menjamin integritas riwayat aset. | **High** |

### 7.2 Modul Transaksi Terpadu (Peminjaman, Mutasi, Perbaikan)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-TX-01** | Sistem menyediakan tabel transaksi terpadu (`asset_transactions`) yang mendukung tipe: `Borrowing`, `Mutation`, dan `Repair`. | **High** |
| **FR-TX-02** | Penomoran kode transaksi dibuat otomatis dengan format unik berbasis tipe, kode site, tahun/bulan, dan nomor urut. | **High** |
| **FR-TX-03** | Pada transaksi **Peminjaman (Borrowing)**, pengguna wajib menginput **Durasi Pinjam (Hari)** saat pembuatan tiket. | **High** |
| **FR-TX-04** | Sistem secara otomatis menghitung **Tanggal Jatuh Tempo (`due_date`)** saat transaksi berpindah ke status `In Progress`. | **High** |
| **FR-TX-05** | Sistem mendukung transisi status lengkap: `Requested` ➡️ `Approved` ➡️ `In Transit` ➡️ `In Progress` ➡️ `Returning` ➡️ `Completed` (serta `Rejected` dan `Cancelled`). | **High** |
| **FR-TX-06** | **Logika Restorasi Lokasi Peminjaman:** Saat transaksi `Borrowing` diselesaikan (`Completed` oleh Admin IT), sistem **secara otomatis mengembalikan `site_alias` fisik aset ke gudang asal (`from_site_code`)**. | **High** |
| **FR-TX-07** | **Logika Mutasi:** Saat transaksi `Mutation` diselesaikan, sistem memindahkan `site_alias` fisik aset secara permanen ke lokasi tujuan (`to_site_code`). | **High** |
| **FR-TX-08** | Pengguna Toko/Peminjam dapat menekan tombol **"Kembalikan Unit (Return)"** pada status `In Progress` yang mengubah status menjadi `Returning`. | **High** |
| **FR-TX-09** | Admin IT melihat tombol **"Terima di Gudang"** pada status `Returning` untuk menyelesaikan transaksi dan memeriksa fisik unit. | **High** |

### 7.3 Modul Persetujuan Wilayah & Bot Webhook

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-APV-01** | Tombol persetujuan (**"Setujui"** & **"Tolak"**) pada antarmuka web hanya dapat dieksekusi oleh Admin yang memiliki `assigned_region` sama dengan region lokasi tujuan (`to_site_region`). | **High** |
| **FR-APV-02** | Pengguna dengan role **Super Admin** (`assigned_region = 'ALL'`) memiliki hak akses untuk menyetujui transaksi dari/ke wilayah manapun. | **High** |
| **FR-APV-03** | **Interactive Telegram Bot Approval:** Sistem (via Edge Function `telegram-bot`) mengirimkan pesan notifikasi transaksi ke grup/chat Admin IT lengkap dengan tombol interaktif (*Inline Keyboard*). | **High** |
| **FR-APV-04** | Admin IT dapat menyetujui (`Approve`) atau menolak (`Reject`) transaksi langsung dari Telegram chat tanpa harus membuka aplikasi web. | **High** |
| **FR-APV-05** | **Automated Overdue Cron:** Sistem (via Edge Function `cron-overdue`) mengecek harian seluruh transaksi pinjam yang melewati `due_date` dan transaksi `In Transit` > 3 hari, lalu mengirimkan rekap peringatan ke Admin Region terkait. | **High** |

### 7.4 Modul Stock Opname (Audit Fisik Hybrid)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-OPN-01** | Sistem memfasilitasi pembuatan sesi audit fisik (*Stock Opname*) berbasis lokasi (Site). | **High** |
| **FR-OPN-02** | Sistem menyediakan fitur **Pemindai Kamera QR/Barcode** bawaan untuk mencocokkan aset secara cepat. | **High** |
| **FR-OPN-03** | **Manual S/N Fallback:** Sistem menyediakan kolom input teks pencarian Serial Number manual (+ tombol Enter) untuk menangani stiker barcode yang rusak/terkelupas di lapangan. | **High** |
| **FR-OPN-04** | Setiap aset dalam sesi opname diklasifikasikan ke dalam salah satu status: `Ditemukan`, `Nyasar` (ada di site tapi terdaftar di site lain), atau `Hilang` (terdaftar tapi tidak ditemukan). | **High** |
| **FR-OPN-05** | Sistem menyajikan *progress bar* visual real-time yang memisahkan jumlah aset terverifikasi vs belum terverifikasi. | **Medium** |
| **FR-OPN-06** | Kompatibilitas scanner memiliki *fallback* otomatis ke kamera video HTML5 (zxing) jika versi SDK Telegram di bawah v6.4. | **Medium** |

### 7.5 Modul Pemusnahan Aset & Usulan Afkir (Bulk Disposal)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-DSP-01** | Sistem menyediakan modul pemusnahan massal (*Bulk Disposal*) khusus role Super Admin / Admin IT untuk mengubah status aset menjadi `Disposed`. | **High** |
| **FR-DSP-02** | **Export Daftar Usulan (Draft CSV):** Sistem menyediakan fitur untuk memilih daftar aset rusak/afkir dan mengekspor daftarnya ke format Excel/CSV tanpa mengeksekusi perubahan status di database. | **High** |
| **FR-DSP-03** | Draft usulan digunakan sebagai lampiran formal pengajuan tanda tangan persetujuan fisik kepada manajemen atasan sebelum eksekusi sistem. | **High** |
| **FR-DSP-04** | Sistem secara otomatis mencetak berkas BAST Pemusnahan Aset digital saat eksekusi disposal dijalankan. | **Medium** |

### 7.6 Modul Pelaporan, Analitik & Generator BAST

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-REP-01** | Dashboard analitik menampilkan Area Chart tren mutasi 12 bulan terakhir, Donut Chart proporsi status aset, dan Bar Chart peringkat utilisasi peminjaman cabang. | **High** |
| **FR-REP-02** | Sistem menyediakan **Generator BAST Digital** yang terformat rapi, dilengkapi spesifikasi lengkap unit, identitas para pihak, dan slot tanda tangan digital siap cetak/simpan PDF. | **High** |
| **FR-REP-03** | Sistem menyediakan **Generator Label Pengiriman (Shipping Label)** siap cetak untuk ditempel pada koli pengiriman unit backup. | **Medium** |
| **FR-REP-04** | Sistem mendukung fitur **Export ke Google Sheets** dan unduh file CSV Excel dengan format UTF-8 BOM untuk kompatibilitas karakter sempurna di Microsoft Excel. | **Medium** |
| **FR-REP-05** | Sistem menyediakan fitur **Disaster Recovery & Backup** bagi Super Admin untuk mengunduh snapshot database lengkap dalam format JSON. | **Low** |

### 7.7 Modul Impor Massal CSV & Validasi Strict

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-IMP-01** | Khusus Admin, sistem menyediakan fasilitas unggah massal inventaris aset melalui berkas CSV. | **High** |
| **FR-IMP-02** | Sistem menerapkan **Strict Validation** terhadap kolom kategori dan site alias yang diproteksi langsung oleh Trigger PostgreSQL (`handle_asset_category_strict_sync`). | **High** |
| **FR-IMP-03** | UI uploader menyediakan antarmuka pemetaan interaktif jika ditemukan ketidakcocokan nama kategori (opsi: hubungkan ke kategori resmi, buat kategori baru, atau lewati/skip). | **High** |
| **FR-IMP-04** | Operasi database menggunakan metode **UPSERT** berbasis `serial_number` sehingga aman dari duplikasi saat pengunggahan ulang berkas yang sama. | **High** |
| **FR-IMP-05** | Pengunggahan berkas besar diproses menggunakan teknik **Batch Chunking (250 baris per request)** guna mencegah timeout jaringan dan error payload limit. | **High** |

### 7.8 Modul Autentikasi Ganda & Manajemen Pengguna (RBAC)

| ID Kebutuhan | Deskripsi Fungsional | Prioritas |
|---|---|:---:|
| **FR-AUT-01** | **Telegram Auto-Login:** Pengguna yang membuka aplikasi dari Telegram Mini App otomatis terotentikasi berdasarkan Telegram ID tanpa perlu memasukkan password. | **High** |
| **FR-AUT-02** | **Web Browser Login:** Pengguna di browser desktop dapat login menggunakan `@username` atau Telegram ID + Password yang diverifikasi via RPC PostgreSQL `SECURITY DEFINER` dengan hash bcrypt. | **High** |
| **FR-AUT-03** | Pengguna berstatus `Guest` dapat menekan tombol **"Request Akses Tim IT"** pada menu profil untuk mengajukan peningkatan akun. | **High** |
| **FR-AUT-04** | Bot Telegram mengirimkan notifikasi permintaan akses ke grup Admin dengan tombol 1-klik (`✅ Setujui User`, `👑 Setujui Admin`, `❌ Tolak`). | **High** |
| **FR-AUT-05** | Admin dapat menetapkan role (`guest`, `user`, `admin`) dan pemetaan wilayah kerja (`assigned_region`) pada panel Manajemen User. | **High** |

---

## 8. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 8.1 Performa & Keandalan (Performance & Reliability)
- **NFR-PF-01:** Waktu muat awal aplikasi (*Initial Page Load*) harus tercapai dalam **< 2.5 detik** pada koneksi internet seluler 4G standar.
- **NFR-PF-02:** Komponen auto-complete pencarian lokasi (`SiteSearchInput`) harus merespons dalam **< 150 ms** untuk volume 2.000+ data site tanpa lag antarmuka.
- **NFR-PF-03:** Proses batch import 6.000+ baris data CSV harus diselesaikan dalam waktu **< 3 menit** dengan visual feedback progress bar yang akurat.

### 8.2 Keamanan & Integritas Data (Security & Data Integrity)
- **NFR-SC-01:** Seluruh tabel database dilindungi oleh kebijakan **Row Level Security (RLS)** PostgreSQL.
- **NFR-SC-02:** Password akses web wajib disimpan dalam format **hash bcrypt** (salt rounds 10+) dan tidak boleh dapat dibaca dalam bentuk plaintext oleh siapapun termasuk admin database.
- **NFR-SC-03:** Kredensial rahasia (`.env`, service role key, bot token) dilarang keras di-commit ke repositori publik/version control.
- **NFR-SC-04:** Trigger PostgreSQL wajib memblokir setiap transaksi penulisan aset yang mereferensikan kategori tidak terdaftar (`RAISE EXCEPTION`).

### 8.3 Skalabilitas (Scalability)
- **NFR-SK-01:** Pangkalan data dan backend Supabase dirancang mampu menampung hingga **50.000+ aset** dan **100.000+ riwayat transaksi** tanpa penurunan performa indeks query.
- **NFR-SK-02:** Arsitektur frontend modular berbasis Atomic Design System memudahkan penambahan jenis transaksi atau modul baru di masa mendatang.

### 8.4 Aksesibilitas & Kompatibilitas UI/UX
- **NFR-UX-01:** Antarmuka mendukung **Mode Gelap (Dark Mode)** dan **Mode Terang (Light Mode)** otomatis mengikuti tema perangkat pengguna atau saklar manual.
- **NFR-UX-02:** Layout aplikasi sepenuhnya responsif (*mobile-first*) dengan batas minimum viewport 320px (perangkat smartphone kecil).
- **NFR-UX-03:** Kompatibel dengan klien Telegram iOS, Android, Desktop, serta browser modern (Chrome, Safari, Firefox, Edge).

---

## 9. Arsitektur Sistem & Integrasi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT ACCESS LAYER                           │
│                                                                         │
│   ┌───────────────────────────────┐   ┌─────────────────────────────┐   │
│   │   Telegram Mini App (TMA)     │   │   Web Browser (PC/Desktop)  │   │
│   │   (Auto-Login via SDK ID)     │   │   (Username + bcrypt Pass)  │   │
│   └───────────────┬───────────────┘   └──────────────┬──────────────┘   │
│                   │                                  │                  │
│                   └────────────────┬─────────────────┘                  │
│                                    ▼                                    │
│                    ┌───────────────────────────────┐                    │
│                    │    React 19 + TypeScript UI   │                    │
│                    │  (Vite + Tailwind CSS + UI)   │                    │
│                    └───────────────┬───────────────┘                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │ HTTPS / REST (PostgREST)
┌────────────────────────────────────┼────────────────────────────────────┐
│                        SUPABASE BACKEND LAYER                           │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      PostgreSQL Database                        │   │
│   │  - Row Level Security (RLS) Policies                            │   │
│   │  - Master Tables: assets, sites, categories, users              │   │
│   │  - Transaction Table: asset_transactions                        │   │
│   │  - Audit Tables: stock_opname, stock_opname_details             │   │
│   │  - Strict Sync Triggers: handle_asset_category_strict_sync      │   │
│   │  - RPC Auth & View Layer: view_assets_detail, web_auth_rpc      │   │
│   └────────────────────────────────┬────────────────────────────────┘   │
│                                    │                                    │
│   ┌────────────────────────────────┴────────────────────────────────┐   │
│   │                    Serverless Edge Functions                    │   │
│   │  - `telegram-bot`: Notification & Inline Webhook Approval       │   │
│   │  - `cron-overdue`: Daily Scheduled Job (Overdue & In-Transit)   │   │
│   └────────────────────────────────┬────────────────────────────────┘   │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │ Telegram Bot API
┌────────────────────────────────────┼────────────────────────────────────┐
│                       EXTERNAL INTEGRATIONS                             │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      Telegram Bot Platform                      │   │
│   │  - Notifikasi Pengajuan Transaksi ke Grup Admin IT              │   │
│   │  - Tombol Persetujuan 1-Klik (Inline Keyboard Callback)         │   │
│   │  - Notifikasi Peringatan Keterlambatan Pengembalian (Overdue)   │   │
│   │  - Notifikasi Persetujuan Hak Akses User Baru (Guest ➡️ User)   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Model Data & State Machine Transaksi

### 10.1 Skema Data Entitas Utama

```
                     ┌──────────────────┐
                     │      SITES       │
                     │──────────────────│
                     │ site_code (PK)   │
                     │ site_name        │
                     │ site_alias (UQ)  │
                     │ region           │
                     │ site_address     │
                     └────────┬─────────┘
                              │ 1
                              │
                              │ N (via site_alias)
┌──────────────────┐ 1      N ┌┴─────────────────┐ 1      N ┌────────────────────────┐
│MASTER_CATEGORIES │──────────┤  MASTER_ASSETS   ├──────────┤   ASSET_TRANSACTIONS   │
│──────────────────│          │──────────────────│          │────────────────────────│
│ id (PK)          │          │ id (PK)          │          │ id (PK)                │
│ name (UQ)        │          │ serial_number(UQ)│          │ transaction_code       │
│ icon             │          │ aktiva           │          │ transaction_type       │
│ color_text       │          │ category_id (FK) │          │ status                 │
│ color_bg         │          │ brand, model     │          │ asset_id (FK)          │
└──────────────────┘          │ computer_name    │          │ from_site_code (FK)    │
                              │ site_alias (FK)  │          │ to_site_code (FK)      │
                              │ status           │          │ requested_by (FK)      │
                              │ deleted_at       │          │ duration_days          │
                              └──────────────────┘          │ due_date               │
                                                            │ requested_at ...       │
                                                            └────────────────────────┘
```

### 10.2 State Machine Transaksi Peminjaman (Borrowing Lifecycle)

```
 [User / Toko]
   Membuat Permohonan Pinjam (Isi Site & Durasi Hari)
         │
         ▼
    ┌───────────┐
    │ Requested │ ◄── [User / Admin dapat Cancel]
    └─────┬─────┘
          │
          │ Admin Region / Super Admin (via Web / Telegram Inline Button)
          ▼
    ┌───────────┐
    │ Approved  │ ◄── [Admin tetapkan S/N Unit Backup]
    └─────┬─────┘
          │
          │ Admin IT Kirim Barang (Input Resi / Ekspedisi)
          ▼
    ┌────────────┐
    │ In Transit │
    └─────┬──────┘
          │
          │ Toko Klik "Terima Unit" (Sistem otomatis hitung Due Date)
          ▼
    ┌─────────────┐
    │ In Progress │ ◄── [Status fisik unit: Borrowed di Toko]
    └─────┬───────┘     [Cron memantau H-3 & Overdue harian]
          │
          │ Toko Klik "Kembalikan Unit" (Barang dipaketkan balik ke IT)
          ▼
    ┌───────────┐
    │ Returning │
    └─────┬─────┘
          │
          │ Admin IT Cek Fisik di Gudang & Klik "Terima di Gudang"
          ▼
    ┌───────────┐
    │ Completed │ ◄── [Sistem OTOMATIS reset lokasi fisik ke GUDANG ASAL]
    └───────────┘
```

### 10.3 State Machine Transaksi Mutasi (Mutation Lifecycle)

```
 [Teknisi IT]
   Pilih Aset & Lokasi Tujuan Baru
         │
         ▼
    ┌───────────┐
    │ Requested │
    └─────┬─────┘
          │
          │ Admin Region Tujuan Approve
          ▼
    ┌───────────┐
    │ Approved  │
    └─────┬─────┘
          │
          │ Pengiriman Fisik
          ▼
    ┌────────────┐
    │ In Transit │
    └─────┬──────┘
          │
          │ Penerima di Site Tujuan Konfirmasi Terima
          ▼
    ┌───────────┐
    │ Completed │ ◄── [Sistem memindahkan site_alias PERMANEN ke Site Tujuan]
    └───────────┘
```

---

## 11. Matriks Peran & Hak Akses (RBAC Matrix)

| Modul & Fitur | Guest | User (Toko) | Admin Regional | Super Admin (HQ) |
|---|:---:|:---:|:---:|:---:|
| Melihat Daftar & Detail Aset | ✅ | ✅ | ✅ | ✅ |
| Tambah & Edit Aset | ❌ | ❌ | ✅ (Regionnya) | ✅ (Semua) |
| Soft Delete Aset | ❌ | ❌ | ❌ | ✅ |
| Import Massal CSV Aset | ❌ | ❌ | ❌ | ✅ |
| Mengajukan Peminjaman Unit | ✅ | ✅ | ✅ | ✅ |
| Mengajukan Mutasi Aset | ❌ | ✅ | ✅ | ✅ |
| Menyetujui Transaksi (Web & Bot) | ❌ | ❌ | ✅ (Region Tujuan) | ✅ (Bypass Semua) |
| Konfirmasi Terima Barang (`In Progress`) | ❌ | ✅ (Toko Terkait) | ✅ | ✅ |
| Menginisiasi Retur (`Returning`) | ❌ | ✅ (Toko Terkait) | ✅ | ✅ |
| Menyelesaikan Transaksi Retur (`Completed`) | ❌ | ❌ | ✅ (Gudang Asal) | ✅ |
| Ekspor Usulan Afkir (Draft CSV) | ❌ | ❌ | ✅ | ✅ |
| Eksekusi Pemusnahan Aset (`Disposed`) | ❌ | ❌ | ❌ | ✅ |
| Melakukan Audit Stock Opname | ❌ | ❌ | ✅ (Regionnya) | ✅ (Semua) |
| Cetak Dokumen BAST & Label Pengiriman | ❌ | ✅ | ✅ | ✅ |
| Akses Dashboard & Laporan Analitik | ❌ | ✅ (Terbatas) | ✅ | ✅ |
| Manajemen User & Penugasan Wilayah | ❌ | ❌ | ❌ | ✅ |
| Unduh Database Backup JSON | ❌ | ❌ | ❌ | ✅ |

---

## 12. Alur Proses Bisnis Utama (Workflow)

### 12.1 SOP Peminjaman Unit Backup Toko (End-to-End)
1. **Pengajuan (Request):** Cabang/Toko mengalami kerusakan hardware kasir/PC. Staf membuka E1-TMA ➡️ Pilih Form Transaksi ➡️ Pilih Kategori Barang ➡️ Masukkan Estimasi Durasi Pinjam (misal: 7 hari) ➡️ Submit.
2. **Notifikasi Bot:** Bot Telegram mengirim alert ke Grup IT Regional bersangkutan dengan ringkasan permohonan.
3. **Persetujuan & Alokasi (Approve & Dispatch):** Admin IT membuka notifikasi di Telegram (atau aplikasi web) ➡️ Memilih serial number unit backup yang siap ➡️ Klik "Setujui" ➡️ Mengirim barang fisik via kurir/logistik internal (status: `In Transit`).
4. **Penerimaan Toko (Receive):** Barang tiba di toko ➡️ Staf toko membuka menu transaksi ➡️ Klik **"Terima Unit"** ➡️ Status berubah `In Progress`, sistem mengunci `due_date = hari_ini + durasi`.
5. **Monitoring & Alerting:** Setiap pukul 08.00 pagi, cron job mengecek durasi pinjam. Jika `hari_ini >= due_date - 3`, sistem mengirim reminder H-3. Jika melewati batas, kartu transaksi berkedip merah (*OVERDUE*) dan mengirim broadcast bot.
6. **Pengembalian (Return):** Mesin utama toko selesai diservis. Staf toko mengemas unit backup ➡️ Membuka transaksi ➡️ Klik **"Kembalikan Unit"** (status: `Returning`).
7. **Penerimaan Gudang & Restorasi (Closing):** Unit tiba di gudang IT. Admin IT mengecek kelengkapan fisik ➡️ Klik **"Terima di Gudang"** ➡️ Transaksi `Completed`. Sistem **secara otomatis mereset lokasi aset fisik kembali ke kode site gudang**.

### 12.2 SOP Pemusnahan Aset Rusak (Bulk Disposal)
1. Admin Regional memfilter aset-aset berstatus rusak/afkir (`Retired`) di gudang.
2. Membuka modal **Bulk Disposal** ➡️ Menandai aset yang akan dimusnahkan ➡️ Klik tombol **"Export Daftar Usulan (CSV Excel)"**.
3. File CSV di-print sebagai lampiran surat usulan pemusnahan resmi untuk meminta persetujuan dan tanda tangan basah General Manager / Direksi.
4. Setelah persetujuan fisik terbit, Super Admin membuka kembali sistem ➡️ Memilih aset sesuai lembar persetujuan ➡️ Klik **"Eksekusi Pemusnahan (Disposed)"**.
5. Sistem mengubah status aset menjadi `Disposed`, mencetak BAST Pemusnahan digital, dan mencatat eksekutor dalam audit trail.

---

## 13. Batasan, Asumsi & Dependensi

### 13.1 Batasan Sistem (Constraints)
- Aplikasi bergantung pada konektivitas jaringan internet untuk sinkronisasi ke Supabase Cloud.
- Pemindaian kamera membutuhkan izin akses perangkat kamera pada Telegram Mini App / browser.
- Eksekusi background cron job bergantung pada ketersediaan resource Supabase Edge Functions & pg_cron.

### 13.2 Asumsi Bisnis (Assumptions)
- Seluruh unit aset fisik memiliki label fisik berupa barcode (Code 128 / Code 39) atau QR Code yang dapat dibaca pemindai.
- Setiap pengguna operasional toko memiliki akun Telegram aktif yang terdaftar di sistem.
- Master data cabang/toko (Sites) telah terpetakan dengan benar ke dalam Region masing-masing sebelum transaksi dijalankan.

### 13.3 Dependensi Eksternal (Dependencies)
- **Telegram Bot API & WebApp SDK:** Untuk platform client, webhook callback, dan pengiriman notifikasi.
- **Supabase Platform:** Penyedia layanan PostgreSQL, Auth, PostgREST API, dan Serverless Deno Edge Functions.

---

## 14. Kriteria Penerimaan Sistem (Acceptance Criteria)

- [x] Pengguna dapat login otomatis via Telegram Mini App serta login form di web browser dengan verifikasi hash bcrypt.
- [x] Sistem mampu memuat dan menampilkan 6.000+ data aset tanpa kendala limit kuota 1.000 baris.
- [x] Transaksi peminjaman berjalan mulus melalui 6 fase (`Requested` ➡️ `Approved` ➡️ `In Transit` ➡️ `In Progress` ➡️ `Returning` ➡️ `Completed`).
- [x] Lokasi aset otomatis kembali ke gudang asal saat peminjaman berstatus `Completed`.
- [x] Admin Region hanya dapat menyetujui transaksi pada wilayahnya, sementara Super Admin dapat menyetujui seluruh wilayah.
- [x] Tombol persetujuan 1-klik di pesan Telegram Bot berfungsi mengupdate status transaksi secara real-time.
- [x] Background cron function mendeteksi dan mengirim laporan harian transaksi overdue dan in-transit tertahan.
- [x] Fitur Stock Opname dapat memindai barcode via kamera serta menyediakan input teks manual nomor seri.
- [x] Fitur Export Usulan Afkir (Draft CSV) menghasilkan file Excel yang rapi sebelum eksekusi pemusnahan massal.
- [x] Import CSV massal memvalidasi kategori secara ketat melalui trigger database dan memproses data dengan batch chunking 250 unit.
- [x] Dokumen BAST digital dan Shipping Label ter-generate dengan format siap cetak.

---

## 15. Glosarium Istilah

| Istilah | Definisi |
|---|---|
| **TMA** | *Telegram Mini App* — Aplikasi web modern yang berjalan terintegrasi di dalam aplikasi Telegram. |
| **Unit Backup** | Perangkat IT cadangan operasional yang disimpan di gudang regional untuk menggantikan unit toko yang rusak sementara waktu. |
| **Aktiva / BTA** | Nomor Bukti Tambah Aktiva — Kode identifikasi pembukuan aset perusahaan. |
| **Site / Toko** | Entitas lokasi fisik operasional cabang atau kantor perusahaan. |
| **Region** | Wilayah teritori administratif yang membawahi sejumlah site/cabang. |
| **Due Date** | Batas tanggal akhir masa pinjam aset sebelum dinyatakan terlambat (*Overdue*). |
| **Overdue** | Kondisi di mana masa peminjaman unit backup telah melewati batas waktu yang disepakati tanpa pengembalian. |
| **Returning** | Status penyerahan di mana unit telah dikemas dan dikirimkan oleh toko menuju gudang IT. |
| **Disposed** | Status aset yang telah resmi dimusnahkan, diafkirkan, atau dikeluarkan dari buku aset aktif. |
| **BAST** | Berita Acara Serah Terima — Dokumen resmi legalitas serah terima perpindahan tanggung jawab aset. |
| **RLS** | *Row Level Security* — Fitur keamanan PostgreSQL yang mengisolasi akses data pada level baris. |
| **UPSERT** | Operasi database gabungan *Update* jika data sudah ada, atau *Insert* jika data belum tercatat. |
| **Edge Function** | Fungsi komputasi serverless yang dieksekusi di edge network dengan latensi rendah. |
| **Inline Keyboard** | Tombol interaktif yang disematkan langsung pada gelembung obrolan bot Telegram. |

---

*Dokumen ini merupakan spesifikasi kebutuhan bisnis resmi untuk sistem E1-TMA per tanggal 27 Agustus 2026.*  
*Diterbitkan dan disahkan oleh Tim Pengembang E1-TMA.*
