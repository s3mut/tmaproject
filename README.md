# E1-TMA — IT Asset Inventory Telegram Mini App (TMA)

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.1-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?logo=supabase)

**E1-TMA** adalah aplikasi Telegram Mini App (TMA) berbasis React + TypeScript yang dirancang khusus untuk manajemen aset TI (*IT Asset Inventory*), pelacakan mutasi/perpindahan aset antar lokasi (*handover & movement*), audit fisik (*stock opname*), dan impor data massal berbasis CSV dengan pengawasan ketat integritas data (*strict category validation*).

---

## 🌟 Fitur Utama

- **📊 Dashboard Interaktif & Filter Presisi**: Ringkasan statistik status aset dengan filter kategori berbasis **Dropdown `<optgroup>`** yang rapi dan konsisten dengan halaman daftar aset. Filter dijamin 100% akurat tanpa kebocoran data silang kategori. Dilengkapi sajian khusus **Terakhir Dipindah (7 Hari Terakhir)** untuk melacak mobilitas aset terkini.
- **🎨 Atomic UI Design System & Tema Gelap/Terang**: Antarmuka modular (*Atoms & Molecules*) yang memberikan keseragaman desain. Dilengkapi **Tema Gelap & Terang (Light/Dark Mode)** yang secara otomatis menyesuaikan preferensi OS perangkat pengguna saat pertama kali dibuka, dengan saklar manual di profil.
- **⚡ High-Performance Site Auto-Complete**: Seluruh menu penentuan lokasi (Pindah Aset, Mutasi, Tambah/Edit Aset, dan Stock Opname) ditenagai oleh komponen *auto-complete search* (`SiteSearchInput`) yang mampu mengolah 2.000+ cabang lokasi dengan ringan tanpa kendala rendering/lag dari *dropdown select*.
- **💻 Manajemen Daftar Aset**: Pengelompokan daftar aset berdasarkan **Region/Wilayah** dalam bentuk *collapsible/accordion* yang informatif, dilengkapi indikator *breakdown* status per wilayah dan penghitung hasil filter secara reponsif.
- **⚡ Paginated Auto-Fetch (Bebas Limit 1.000 Baris)**: Mampu memuat seluruh inventaris perusahaan (6.000+ unit aset) dengan sempurna tanpa terhalang batas default 1.000 baris per request dari PostgREST/Supabase.
- **🔄 Sistem Transaksi Aset Terpadu (Unified Transactions: Mutation, Borrowing, Repair)**: Sistem alur pergerakan aset terintegrasi dengan State Machine 8-Status yang menggantikan sistem peminjaman dan mutasi lama:
  - **Alur State Machine 8-Status**: Alur transisi status terpadu (`Requested` → `Approved` → `In Transit` → `In Progress` → `{Returning}` → `Completed`, atau terminal `Rejected` / `Cancelled`) untuk 3 jenis transaksi operasional: **Mutation** (perpindahan permanen antar cabang), **Borrowing** (peminjaman unit backup sementara untuk toko), dan **Repair** (pengiriman unit rusak ke service center).
  - **Sinkronisasi Otomatis Status Fisik Aset**: Status fisik unit pada `master_assets.status` (`Backup`, `Borrow`, `Repair`, `In Transit`, `Active`) secara otomatis disinkronkan di setiap transisi status tiket melalui RPC PostgreSQL `update_transaction_status_safe`.
  - **Binding Aset Real-Time saat Kirim Unit**: Pada tiket berbasis kategori, penentuan serial number fisik dilakukan saat tombol "Kirim Unit" (status `In Transit`) melalui modal `AssetPickerModal` dengan validasi ketersediaan unit `Backup` real-time guna mencegah *double-booking*.
  - **Checkpoint Transit Multi-Leg**: Mendukung pencatatan lokasi transit perantara sebelum aset tiba di lokasi tujuan akhir, dicatat ke dalam log audit fisik (*immutable ledger* `asset_movement_logs`) melalui RPC `log_transit_checkpoint`.
  - **Pusat Laporan & Reprint Center**: Pemantauan KPI, audit trail pergerakan unit (standar ISO 19770/27001), utilisasi cabang, serta fitur **Reprint Center** untuk mencetak ulang dokumen historis BAST (Peminjaman & Mutasi) dan BAPA (Pemusnahan Aset via `disposal_documents`).
