# Business Requirements Document (BRD)
**Project Name:** E1-TMA (Enterprise IT Asset Inventory - Telegram Mini App)  
**Document Version:** 1.0  
**Date:** 27 Agustus 2026  

---

## 1. Executive Summary
**E1-TMA** adalah sebuah sistem manajemen inventaris aset TI (IT Asset Management) tingkat *enterprise* yang diakses secara langsung melalui antarmuka **Telegram Mini App (TMA)**. Sistem ini dirancang untuk mengatasi permasalahan pelacakan aset fisik (seperti laptop, PC, printer, scanner) yang tersebar di berbagai kantor cabang (Toko/Site) dan wilayah operasional (*Region*). 

Sistem ini memfasilitasi pencatatan data aset, siklus hidup mutasi dan peminjaman unit *backup*, serta audit fisik (*Stock Opname*) terintegrasi yang mudah diakses oleh tim IT Gudang maupun pengguna akhir (Toko) hanya dengan menggunakan aplikasi Telegram.

---

## 2. Business Objectives
1. **Akurasi Data Aset:** Memastikan seluruh data aset TI tercatat secara terpusat dengan informasi lokasi (Site) yang presisi dan *real-time*.
2. **Efisiensi Proses Peminjaman & Mutasi:** Mengotomatiskan alur permohonan, persetujuan (*approval*), pengiriman, hingga pengembalian aset antar cabang/gudang.
3. **Peningkatan Akuntabilitas Audit:** Mempermudah pelaksanaan audit fisik bulanan/tahunan (*Stock Opname*) menggunakan pemindai QR/Barcode bawaan perangkat.
4. **Notifikasi & Peringatan Dini:** Mengurangi risiko kehilangan aset *backup* dengan peringatan otomatis via Telegram untuk aset yang terlambat dikembalikan (*Overdue*) atau tertahan dalam pengiriman (*Stuck in Transit*).

---

## 3. Scope of the System (Ruang Lingkup)

### 3.1. In-Scope (Termasuk dalam Sistem)
- **Master Data Management:** Pengelolaan Master Kategori, Master Site (Lokasi), dan Master Pengguna (Telegram Users).
- **Asset Inventory:** Pencatatan, pembaruan, dan pelabelan status aset (`Active`, `Backup`, `Disposed`, `Retired`).
- **Lifecycle Transactions:** Sistem *workflow* transaksi aset yang mencakup Peminjaman (*Borrowing*), Mutasi (*Mutation*), dan Perbaikan (*Repair*).
- **Barcode/QR Scanner Integration:** Pemindaian kode aset langsung menggunakan kamera *smartphone* dari dalam Telegram.
- **Mass Data Operations:** Impor data massal melalui CSV (dengan sistem validasi *strict*).
- **Role-Based Access Control (RBAC):** Pembatasan hak akses berbasis level (Super Admin, Admin Region, User, Guest).

### 3.2. Out-of-Scope (Tidak Termasuk)
- Manajemen keuangan/depresiasi aset secara akuntansi (sistem hanya fokus pada pelacakan fisik operasional).
- Pengadaan aset / *Procurement module* (Purchasing Order).

---

## 4. User Roles & Permissions

| Role | Deskripsi & Hak Akses |
|------|-----------------------|
| **Super Admin** | Memiliki akses penuh ke seluruh sistem, dapat melihat dan menyetujui transaksi dari/ke seluruh *Region*, melakukan *Bulk Import*, dan manajemen pengguna. |
| **Admin (Region)** | Staf IT / Gudang Regional. Hanya dapat menyetujui transaksi, melakukan *Stock Opname*, dan mengelola aset yang berada pada kewenangan *Region*-nya saja. |
| **User (Store/Karyawan)** | Pengguna di cabang. Dapat melihat aset yang dialokasikan di tokonya, mengajukan peminjaman unit *backup*, serta melakukan konfirmasi penerimaan unit dan pengembalian unit. |
| **Guest** | Pengguna yang belum terverifikasi secara penuh. Hak akses sangat terbatas hanya untuk mengajukan peminjaman. |

---

## 5. Functional Requirements (Kebutuhan Fungsional)

