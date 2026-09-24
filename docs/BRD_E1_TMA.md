# Business Requirement Document (BRD)
## Odoo Asset & Movement Management Mobile Companion
### (Aplikasi Pendamping Operasional Lapangan untuk Pengelolaan Aset)

---

| **Informasi Dokumen** | **Detail** |
|---|---|
| **Nama Dokumen** | Business Requirement Document (BRD) |
| **Nama Proyek** | Mobile Companion for Odoo Asset Inventory |
| **Versi Dokumen** | 3.0 (End-User Requirements Focus) |
| **Tanggal Pembaruan** | 23 September 2026 |
| **Status** | Approved / Request for Development |
| **Penyusun** | Tim Operasional & Manajemen Aset |

---

## Daftar Isi
1. [Eksekutif & Konsep Dasar Sistem](#1-eksekutif--konsep-dasar-sistem)
2. [Latar Belakang & Masalah Saat Ini](#2-latar-belakang--masalah-saat-ini)
3. [Tujuan Bisnis & Sasaran Proyek](#3-tujuan-bisnis--sasaran-proyek)
4. [Kebutuhan Fungsional (Functional Requirements)](#4-kebutuhan-fungsional-functional-requirements)
5. [Matriks Hak Akses (RBAC Matrix)](#5-matriks-hak-akses-rbac-matrix)
6. [Kriteria Keberhasilan & Penerimaan (Acceptance Criteria)](#6-kriteria-keberhasilan--penerimaan-acceptance-criteria)
7. [Project Cost and Benefit Analysis](#7-project-cost-and-benefit-analysis)
8. [Lampiran: Diagram & Alur Proses Bisnis](#8-lampiran-diagram--alur-proses-bisnis)

---

## 1. Eksekutif & Konsep Dasar Sistem

Sistem pendamping **Odoo Asset Management** ini diminta dan dirancang sebagai aplikasi *mobile-friendly* yang akan digunakan oleh operasional lapangan. Odoo ERP akan tetap menjadi **System of Record** (pusat pembukuan), namun kami membutuhkan **aplikasi eksekusi lapangan** yang sangat ringan, mudah diakses melalui *smartphone*, dan terintegrasi dengan media sosial (WhatsApp / Telegram) untuk persetujuan cepat.

Kami menyerahkan sepenuhnya keputusan arsitektur, platform teknis, penanganan kerancuan, serta metode sinkronisasi data kepada Tim Developer Odoo. Fokus dokumen ini murni menjabarkan **hasil akhir yang diharapkan oleh End-User** di lapangan.

---

## 2. Latar Belakang & Masalah Saat Ini

Pada awalnya, seluruh pendataan inventaris aset TI mengandalkan sistem **Odoo**. Meskipun Odoo sangat kuat untuk pencatatan tingkat korporat, tim lapangan di 300+ lokasi kami menghadapi berbagai hambatan praktis:
- **Kurang *Mobile-Friendly* untuk Staf Toko:** Mengakses Odoo melalui *browser smartphone* di toko sangat tidak praktis dan sulit untuk navigasi bagi staf lapangan.
- **Ketiadaan Pemindai Barcode Kamera Bawaan yang Praktis:** Odoo standar menuntut penggunaan *barcode scanner* fisik atau terminal industri khusus (PDT) yang mahal. Tidak mungkin menyediakan alat ini di ratusan toko hanya untuk kebutuhan insidental.
- **Sirkulasi Mesin *Backup* Tidak Terpantau:** Odoo mencatat perpindahan stok secara generik, namun tidak ada *workflow* terpandu untuk pinjam-pakai darurat unit *backup*, sehingga banyak aset yang tertahan di toko tanpa kejelasan (tidak ada peringatan *OVERDUE*).
- **Komunikasi Persetujuan yang Lambat:** Notifikasi persetujuan mutasi di Odoo berbasis email atau harus membuka modul web Odoo. Hal ini memperlambat respon saat toko mengalami keadaan darurat mesin kasir/PC mati.

---

## 3. Tujuan Bisnis & Sasaran Proyek

| No | Sasaran Bisnis | Indikator Keberhasilan (KPI) |
|----|----------------|------------------------------|
| 1 | **Dashboard & Visibilitas** | Tersedianya *Home Dashboard* dengan grafik/kartu yang memudahkan pemantauan status unit secara *real-time*. |
| 2 | **Pemanfaatan Kamera Smartphone** | Eliminasi kebutuhan *scanner* fisik; pemindaian barcode/QR wajib dapat menggunakan kamera *smartphone* staf. |
| 3 | **Kemudahan Tindakan Massal (Bulk Action)** | Tersedianya menu untuk memindahkan, mengganti, atau mengusulkan pemusnahan banyak unit *equipment* sekaligus dengan mudah. |
| 4 | **Kontrol Unit Cadangan** | Mengurangi kasus mesin yang tertahan menjadi **0 kasus** melalui siklus peminjaman yang termonitor ketat (pengingat batas waktu/due date). |
| 5 | **Kecepatan Persetujuan** | SLA persetujuan mutasi/peminjaman turun dari hitungan hari menjadi **< 15 menit** berkat integrasi notifikasi WA/Telegram. |

---

## 4. Kebutuhan Fungsional (Functional Requirements)

### 4.1 Modul Pemindaian (Scanning) & Pencarian
- Sistem harus mampu memanfaatkan **kamera *smartphone* pengguna** (baik via WebApp maupun Native) untuk memindai QR Code dan Barcode pada fisik aset.
- Harus terdapat fitur *fallback* berupa pencarian manual (mengetikkan nomor seri) apabila stiker rusak atau kamera tidak berfungsi.

### 4.2 Home Dashboard (Monitoring Terpusat)
- Sistem harus memiliki *Dashboard* halaman depan yang menampilkan **kartu (cards) atau grafik (charts)** berisi statistik aset (Contoh: jumlah unit aktif, jumlah unit *backup* di gudang, jumlah unit rusak/perlu diafkir).
- Menampilkan peringatan (*alert*) untuk transaksi pinjaman yang akan atau sudah melewati jatuh tempo.

### 4.3 Modul Transaksi & Tindakan Massal (Bulk Actions)
- **Kemudahan Bulk Action:** Harus tersedia menu yang memudahkan pengguna ketika harus **memindahkan (mutasi), mengganti, atau mengusulkan pemusnahan (disposal)** banyak unit *equipment* sekaligus tanpa perlu mengklik satu per satu.
- **Otomasi Lokasi:** Ketika transaksi diselesaikan (*Completed*), sistem harus secara otomatis memindahkan lokasi aset tersebut di catatan inventaris Odoo.
- **Pembuatan BAST Digital:** Sistem harus dapat menghasilkan Berita Acara Serah Terima secara otomatis yang dapat diunduh (PDF) setelah transaksi selesai.

### 4.4 Modul Monitoring Peminjaman Unit Backup (Strict Lifecycle)
- Siklus peminjaman unit *backup* ke toko harus **benar-benar termonitoring**.
- Toko wajib mengisi "Durasi Pinjam (Hari)" saat mengajukan.
- Sistem harus mulai menghitung mundur (*countdown*) saat unit diterima oleh toko, dan mengirimkan peringatan otomatis ke WA/Telegram saat mendekati atau melewati jatuh tempo (*Overdue*).

### 4.5 Modul Persetujuan via Media Sosial (WA / Telegram)
- Pengajuan dari toko harus langsung memicu notifikasi (*alert*) ke grup atau *chat* WhatsApp/Telegram milik tim IT / Manajemen Regional.
- Pihak manajemen harus bisa **menyetujui atau menolak dengan cepat** langsung dari notifikasi tersebut (atau melalui tautan cepat yang *mobile-friendly*), tanpa harus melewati proses login *desktop* yang rumit.

### 4.6 Modul Stock Opname
- Pengguna di 300+ cabang harus bisa melakukan *Stock Opname* berkala dengan men-scan aset di lokasi mereka.
- Hasil *Stock Opname* harus dikumpulkan menjadi "Draft Rekonsiliasi" yang membutuhkan persetujuan Manajemen sebelum secara efektif merubah master data. Jika ada aset yang diusulkan musnah (*Disposal*) saat opname, bisa langsung terintegrasi.

---

## 5. Matriks Hak Akses (RBAC Matrix)

| Modul / Tindakan | Staf Lapangan / Toko | Admin Regional / IT | Super Admin (HQ) |
|---|:---:|:---:|:---:|
| Melihat Daftar & Status Aset | ✅ | ✅ | ✅ |
| Scan Barcode via Kamera HP | ✅ | ✅ | ✅ |
| Mengajukan Peminjaman/Mutasi/Replace | ✅ | ✅ | ✅ |
| Menyetujui Transaksi (Approve/Reject) | ❌ | ✅ (Khusus Regionnya) | ✅ (Semua Region) |
| Melakukan Stock Opname | ✅ | ✅ | ✅ |
| Mengajukan Usulan Pemusnahan (Disposal) | ❌ | ✅ | ✅ |
| Mengeksekusi Pemusnahan Akhir | ❌ | ❌ | ✅ |

---

## 6. Kriteria Keberhasilan & Penerimaan (Acceptance Criteria)

- [x] Antarmuka aplikasi sangat ramah seluler (*mobile-friendly*) dan mudah dipelajari oleh staf lapangan.
- [x] Pemindaian barcode/QR aset dapat dilakukan murni menggunakan kamera *smartphone* bawaan pengguna.
- [x] Terdapat antarmuka yang memudahkan proses *Bulk Action* (mutasi, pemusnahan massal, atau penggantian).
- [x] Alur peminjaman unit backup termonitoring secara ketat batas waktunya dan memiliki notifikasi keterlambatan.
- [x] Tersedia *Home Dashboard* interaktif (*charts/cards*) untuk manajemen aset.
- [x] Notifikasi dan persetujuan transaksi dapat dilakukan secara instan melalui integrasi WA atau Telegram.

---

## 7. Project Cost and Benefit Analysis

### Cost (Current Process)
Dengan asumsi operasional manajemen aset di 300 *store* dan biaya tenaga kerja sebesar Rp 8.000.000 per bulan, estimasi *effort* administrasi manual (pencatatan mutasi, pelacakan unit, pembuatan BAST, dan pelaksanaan *Stock Opname*) yang dibutuhkan adalah:
- 4 jam per *store* per tahun
- 1.200 jam per tahun (untuk 300 *store*)
- Setara dengan biaya operasional sebesar **Rp 54.545.000 per tahun**
*(Catatan: Biaya ini belum mencakup CAPEX untuk pengadaan hardware barcode scanner fisik senilai estimasi minimal Rp 1.500.000 untuk 300 toko = ~Rp 450.000.000).*

### Benefit (New Mobile Application)
Dengan implementasi aplikasi baru pendamping Odoo ini, sebagian besar aktivitas pemantauan (Dashboard), rekonsiliasi opname via kamera, pelaporan (BAST), dan persetujuan (WA/Telegram) dilakukan secara terpusat dan otomatis.
Estimasi *effort* menjadi:
- 1 jam per *store* per tahun
- 300 jam per tahun (untuk 300 *store*)
- Setara dengan biaya operasional sebesar **Rp 13.636.000 per tahun**

### Efficiency
- **Penghematan Waktu & Tenaga Kerja:** Mencapai efisiensi waktu administrasi sebesar **900 jam per tahun** (75% lebih cepat), yang setara dengan penghematan biaya operasional sebesar **Rp 40.909.000 per tahun**.
- **Akselerasi Tindakan Massal (Nilai Tambah Ekstrem):** Bayangkan apabila operasional perlu mengusulkan pemusnahan (*disposal*) sebanyak **9 palet (berisi ratusan unit equipment)**. Tanpa adanya bantuan aplikasi pendamping ini, pendataan manual akan sangat menguras tenaga dan bisa memakan waktu berhari-hari. Melalui menu *Bulk Action* dan fasilitas *scan* kamera, kegiatan masif tersebut bisa diselesaikan hanya dalam hitungan jam saja.
- **Efisiensi Zero-CAPEX:** Perusahaan terhindar dari pengadaan alat *barcode scanner* fisik untuk ratusan toko senilai minimal **~Rp 450 Juta** karena murni memanfaatkan kamera *smartphone* pengguna.
- **Meminimalkan *Shrinkage*:** Mengurangi biaya penggantian alat akibat aset yang hilang di toko (*loss prevention*) berkat alur monitoring yang ketat dan otomatis.

---

## 8. Lampiran: Diagram & Alur Proses Bisnis

### A. Alur Operasional Penggantian Mesin Rusak Toko
1. **Insiden di Toko:** Mesin toko rusak. Staf toko membuka aplikasi ➡️ Mengajukan pinjaman unit *backup* dengan durasi hari yang dibutuhkan.
2. **Persetujuan Instan:** Notifikasi masuk ke WA/Telegram Admin IT Regional. Admin menyetujui langsung secara instan.
3. **Pengiriman & Serah Terima:** Unit *backup* dikirim. Saat barang tiba, toko menekan "Terima Unit" melalui aplikasi (Sistem mulai menghitung mundur jatuh tempo).
4. **Monitoring:** Jika peminjaman mendekati batas waktu pengembalian, sistem otomatis mengirim alarm peringatan (*Overdue*).
5. **Pengembalian:** Toko mengembalikan barang setelah mesin utama selesai diservis.
6. **Selesai:** Admin IT menerima fisik unit di gudang ➡️ Aplikasi otomatis me-reset lokasi aset kembali ke gudang asal.

### B. Siklus Hidup & State Machine Transaksi

Status Terminal (Tidak dapat diubah): **Completed**, **Rejected**, **Cancelled**.

```
[1. REQUESTED]   : Pengajuan (Peminjaman wajib isi Durasi Hari).
       │           (Dapat ditolak menjadi REJECTED atau CANCELLED)
       ▼
[2. APPROVED]    : Admin Region menyetujui secara instan (WA/Telegram / Web).
       │
       ▼
[3. IN TRANSIT]  : Admin IT kirim fisik barang & input nomor resi.
       │
       ▼
[4. IN PROGRESS] : Unit diterima di lokasi. (Pada Peminjaman, Tanggal Jatuh Tempo dikunci).
       │
       ├─────────────────────────────────────────────────┐
       │ (Khusus Peminjaman)                             │ (Khusus Mutasi Permanen/Replace)
       ▼                                                 │
[5. RETURNING]   : Toko mengirim balik unit ke IT.         │
       │                                                 │
       ▼                                                 ▼
[6. COMPLETED]   : Aset dikonfirmasi. Lokasi otomatis disesuaikan 
                   (Direstorasi ke asal untuk Pinjaman, pindah permanen untuk Mutasi).
```

---
*Dokumen ini merupakan spesifikasi kebutuhan bisnis (BRD Versi 3.0) yang ditujukan sebagai permintaan pengembangan (Request for Development) kepada Tim Odoo Developer internal perusahaan per 23 September 2026.*