- **📈 Enterprise Documentation & Reporting (Recharts & SQL Analytics)**: Dasbor pelaporan eksekutif berbekal visualisasi grafik modern yang ditenagai oleh **Recharts** dan komputasi langsung dari PostgreSQL Views/RPC:
  - **KPI Summary**: Area Chart untuk trend mutasi 12 bulan terakhir dan Donut/Pie Chart proporsi distribusi status aset fisik.
  - **SLA & Overdue Monitoring**: Pelacakan tingkat keterlambatan pengembalian unit backup (*Overdue Alerts*) dengan aksi ekspor CSV dan pemicu notifikasi peringatan ke Telegram Bot.
  - **Audit Trail & Utilization**: Linimasa rekam jejak siklus hidup tiap unit aset serta Horizontal Bar Chart untuk ranking utilisasi peminjaman tertinggi per cabang.
  - **Reprint Center (Arsip BAST & BAPA)**: Pusat cetak ulang dokumen historis Berita Acara Serah Terima (Peminjaman & Mutasi) dan Berita Acara Pemusnahan Aset (BAPA) berbasis snapshot tabel `disposal_documents` dan view transaksi.
- **💾 Admin Disaster Recovery & Backup System**: Panel khusus Role Admin di menu Profil untuk mengunduh salinan cadangan lengkap database (Snapshot JSON) serta mengekspor tabel Master Aset & Riwayat Mutasi ke format Excel CSV (terformat UTF-8 BOM agar langsung kompatibel dan rapi di Microsoft Excel/Spreadsheet).
- **📝 Stock Opname (Audit Fisik)**: Fasilitas audit fisik aset berbasis lokasi terintegrasi kamera yang memisahkan status barang yang sudah di-scan dengan yang belum diverifikasi, lengkap dengan *progress bar* visual.
- **📷 QR / Barcode Scanner Nyata**: Scanner kamera langsung di Telegram Mini App menggunakan `html5-qrcode` — mendukung QR Code, Code 128, Code 39, EAN-13, dan format lainnya. Otomatis membuka detail aset saat kode terdeteksi.
- **📤 Import CSV Massal (Khusus Role Admin)**:
  - Validasi kategori *strict* terhadap database `master_categories` untuk mencegah typo / data kotor.
  - Penanganan payload besar menggunakan **Chunking 250 unit per request** (bebas dari limit query browser).
  - Opsi interaktif Admin: hubungkan typo ke kategori resmi, auto-create kategori baru, atau tombol **"Abaikan / Skip"** unit tertentu.
  - Upload ulang CSV yang sama aman 100% karena menggunakan UPSERT berbasis `serial_number`.
- **🔐 Dual Authentication (Telegram Auto-Login & Web Form Login)**:
  - **Via Telegram Mini App**: Auto-login menggunakan Telegram ID dari SDK (`window.Telegram.WebApp`) — tanpa form, tanpa password. Otomatis sinkronisasi profil (nama & username) secara *real-time* ke Supabase.
  - **Via Browser Web**: Halaman login dengan form **Telegram Username / ID + Password** (bcrypt hash, diverifikasi di server via Supabase RPC `SECURITY DEFINER` — tidak terkena RLS).
  - **Set Password Web**: User dapat mengatur password akses web dari dalam aplikasi saat login via Telegram (menu Profil → Password Akses Web).
  - **Logout Web**: Sesi web menggunakan `sessionStorage` (logout otomatis saat browser ditutup).