### 5.1. Modul Manajemen Aset
- **FR1.1:** Sistem harus memungkinkan Admin untuk menambah, mengubah, dan menghapus (soft-delete) profil aset.
- **FR1.2:** Sistem harus menyediakan fitur unggah massal (CSV Import) dengan validasi *strict* terhadap nama kategori dan kode site (terproteksi oleh Trigger PostgreSQL).
- **FR1.3:** Sistem harus mengizinkan Admin untuk melakukan *Bulk Disposal* (Penghapusan Massal) aset yang sudah afkir.

### 5.2. Modul Transaksi (Peminjaman & Mutasi)
Sistem harus mematuhi alur *state-machine* transaksi berikut:
- **`Requested`**: Peminjam (User/Guest) mengajukan permintaan unit.
- **`Approved`**: Admin (sesuai wilayah) menyetujui permohonan dan menetapkan nomor seri unit.
- **`In Transit`**: Admin melakukan *dispatch* (pengiriman unit ke toko).
- **`In Progress`**: User (Toko) mengklik "Terima Unit" di aplikasi (Memicu perhitungan *Due Date* peminjaman).
- **`Returning`**: User mengeklik "Kembalikan Unit" setelah selesai digunakan (Pengiriman kembali ke IT).
- **`Completed`**: Admin IT mengklik "Terima di Gudang" yang akan secara otomatis memindahkan *site_alias* aset kembali ke gudang di *database*.

### 5.3. Modul Stock Opname (Audit Fisik)
- **FR3.1:** Sistem harus memfasilitasi pembuatan tiket Stock Opname berdasarkan *Site*.
- **FR3.2:** Sistem harus menyediakan fitur pemindaian QR Code (Kamera Telegram) untuk memverifikasi aset, menandai sebagai `Ditemukan`, `Hilang`, atau `Nyasar`.

### 5.4. Modul Notifikasi & Background Jobs (Cron)
- **FR4.1:** Sistem (melalui *Supabase Edge Functions*) harus mengecek setiap hari secara otomatis untuk transaksi peminjaman yang melewati tenggat waktu (*Overdue*).
- **FR4.2:** Sistem harus mendeteksi transaksi pengiriman (`In Transit`) yang belum dikonfirmasi terima oleh toko melebihi 3 hari.
- **FR4.3:** Sistem harus mengirimkan rekap peringatan (Poin 4.1 & 4.2) secara otomatis melalui bot Telegram ke Admin Region yang bersangkutan.

---

## 6. Non-Functional Requirements (NFR)

- **Platform Dependency:** UI dibangun seutuhnya pada kerangka **Telegram WebApp SDK** untuk mendukung *seamless login* dan ekstraksi *Telegram ID* secara aman.
- **Performance:** Impor CSV dalam jumlah besar (ribuan baris) harus dikerjakan dengan metode *Batch Chunking* (maks 250 baris per *request*) untuk mencegah *timeout* jaringan (*Payload too large*).
- **Security & Data Integrity:**
  - Menggunakan *Row Level Security (RLS)* PostgreSQL untuk mengamankan data per-tenant/per-region.
  - Relasi *Foreign Key* (seperti `category_id`) dijaga oleh *Database Trigger* tingkat enterprise (contoh: `handle_asset_category_strict_sync`) untuk mencegah entri data kotor (typo).
- **Usability:** Antarmuka (UI/UX) harus responsif, menggunakan palet warna yang membedakan dengan jelas status transaksi, dan mendukung fungsionalitas visual baik di Mode Terang (*Light Mode*) maupun Mode Gelap (*Dark Mode*).

---

## 7. Technology Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, FontAwesome 6 Icons.
- **Backend & Database:** Supabase (PostgreSQL), PostgREST API.
- **Background Processes:** Supabase Edge Functions (Deno/TypeScript), pg_cron.
- **Integration:** Telegram Bot API & Telegram Mini App SDK (`window.Telegram.WebApp`).

---
*Dokumen ini merupakan panduan spesifikasi dan acuan bisnis untuk pengembangan lanjutan serta referensi audit kelengkapan fitur dari sistem E1-TMA.*
