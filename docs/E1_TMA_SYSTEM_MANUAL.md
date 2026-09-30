# E1-TMA SYSTEM MANUAL & PROCEDURES
**IT Asset Management — Telegram Mini App**  
**Versi Dokumen:** 1.0 | **Tanggal:** September 2026 | **Klasifikasi:** Dokumen Internal

---

## DAFTAR ISI
1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Arsitektur Teknis](#2-arsitektur-teknis)
3. [Struktur Role & Akses](#3-struktur-role--akses)
4. [Modul & Kapabilitas Sistem](#4-modul--kapabilitas-sistem)
5. [Modal & Dialog Khusus](#5-modal--dialog-khusus)
6. [Prosedur Standar Operasi (SOP)](#6-prosedur-standar-operasi-sop)
7. [Alur Bisnis & State Machine](#7-alur-bisnis--state-machine)
8. [Lapisan Keamanan & Audit](#8-lapisan-keamanan--audit)
9. [Referensi Database (SQL Scripts)](#9-referensi-database-sql-scripts)

---

## 1. Ringkasan Sistem

E1-TMA adalah **Telegram Mini App (TMA)** berbasis **React 19 + TypeScript + Supabase** yang dirancang sebagai sistem manajemen aset TI tingkat enterprise untuk operasi ritel multi-cabang.

**Ruang Lingkup Sistem:**
- Pencatatan dan pemantauan **aset TI** (laptop, printer, router, POS terminal, dll.)
- Pengelolaan **transaksi aset**: mutasi antar cabang, peminjaman unit backup, servis/repair
- **Stock Opname** digital dengan kamera QR/Barcode scanner
- **Rekonsiliasi** berbasis persetujuan untuk menjaga integritas buku besar aset
- **Pemusnahan (Disposal)** aset dengan jejak dokumen resmi (BAST)
- **Pelaporan & Analitik** KPI aset dan peminjaman
- **Notifikasi aktif** via Telegram Bot

---

## 2. Arsitektur Teknis

```
Pengguna Akhir (Telegram / Browser)
            |
    Frontend (React 19 + TS + Vite)
    - 8 Views (Tabs)
    - 19 Modal/Dialog
    - 11 Service Layers
    - Custom Hooks
            |
    Backend (Supabase)
    - PostgreSQL Database
    - PostgREST API
    - Edge Functions (Bot Notif.)
    - Row Level Security (RLS)
    - SQL Views & RPCs (Reporting)
```

**Tabel Database Utama:**

| Tabel | Deskripsi |
|---|---|
| `master_assets` | Buku besar utama semua aset TI |
| `master_categories` | Master kategori aset (37 kategori terseed) |
| `sites` | Master data semua cabang/lokasi |
| `telegram_users` | Data pengguna dengan role & region |
| `asset_transactions` | Log transaksi (Mutation / Borrowing / Repair) |
| `asset_loans` | Siklus pinjaman unit backup (ERP-grade) |
| `asset_movement_logs` | Ledger pergerakan aset immutable (ISO 27001) |
| `field_audit_trails` | Log perubahan field per-kolom (trigger-based) |
| `stock_opname` | Sesi opname beserta scan result |
| `stock_opname_details` | Item scan per sesi |
| `stock_reconciliations` | Draft rekonsiliasi menunggu persetujuan |
| `stock_reconciliation_items` | Rincian item rekonsiliasi |
| `disposal_proposals` | Antrean usulan pemusnahan aset |
| `system_settings` | Konfigurasi dinamis sistem |
| `telegram_group_routes` | Routing notifikasi ke grup Telegram per region |

---

## 3. Struktur Role & Akses

Sistem mengimplementasikan **RBAC (Role-Based Access Control)** tiga tingkat.

| Fitur | Guest (Toko) | User (IT Regional) | Admin (IT Pusat) |
|---|:---:|:---:|:---:|
| Lihat statistik dashboard | YES | YES | YES |
| Lihat detail & riwayat aset | NO | YES | YES |
| Ajukan transaksi baru | NO | YES | YES |
| Setujui/tolak transaksi | NO | YES (region) | YES (semua) |
| Mulai sesi opname | NO | YES | YES |
| Usulkan pemusnahan aset | NO | NO | YES |
| Setujui pemusnahan (BAST) | NO | NO | YES |
| Import CSV massal | NO | NO | YES |
| Kelola akun pengguna | NO | NO | YES |
| Akses Pengaturan Super Admin | NO | NO | YES |
| Rekonsiliasi Opname | NO | NO | YES |
| Akses Laporan & Analitik | NO | YES (region) | YES (semua) |

> **Catatan RBAC Regional:** User dengan `assigned_region` hanya dapat menyetujui transaksi ke wilayah yang menjadi tanggung jawabnya.

---

## 4. Modul & Kapabilitas Sistem

### 4.1 Dashboard (Beranda)
**Navigasi:** Tab Beranda

**Kapabilitas:**
- **KPI Cards Interaktif** — 4 kartu statistik: Total Aset, Aktif, Backup, Dipinjam. Klik untuk masuk ke daftar aset terfilter.
- **Breakdown Kategori** — Aset dikelompokkan berdasarkan kategori (Komputer, Jaringan, Printer, Audio/Visual, Mobile, dll.)
- **Filter Region** — Admin dapat memfilter tampilan berdasarkan wilayah.
- **Recent Movements** — Feed aktivitas transaksi 7 hari terakhir dengan timestamp relatif.
- **Search Terintegrasi** — Searchbar di header langsung memfilter aset.
- **Skeleton Loading** — Placeholder animasi saat data dimuat.

---

### 4.2 Inventaris Aset (Items View)
**Navigasi:** Klik dari kategori di Dashboard

**Kapabilitas:**
- **Daftar Aset per Region** — RegionCard accordion yang bisa dibuka/ditutup.
- **Status Summary Badge** — Ringkasan jumlah aset per status per region.
- **Filter Multi-Dimensi** — Filter Kategori + Status + Region secara bersamaan.
- **Pencarian Teks** — Real-time filter berdasarkan S/N, Aktiva, Brand, Model.
- **Lazy Rendering** — Region Card belum di-render sebelum dibuka (performa).
- **Click to Detail** — Klik item card membuka ItemDetailModal.

---

### 4.3 Transaksi Aset
**Navigasi:** Tab Transaksi

**Kapabilitas:**
- **Daftar Riwayat Transaksi** — Filter tipe: Semua / Mutation / Borrowing / Repair.
- **Buat Transaksi Baru** — TransactionModal untuk membuat permintaan baru.
- **Proses Status Kontekstual** — Tombol aksi muncul berdasarkan status & role:
  - `Requested` → Admin: Setujui / Tolak
  - `Approved` → Admin: Kirim Unit (In Transit)
  - `In Transit` → Mutation: Terima (Completed) | Borrowing/Repair: Terima (In Progress)
  - `In Progress` → Pemohon/Admin: Kembalikan / Tarik Unit (Admin)
  - `Returning` → Admin: Terima di Gudang (Completed)
  - `Requested` → Pemohon: Batalkan
- **Cetak BAST Kontekstual** — Tombol "Cetak BAST" untuk transaksi aktif.
- **Guest Gate** — Guest memilih Site Alias terlebih dahulu.
- **State Machine Enforcement** — Validasi transisi via stateMachine.ts.

**Tipe Transaksi & Kode:**
| Tipe | Kode | Deskripsi |
|---|---|---|
| Mutation | MUT-DDMMYY-XXXX | Pindah aset permanen antar cabang |
| Borrowing | BRW-DDMMYY-XXXX | Pinjam unit backup sementara |
| Repair | REP-DDMMYY-XXXX | Kirim aset ke vendor servis |

---

### 4.4 Stock Opname
**Navigasi:** Tab Opname

**Dua Tab Mode (Admin):**
- **Sesi Opname** — Scanning fisik aset
- **Antrian Rekonsiliasi** — Tinjau dan setujui draft rekonsiliasi

**Sub-fitur Sesi Opname:**
- Pilih Site Alias tujuan opname
- Progress Bar: persentase aset terscan vs total
- Scan QR/Barcode via kamera (QRScannerModal)
- Input Manual Serial Number (fallback)
- Kategorisasi Scan: Ditemukan / Nyasar / Tidak Ditemukan
- Aset dalam transaksi aktif dikecualikan secara otomatis
- Buat Draft Rekonsiliasi setelah sesi ditutup
- Submit ke antrian Admin

**Sub-fitur Antrian Rekonsiliasi (Admin):**
- Daftar draft rekonsiliasi pending persetujuan
- ReconciliationDetailModal: pilih tindakan per item (Koreksi Lokasi / Tandai Hilang / Usulkan Disposal / No Action)
- Approve mengeksekusi semua perubahan ke database

---

### 4.5 Antrian Afkir / Disposal Queue
**Navigasi:** Tab Afkir (Admin Only)

**Kapabilitas:**
- Daftar semua usulan afkir yang menunggu persetujuan
- Filter per Region, sorting berdasarkan Tanggal/Region/Kategori
- Seleksi massal (checkbox)
- Preview detail aset, alasan pemusnahan
- Persetujuan massal + cetak BAPA (Berita Acara Pemusnahan Aset)
- Status aset otomatis berubah ke `Disposed` setelah disetujui

---

### 4.6 Profil & Pengaturan Pengguna
**Navigasi:** Tab Profil

**Semua Role:**
- Info profil, nama, role, metode login (Telegram/Web)
- Toggle tema Gelap/Terang
- Set/ubah password web (hanya jika login via Telegram)
- Info koneksi sesi

**User & Admin:**
- Alert Overdue: daftar pinjaman melewati jatuh tempo (urgency color coded)
- Export ke Google Sheets via webhook
- Laporan & Analitik (link ke ReportView)
- Sinkronisasi Data (hard refresh)

**Admin Only:**
- Backup & Export Data (CSV + JSON snapshot)
- Manajemen Akun & Region IT (badge: jumlah request pending)
- Pemusnahan Massal & BAST
- Tes Notifikasi Bot Telegram
- Pengaturan Super Admin (link ke SettingsView)

---

### 4.7 Pusat Laporan & Analitik
**Navigasi:** Profil → Laporan & Analitik

**4 Tab Utama:**

**Tab KPI Dashboard:**
- 9 KPI Cards: Total Aset, Aktif, Borrowed, Overdue, Utilization Rate %, On-Time Return Rate %, rata-rata durasi pinjam
- Area Chart: Trend Mutasi 12 Bulan (Total/Selesai/Pending/Ditolak)
- Pie Chart: Distribusi Status Aset
- Ranking 10 Site teratas berdasarkan volume peminjaman + completion rate
- Filter Region (locked ke region untuk IT User)

**Tab Laporan Pinjaman:**
- Filter: Region, Rentang Tanggal, Status
- Tabel detail semua pinjaman
- Export CSV (UTF-8 BOM, kompatibel Excel)

**Tab Audit Trail:**
- Cari riwayat pergerakan aset berdasarkan Serial Number
- Kronologi: Tanggal, Tipe Event, Deskripsi, Pelaku, Dari-Ke Lokasi

**Tab Utilisasi Aset:**
- Bar Chart breakdown status per kategori
- Utilization Rate % per kategori

---

### 4.8 Super Admin - Pengaturan Sistem
**Navigasi:** Profil → Pengaturan Super Admin (Admin Only)

**Kapabilitas:**

**SLA & Kebijakan:**
- Batas maksimum hari peminjaman (max_loan_days)
- Pengingat H-X sebelum jatuh tempo
- Toggle eskalasi overdue otomatis
- SLA mutasi antar cabang (max_transfer_days)

**Kontrol Operasional:**
- Freeze semua transaksi baru (dengan alasan wajib)
- Toggle sesi opname global

**Routing Notifikasi Telegram:**
- CRUD routing per region (Nama Grup, Chat ID, Region)

**Webhook Google Sheets:**
- URL endpoint, toggle auto-sync

**Template Notifikasi:**
- Header pesan bot, footer dokumen BAST

---

## 5. Modal & Dialog Khusus

| Modal | Pemicu | Fungsi |
|---|---|---|
| ItemDetailModal | Klik aset | Detail aset + tab Riwayat Pergerakan |
| ItemFormModal | Tombol + / Edit | Form tambah/edit aset |
| QRScannerModal | Ikon kamera | Scanner QR/Barcode via kamera |
| TransactionModal | "Ajukan Transaksi" | Form transaksi baru |
| CSVImportModal | Header (Admin) | Upload & validasi CSV massal (chunk 250/batch) |
| AuditTrailModal | Tab Audit di Report | Cari jejak pergerakan per S/N |
| BASTDocumentModal | Transaksi aktif | Preview & cetak BAST |
| BulkDisposalModal | Profil Admin | Afkir massal + cetak BAPA |
| CancelRejectModal | Tombol Tolak | Wajib isi alasan penolakan |
| ConfirmModal | Aksi destruktif | Konfirmasi sebelum aksi tidak bisa dibalik |
| ExportGSheetModal | Profil | Export ke Google Sheets |
| LoanReportModal | Tab Loans di Report | Filter & tampilkan laporan pinjaman |
| OverdueAlertModal | Profil / Report | Daftar overdue + export + kirim ke bot |
| ProposeDisposalModal | Detail Aset (Admin) | Ajukan usulan pemusnahan 1 aset |
| ReconciliationDetailModal | Antrian Rekonsiliasi | Tinjau & setujui item opname |
| RequestAccessModal | Login / Profil Guest | Kirim permintaan akses ke Admin |
| SetPasswordModal | Profil | Atur password web |
| UserManagementModal | Profil Admin | CRUD pengguna, role, region |
| BackupModal | Profil Admin | Export CSV & JSON snapshot |

---

## 6. Prosedur Standar Operasi (SOP)

### SOP-01: Tambah Aset Baru
**Role:** Admin / User | **Estimasi:** 2-3 menit

1. Buka Tab **Beranda**
2. Tekan tombol **"+"** (FAB) sudut kanan bawah
3. Di ItemFormModal, isi: Serial Number (unik), Kategori, Brand, Model, Lokasi (Site Alias), Status, Aktiva
4. Tekan **"Simpan"**
5. DB Trigger otomatis menghubungkan category_id
6. Toast konfirmasi muncul, data refresh otomatis

> CATATAN: Jika kategori tidak terdaftar, database menolak insert.

---

### SOP-02: Siklus Peminjaman Unit Backup
**Role:** User/Admin (Pembuat) + Admin (Approval)

**Fase 1 - Pengajuan:**
1. Tab Transaksi → "Ajukan Transaksi"
2. Pilih Tipe: Borrowing
3. Isi Kategori/Aset, Lokasi Tujuan, Durasi, Keterangan
4. Submit → Status: Requested

**Fase 2 - Persetujuan Admin:**
1. Admin melihat badge Requested
2. Tekan "Setujui" → Status: Approved

**Fase 3 - Pengiriman:**
1. Unit fisik dikirim ke toko
2. Admin tekan "Kirim Barang" → Status: In Transit

**Fase 4 - Konfirmasi Penerimaan:**
1. Toko terima unit
2. Tekan "Terima Unit" → Status: In Progress
3. Countdown jatuh tempo mulai berjalan

**Fase 5 - Pengembalian:**
1. Toko tekan "Kembalikan Unit" → Status: Returning
2. Admin tekan "Terima di Gudang" → Status: Completed
3. Status aset kembali ke Active/Backup
4. Dicatat di asset_movement_logs: LOAN_RETURN + LOAN_COMPLETE

> CATATAN: Pinjaman overdue muncul di Alert Overdue.
> Admin dapat "Tarik Unit (Admin)" jika peminjam tidak responsif.

---

### SOP-03: Mutasi Aset Antar Cabang
**Role:** User/Admin (Pembuat) + Admin (Approval)
**Catatan:** Mutasi = pemindahan PERMANEN

1. Tab Transaksi → "Ajukan Transaksi" → Tipe: Mutation
2. Pilih aset atau kategori, isi lokasi tujuan, keterangan
3. Alur persetujuan Admin sama seperti SOP-02 Fase 2-3
4. Penerima di cabang tujuan tekan "Terima Unit (Completed)"
5. Tidak ada fase pengembalian
6. site_alias di master_assets otomatis diperbarui

---

### SOP-04: Stock Opname & Rekonsiliasi
**Role:** User/Admin (Scanning) + Admin (Rekonsiliasi) | **Frekuensi:** Bulanan

**Fase 1 - Scanning Fisik:**
1. Tab Opname → ketik Alias Site
2. Klik "Mulai Sesi Opname"
3. Scan QR/Barcode atau input manual S/N
4. Sistem kategorisasi: Ditemukan / Nyasar / Tidak Ditemukan
5. Klik "Tutup Sesi & Buat Draft Rekonsiliasi"
6. Klik "Submit ke Admin"

**Fase 2 - Rekonsiliasi (Admin):**
1. Tab Opname → Tab "Antrian Rekonsiliasi"
2. Buka ReconciliationDetailModal
3. Pilih tindakan per item: Koreksi Lokasi / Tandai Hilang / Usulkan Disposal / No Action
4. Klik "Setujui & Eksekusi"
5. RECONCILIATION_APPLIED dicatat di asset_movement_logs

---

### SOP-05: Usulan & Persetujuan Pemusnahan Aset
**Role:** Admin

**Metode Individual:**
1. Buka detail aset → "Usulkan Afkir"
2. ProposeDisposalModal: Pilih alasan kategori (7 opsi ISO), isi detail
3. Submit → aset jadi PENDING_DISPOSAL → masuk disposal_proposals

**Metode Massal (Tab Afkir):**
1. Tab Afkir → filter/sort/pilih item
2. "Setujui Terpilih" → cetak BAPA → aset jadi Disposed

---

### SOP-06: Import CSV Massal
**Role:** Admin | **Batasan:** 250 baris per batch request

1. Siapkan CSV sesuai skema master_assets
2. Header app → ikon Import → CSVImportModal
3. Drag-drop atau browse file
4. Sistem validasi header, preview data
5. Klik "Mulai Import" → progress bar batch
6. Laporan summary: berhasil / gagal / duplikat

---

### SOP-07: Scan QR untuk Cek Cepat Aset
**Role:** User / Admin

1. Header app → ikon QR Scanner
2. Arahkan kamera ke QR/Barcode label aset
3. Jika ditemukan → ItemDetailModal terbuka otomatis (400ms delay)
4. Jika tidak ditemukan → toast warning

---

### SOP-08: Manajemen Akun Pengguna
**Role:** Admin

**Menyetujui Permintaan Akses:**
1. User baru masuk → otomatis terdaftar sebagai guest
2. Guest tekan "Minta Akses Staf IT" → isi RequestAccessModal
3. Admin: Profil → "Manajemen Akun" (badge menunjukkan pending)
4. UserManagementModal → Setujui → Pilih Role → Assign Region
5. User mendapat akses sesuai role

---

## 7. Alur Bisnis & State Machine

### Lifecycle Transaksi Aset

```
REQUESTED
  → (Admin Setujui) → APPROVED
  → (Tolak/Batal) → REJECTED / CANCELLED

APPROVED
  → (Admin Kirim) → IN TRANSIT
  → (Batal) → CANCELLED

IN TRANSIT
  → (Mutation: Konfirmasi) → COMPLETED
  → (Borrowing/Repair: Konfirmasi) → IN PROGRESS
  → (Batal) → CANCELLED

IN PROGRESS
  → (Borrowing/Repair: Kirim Balik) → RETURNING
  → (Repair: Selesai di Tempat) → COMPLETED

RETURNING
  → (Admin Terima) → COMPLETED
  → (Batal) → CANCELLED

[TERMINAL]: COMPLETED / REJECTED / CANCELLED
```

### Lifecycle Pemusnahan Aset

```
master_assets.status: Active/Backup
  → (Admin Usul Afkir)
master_assets.status: PENDING_DISPOSAL
disposal_proposals.status: Pending
  → (Admin Setujui)
master_assets.status: Disposed
disposal_proposals.status: Approved
asset_movement_logs: DISPOSAL_APPROVED (immutable)
```

### Lifecycle Opname & Rekonsiliasi

```
createOpnameSession() → stock_opname (open)
  → addOpnameScan() × N → stock_opname_details
  → closeOpnameSession() → stock_opname (closed)
  → createReconciliationDraft() → stock_reconciliations (Draft)
  → submitReconciliation() → status: Submitted
  → approveReconciliation() → status: Approved
    + Eksekusi perubahan aset
    + asset_movement_logs: RECONCILIATION_APPLIED
```

---

## 8. Lapisan Keamanan & Audit

### Row Level Security (RLS)
Semua tabel Supabase memiliki RLS aktif. Akses dibatasi berdasarkan telegram_id yang terautentikasi.

### Immutable Audit Ledger
Tabel `asset_movement_logs` tidak dapat diubah/dihapus setelah entri dibuat. Memenuhi persyaratan ISO 27001.

### Field-Level Audit Trail
Trigger PostgreSQL mencatat perubahan per-kolom di master_assets: tanggal, kolom, nilai lama, nilai baru, aktor.

### Category Strict Validation Trigger
Trigger `handle_asset_category_strict_sync` menolak insert/update jika kategori tidak terdaftar di master_categories.

### State Machine Enforcement
stateMachine.ts di frontend memvalidasi semua transisi status sebelum memanggil API.

### DocStatus Locking
Transaksi doc_status=1 (Locked) tidak dapat diubah oleh pengguna biasa.

### RBAC Regional
Admin dengan assigned_region hanya dapat menyetujui transaksi ke wilayahnya. Admin tanpa assigned_region (nilai ALL) memiliki akses lintas wilayah.

---

## 9. Referensi Database (SQL Scripts)

Urutan eksekusi yang benar di Supabase SQL Editor:

| Urutan | File | Deskripsi |
|:---:|---|---|
| 1 | docs/schema.sql | Skema awal tabel utama |
| 2 | docs/migration.sql | Migrasi tambahan kolom |
| 3 | docs/seed_categories.sql | Seed 37 kategori aset |
| 4 | docs/auto_category_trigger.sql | Trigger strict validation kategori |
| 5 | sql/create_user_management_and_rights.sql | Tabel telegram_users + RLS |
| 6 | sql/create_asset_loans.sql | Tabel asset_loans + SLA |
| 7 | sql/create_super_admin_settings.sql | Tabel system_settings + routing |
| 8 | sql/upgrade_erp_standards.sql | ERP-grade: ledger, audit, reconciliation |
| 9 | sql/upgrade_iso_standards.sql | ISO 27001: immutable log, field audit |
| 10 | sql/upgrade_rbac_regional_workflow.sql | RBAC: assigned_region, regional approval |
| 11 | sql/reporting_views_and_rpcs.sql | Views & RPCs analytics dashboard |

> Semua script bersifat idempotent (CREATE OR REPLACE) dan aman dijalankan ulang.

---

*Dokumen ini dihasilkan dari analisis codebase E1-TMA — September 2026.*
*Untuk pertanyaan teknis, hubungi Tim IT Pusat.*