- **🤖 Interactive Telegram Bot Access Request & Approval**:
  - Otomatis mengidentifikasi Telegram ID, Nama, & Username pengguna dari Telegram WebApp SDK.
  - Pengguna berstatus **Guest** dapat mengajukan verifikasi akses Tim IT via tombol **"Request Akses Tim IT"** di halaman Profil.
  - Telegram Bot mengirimkan pesan notifikasi interaktif lengkap dengan **Tombol Persetujuan 1-Klik** (`✅ Setujui User`, `👑 Setujui Admin`, `❌ Tolak`) langsung ke Grup Admin IT.
  - Approval Admin di Telegram otomatis mengubah role pengguna di Supabase secara real-time dan mengirim notifikasi konfirmasi ke Telegram pengguna.
- **🛡️ Keamanan & Integritas Data**:
  - Soft Delete (`deleted_at`) untuk mencegah kehilangan riwayat aset.
  - PostgreSQL Trigger (`handle_asset_category_strict_sync`) untuk sinkronisasi dan penolakan otomatis data tidak terdaftar.
  - **Enterprise Role-Based Access Control (RBAC) & User Region Management**: Panel manajemen akun khusus Admin (`UserManagementModal`) di halaman Profil untuk penetapan role (`guest`, `user`, `admin`) dan pemetaan wilayah wewenang IT (`assigned_region`) yang tersinkronisasi langsung dengan master `sites`.
  - Password web disimpan sebagai **bcrypt hash** di database — hash tidak pernah dikirim ke client.

---

## 🏗️ Arsitektur Project

```
E1-TMA/
├── .agents/
│   └── AGENTS.md                   # Panduan Lengkap Agent AI & Developer
├── docs/                           # Documentation & SQL Database Scripts
│   ├── schema.sql                  # PostgreSQL Schema Enterprise
│   ├── migration.sql               # Script Migrasi Database
│   ├── seed_categories.sql         # Data Seed Master Kategori (ID 44-80)
│   ├── auto_category_trigger.sql   # Trigger Validation Strict Kategori
│   ├── import_assets_from_csv.sql  # Script Staging & Migrasi CSV
│   ├── reporting_views_and_rpcs.sql # Skema SQL 5 Views & 4 RPC untuk Analitik & Pelaporan
│   ├── web_auth_rpc.sql            # SQL Migration: Web Auth (web_password + RPC)
│   ├── diagnostic_web_auth.sql     # SQL Diagnostik & Pengujian Web Login
│   └── TELEGRAM_BOT_AND_MINI_APP.md # Setup Mini App, Bot, webhook, cron
├── sql/
│   ├── upgrade_erp_standards.sql          # Migrasi Unifikasi Transaksi & Standardisasi ERP (asset_transactions)
│   ├── upgrade_iso_standards.sql          # Immutable Ledger ISO 19770 & 27001 (asset_movement_logs)
│   ├── upgrade_rbac_regional_workflow.sql # Migrasi Enterprise RBAC, User Region & Cross-Region RPC
│   ├── create_super_admin_settings.sql    # Dynamic System Settings & Telegram Group Routes
│   ├── create_user_management_and_rights.sql # Manajemen Hak Akses User & Approval
│   ├── reporting_views_and_rpcs.sql       # Views & RPCs untuk Analitik dan Pelaporan
│   ├── add_disposal_documents.sql         # Tabel Snapshot Dokumen BAPA untuk Reprint Center
│   ├── add_opname_unique_constraint.sql   # Unique Constraint Stock Opname Details
│   ├── add_asset_availability_sync.sql    # Penambahan Enum 'Borrow' & Kolom asset_status_before
│   ├── create_asset_loans.sql             # [Legacy] Skema Peminjaman v1 (Digantikan upgrade_erp_standards.sql)
│   ├── update_transaction_status_sync_v2.sql # [Superseded] RPC Transaksi v2 (Digantikan bind_asset_at_dispatch.sql)
│   ├── fix_missing_loan_columns.sql       # ⚠️ Perlu dieksekusi manual (Kolom duration_days & due_date)
│   └── bind_asset_at_dispatch.sql         # ⚠️ Perlu dieksekusi manual (Binding S/N Aset saat In Transit)
├── src/
│   ├── components/                 # Reusable UI Components & Modals
│   │   ├── ui/                     # Atomic Design System Component Library
│   │   │   ├── Badge.tsx           # Asset Status, Transaction, & Role Badges
│   │   │   ├── Button.tsx          # Tombol Serbaguna (6 wujud, 3 ukuran, loading state)
│   │   │   ├── EmptyState.tsx      # Komponen Standar Tampilan Kosong (CSS Invert)
│   │   │   ├── Input.tsx           # Standard Input dengan focus ring & error state
│   │   │   ├── LoadingSpinner.tsx  # Unified Loading Spinner Level Halaman
│   │   │   ├── ModalShell.tsx      # Unified Wrapper untuk Modals & Overlay
│   │   │   ├── SectionHeader.tsx   # Standard Section Titles & Action Buttons
│   │   │   ├── Select.tsx          # Customized Dropdown Select
│   │   │   ├── SiteSearchInput.tsx # Custom Auto-Complete Dropdown Pencarian Site
│   │   │   ├── Skeleton.tsx        # Responsive Loading Skeleton Animations
│   │   │   └── Textarea.tsx        # Standard Textarea
│   │   ├── charts/
│   │   │   └── ReportCharts.tsx    # Komponen Visualisasi Grafik Recharts
│   │   ├── layout/
│   │   │   └── SubViewLayout.tsx   # Wrapper Sub-Page Full Screen (3-Pilar Pattern)
│   │   ├── BottomNav.tsx           # Bottom Tab Navigation (Beranda, Menu, Profil)
│   │   ├── DocumentTimeline.tsx    # Linimasa Riwayat Mutasi & Checkpoint Transit
│   │   ├── ErrorBoundary.tsx       # Error Boundary Pelindung Crash Aplikasi
│   │   ├── Header.tsx              # Top Navigation Bar & Action Icons
│   │   ├── ItemCard.tsx            # Card Component Tampilan Aset
│   │   ├── StatusBadge.tsx         # Badge Representasi Status Aset
│   │   ├── Toast.tsx               # Notifikasi Toast Melayang
│   │   └── modals/                 # Interactive Modal Components
│   │       ├── AssetPickerModal.tsx # Pemilihan Unit Backup saat Kirim Unit (In Transit)
│   │       ├── AuditTrailModal.tsx # Linimasa Rekam Jejak Audit per Unit Aset
│   │       ├── BackupModal.tsx     # Modal Backup & Export CSV/JSON (Khusus Admin)
│   │       ├── BASTDocumentModal.tsx # Generator Dokumen BAST & Shipping Label PDF
│   │       ├── BulkDisposalModal.tsx # Modal Pemusnahan Massal Aset (BAPA)
│   │       ├── ConfirmModal.tsx    # Modal Konfirmasi Interaktif Standar
│   │       ├── CSVImportModal.tsx  # Uploader & Strict Validator CSV Khusus Admin
│   │       ├── ExportGSheetModal.tsx # Export Data ke Google Spreadsheet
│   │       ├── ItemDetailModal.tsx # Detail Lengkap Aset & Aksis Cepat
│   │       ├── ItemFormModal.tsx   # Form Tambah / Edit Master Aset
│   │       ├── LoanReportModal.tsx # Generator Laporan Transaksi Peminjaman
│   │       ├── OverdueAlertModal.tsx # Modal Monitoring Overdue & Alert Bot
│   │       ├── ProposeDisposalModal.tsx # Pengajuan Afkir / Usulan Pemusnahan Aset
│   │       ├── QRScannerModal.tsx  # Scanner Kamera QR / Barcode (html5-qrcode)
│   │       ├── ReconciliationDetailModal.tsx # Verifikasi & Approval Rekonsiliasi Opname
│   │       ├── RequestAccessModal.tsx # Form Pengajuan Akses Tim IT (Guest)
│   │       ├── SetPasswordModal.tsx # Pengaturan Password Akses Web
│   │       ├── TransactionModal.tsx # Form Pengajuan Transaksi Terpadu (Mutasi/Pinjam/Repair)
│   │       └── UserManagementModal.tsx # Panel Manajemen Role & Assigned Region IT
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Dual Auth Provider & Session State
│   │   ├── ModalContext.tsx        # Global Modal Controller
│   │   └── ThemeContext.tsx        # Dark/Light Mode Theme Provider (Auto-Invert)
│   ├── hooks/
│   │   ├── useCameraPermission.ts  # Hook Izin & Status Kamera Barcode
│   │   ├── useFormValidation.ts    # Hook Standarisasi Validasi Form & Error State
│   │   ├── useInventory.ts         # Central State Management (Items, Sites, Trx)
│   │   └── useReport.ts            # Hook Analitik & Aggregasi Pelaporan
│   ├── lib/
│   │   └── supabase.ts             # Supabase Client Instance Initialization
│   ├── services/                   # API Integration Layer
│   │   ├── assetService.ts         # Master Aset CRUD, Disposal Docs & Views
│   │   ├── authService.ts          # Auth Service: Web Login, Session, Password
│   │   ├── csvImportService.ts     # Chunking Uploader & Validator CSV
│   │   ├── gsheetExportService.ts  # Service Integrasi Ekspor Google Sheets
│   │   ├── opnameService.ts        # Service Audit Fisik & Rekonsiliasi Opname
│   │   ├── reportService.ts        # Pelaporan, Agregasi KPI & Notifikasi Alert
│   │   ├── settingsService.ts      # Pengaturan Sistem & Dynamic Route Settings
│   │   ├── siteService.ts          # Master Lokasi Cabang & Region
│   │   ├── stateMachine.ts         # State Machine 8-Status & Validasi Transisi
│   │   ├── transactionService.ts   # Service Transaksi Terpadu & Checkpoint Transit
│   │   └── userService.ts          # Telegram SDK User Sync & Bot Notification
│   ├── types/
│   │   └── inventory.ts            # TypeScript Definitions, Enums & Status Configs
│   ├── utils/
│   │   ├── categoryGroups.ts       # Pengelompokan Kategori Aset
│   │   ├── friendlyError.ts        # Mapper Error Ramah Pengguna
│   │   ├── mapTransactionToLoan.ts # Adapter Kompatibilitas Transaksi ke BAST
│   │   ├── printDisposalBAST.ts    # Generator Cetak BAPA Pemusnahan Aset
│   │   ├── printDocument.ts        # Generator Cetak Dokumen Umum
│   │   └── telegramHaptics.ts      # Haptic Feedback Telegram WebApp SDK
│   └── views/                      # Main Page / Tab Views (Pola 3-Pilar)
│       ├── DashboardView.tsx       # Beranda: Ringkasan Stats, Kategori & Recent Moves
│       ├── DisposalQueueView.tsx   # Antrean & Approval Pemusnahan Aset (BAPA)
│       ├── ItemsView.tsx           # Daftar Master Aset Grouped by Region
│       ├── LoginView.tsx           # Halaman Login Form Web (ID + Password)
│       ├── MenuView.tsx            # Hub Navigasi Menu & Sub-View
│       ├── OpnameView.tsx          # Audit Fisik Aset & Tab Rekonsiliasi (Admin)
│       ├── ProfileView.tsx         # Profil User, Setting Password & Backup Data
│       ├── ReconciliationQueueView.tsx # Antrean Persetujuan Selisih Opname
│       ├── ReportView.tsx          # Pusat Laporan: KPI, Grafik & Reprint Center
│       ├── SettingsView.tsx        # Konfigurasi Super Admin & Routing Bot
│       ├── SitesView.tsx           # Direktori Master Cabang / Site
│       └── TransactionsView.tsx    # Manajemen Transaksi Terpadu (Mutasi, Pinjam, Repair)
├── supabase/functions/             # Edge Functions (telegram-bot, cron-overdue)
├── .env.example                    # Template Environment Variables
├── TMA.log                         # Log Riwayat Perubahan Project
└── vite.config.ts                  # Vite Configuration
```

---

## 🛠️ Panduan Instalasi & Memulai

### 1. Prasyarat
- Node.js versi 18 atau lebih baru.
- Project PostgreSQL Supabase yang sudah terkonfigurasi.

### 2. Kloning Repository & Install Dependencies
```bash
git clone https://github.com/s3mut/tmaproject.git
cd E1-TMA
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env` di root project berdasarkan `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Token bot **tidak** ditaruh di Vite untuk production. Simpan `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, dan `WEBHOOK_SECRET` sebagai **Supabase Edge Function secrets**. Panduan lengkap (BotFather, Mini App HTTPS, deploy function, webhook, cron overdue, troubleshooting): [docs/TELEGRAM_BOT_AND_MINI_APP.md](docs/TELEGRAM_BOT_AND_MINI_APP.md).

### 4. Setup Database Supabase
Eksekusi file SQL yang berada di folder `docs/` secara berurutan di Supabase SQL Editor:

| Urutan | File | Keterangan |
|--------|------|-----------|
| 1 | `docs/schema.sql` | Membuat tabel dasar, type ENUM, dan VIEW |
| 2 | `docs/seed_categories.sql` | Mengisi data master kategori (ID 44–80) |
| 3 | `docs/auto_category_trigger.sql` | Memasang trigger validasi strict kategori |
| 4 | `docs/setup_web_auth_and_dummy_users.sql` | **Wajib**: Setup lengkap Web Auth (kolom password, semua fungsi RPC) + 3 akun dummy untuk testing |
| 5 | `docs/reporting_views_and_rpcs.sql` | Mengaktifkan 5 Views & 4 RPC untuk sistem analitik dan pelaporan real-time |

> **⚠️ Catatan**: Script nomor 4 bersifat **idempotent** (aman dijalankan berulang kali) dan sudah mencakup semua kebutuhan setup web login.

### 5. Jalankan Local Development Server
```bash
npm run dev
```

Ini hanya frontend di browser (`http://localhost:5173`). Auto-login Telegram, tombol approve di chat, dan reminder overdue memerlukan workflow di [docs/TELEGRAM_BOT_AND_MINI_APP.md](docs/TELEGRAM_BOT_AND_MINI_APP.md).

---

## 🔐 Pengaturan Password Akses Web

Untuk pengguna yang ingin login via browser (bukan Telegram):
1. Buka aplikasi **via Telegram Mini App** terlebih dahulu (auto-login).
2. Buka tab **Profil** → klik menu **"Password Akses Web"**.
3. Set password minimal 8 karakter.
4. Sekarang Anda dapat login via browser menggunakan **Telegram @Username atau ID + Password**.

> **Tips**: Gunakan `@username` Telegram Anda — lebih mudah diingat dibanding angka Telegram ID.

### Akun Dummy (untuk Testing)
Jalankan `docs/setup_web_auth_and_dummy_users.sql` di Supabase untuk mendapatkan 3 akun test:

| Username | Role | Password |
|----------|------|----------|
| `@admin_dummy` | admin | `password123` |
| `@user_dummy` | user | `password123` |
| `@guest_dummy` | guest | `password123` |

---

## ⚡ Build & Verification

```bash
# Type check TypeScript
npx tsc --noEmit

# Vite Production Build
npm run build
```

---

## 📜 Log Perubahan Project
Seluruh riwayat perkembangan, perbaikan bug, dan migrasi arsitektur dicatat secara detail pada file [TMA.log](TMA.log).

---

## 📄 Lisensi
Project ini dibuat untuk manajemen internal TI **E1-TMA**.
