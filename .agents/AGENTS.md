# AGENTS.md — Panduan Agent AI & Developer (Project E1-TMA)

Dokumen ini berisi panduan arsitektur, standar pengkodean, kebijakan keamanan data, serta alur kerja untuk Agent AI (Antigravity/DeepMind) dan Developer yang mengerjakan project **E1-TMA**.

> **📘 Dokumen Pelengkap Wajib**:
> Selain file ini, Agent AI dan Developer **WAJIB** membaca [`docs/E1-TMA_AI_OPERATING_PROTOCOL.md`](../docs/E1-TMA_AI_OPERATING_PROTOCOL.md) sebagai dokumen pelengkap yang mencatat konteks proyek terkini, pantangan arsitektur khusus (misal: penegasan bahwa `'super_admin'` bukan enum valid di database), serta riwayat keputusan teknis penting. File ini (`AGENTS.md`) berfokus pada standar kode dan konvensi repositori, sementara `AI_OPERATING_PROTOCOL.md` memandu strategi eksekusi dan guardrails operasional.

---

## 📌 1. Ikhtisar Project (Project Overview)

**E1-TMA** adalah Telegram Mini App (TMA) berbasis React + TypeScript untuk manajemen aset TI (*IT Asset Inventory*), pencatatan lokasi (*sites*), transaksi pergerakan aset terpadu (*unified transactions: mutation, borrowing, repair*), audit fisik (*stock opname*), pemusnahan aset (*disposal & BAPA*), dan pusat cetak ulang dokumen (*Reprint Center*).

- **Teknologi Utama**:
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v3 (dengan arsitektur CSS Variable Auto-Invert untuk dark/light theme).
  - **Backend & Database**: Supabase PostgreSQL dengan PostgREST API, Row Level Security (RLS), dan RPC `SECURITY DEFINER`.
  - **Integrasi**: Telegram WebApp SDK (`window.Telegram.WebApp`).

---

## 🏗️ 2. Struktur Direktori Utama

```
E1-TMA/
├── .agents/
│   └── AGENTS.md                   # Panduan & Instruksi Standar Agent AI
├── docs/                           # Dokumentasi, BRD & Script Database (SQL)
│   ├── schema.sql                  # Definisi Schema Enterprise PostgreSQL
│   ├── migration.sql               # Script Migrasi Database
│   ├── seed_categories.sql         # Seed Master Kategori Aset (ID 44-80)
│   ├── auto_category_trigger.sql   # Trigger PostgreSQL Strict Validation Kategori
│   ├── import_assets_from_csv.sql  # Script Staging & Migrasi CSV
│   ├── DEVLOG.md                   # Catatan Pengembang
│   ├── TELEGRAM_BOT_AND_MINI_APP.md # Setup Bot & Mini App Operasional
│   └── E1-TMA_AI_OPERATING_PROTOCOL.md # Master Operating Protocol Pendamping AI
├── sql/                            # Skrip Migrasi DDL & RPC
│   ├── upgrade_erp_standards.sql          # Migrasi Unifikasi Transaksi (asset_transactions)
│   ├── upgrade_iso_standards.sql          # Immutable Ledger ISO 19770/27001 (asset_movement_logs)
│   ├── upgrade_rbac_regional_workflow.sql # Migrasi Enterprise RBAC & User Assigned Region
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
│   ├── components/                 # Komponen UI Reusable
│   │   ├── ui/                     # Atomic UI Library (Button, Input, Select, EmptyState, LoadingSpinner, SiteSearchInput, dll)
│   │   ├── charts/ReportCharts.tsx # Visualisasi Grafik Recharts
│   │   ├── layout/SubViewLayout.tsx # Wrapper Sub-Page Full Screen (Pola 3-Pilar)
│   │   ├── Header.tsx              # Top Navigation Bar & Action Icons
│   │   ├── BottomNav.tsx           # Navigation Tab Bawah (Beranda, Menu, Profil)
│   │   ├── ItemCard.tsx            # Card Tampilan Aset
│   │   ├── StatusBadge.tsx         # Badge Status Fisik Aset
│   │   ├── DocumentTimeline.tsx    # Linimasa Riwayat Mutasi & Checkpoint Transit
│   │   ├── Toast.tsx               # Notifikasi Toast Melayang
│   │   └── modals/                 # Modal Interactive (AssetPicker, BAST, CSV, Form, Detail, Opname, Trx, dll)
│   ├── contexts/                   # Global Contexts (AuthContext, ThemeContext, ModalContext)
│   ├── hooks/                      # Custom Hooks (useInventory, useReport, useFormValidation, useCameraPermission)
│   ├── lib/                        # Konfigurasi Supabase Client
│   ├── services/                   # Service Layer API (Supabase Integration)
│   │   ├── assetService.ts         # CRUD Master Assets, Disposal Documents & Views
│   │   ├── authService.ts          # Web Login, Password & Session
│   │   ├── csvImportService.ts     # Chunking Uploader CSV (Batch 250)
│   │   ├── opnameService.ts        # Audit Fisik & Rekonsiliasi Opname
│   │   ├── reportService.ts        # Pelaporan, Agregasi KPI & Overdue Alert
│   │   ├── settingsService.ts      # Super Admin Settings & Dynamic Group Routes
│   │   ├── siteService.ts          # Fetch Master Sites & Regions
│   │   ├── stateMachine.ts         # State Machine 8-Status & Guard Transisi Transaksi
│   │   ├── transactionService.ts   # CRUD Asset Transactions & Checkpoint Transit
│   │   └── userService.ts          # User Sync & Bot Notification
│   ├── types/                      # TypeScript Definitions & Status Configs (inventory.ts)
│   ├── utils/                      # Helper & Utilities (friendlyError, mapTransactionToLoan, printDisposalBAST, printDocument, dll)
│   └── views/                      # Tampilan Halaman Utama (Pola 3-Pilar: Beranda, Menu, Profil & Sub-Views)
├── .env.example                    # Template Environment Variables
├── package.json                    # Dependencies & Scripts
├── TMA.log                         # Log Perubahan Project Lengkap
└── vite.config.ts                  # Konfigurasi Vite Build
```

---

## 🔑 3. Aturan Arsitektur & Aturan Penting (Critical Rules)

### A. Integritas Data Kategori & Strict Validation Trigger
1. Tabel `master_assets` memiliki relasi **Foreign Key** `category_id` ke `master_categories(id)` DAN menyimpan nama `category` (TEXT) untuk konsistensi.
2. Database dilindungi oleh Trigger PostgreSQL `handle_asset_category_strict_sync` ([docs/auto_category_trigger.sql](../docs/auto_category_trigger.sql)):
   - **Nama Kategori Valid** $\rightarrow$ Otomatis dihubungkan dengan `category_id` yang sesuai.
   - **Nama Kategori Tidak Terdaftar / Typo** $\rightarrow$ `RAISE EXCEPTION` (Insert ditolak oleh database untuk mencegah data kotor/typo).

### B. Proteksi Role-Based Access Control (RBAC)
1. Fitur sensitif seperti **Import CSV Massal**, **Pengaturan Super Admin**, **Persetujuan Pemusnahan (BAPA)**, dan **Soft Delete** hanya diizinkan untuk pengguna dengan `userRole === 'admin'`.
2. Komponen seperti `CSVImportModal.tsx`, `SettingsView.tsx`, dan tombol aksi admin pada `Header.tsx` secara eksplisit memeriksa `userRole`.
3. **PENTING**: ENUM `user_role` di database PostgreSQL hanya bernilai `'admin'`, `'user'`, dan `'guest'`. Nilai `'super_admin'` **TIDAK ADA** di DB — pengecekan hak akses super admin di frontend dilakukan berdasarkan konfigurasi/flag terpisah, bukan dengan membandingkan `userRole === 'super_admin'`.

### C. Penanganan Payload Besar (Batch Chunking)
1. Untuk mencegah error payload / timeout Supabase (`Query is too large`), proses upload batch pada `csvImportService.ts` WAJIB menggunakan **Chunking 250 unit per request**.
2. Selalu sediakan callback progress ke UI saat memproses batch besar.

### D. Strategi Query Relasional (PostgREST Relationship Cache)
1. Tabel terpadu `asset_transactions` memiliki banyak referensi ke tabel `sites` (dari dan ke) serta `telegram_users` (pemohon, penyetuju, pengirim, penerima).
2. Untuk mencegah error PostgREST schema cache saat melakukan nested relation embedding, terapkan pola **Manual Hydration / Parallel Lookup** via `Promise.all` di service layer (seperti implementasi di [`src/services/transactionService.ts`](../src/services/transactionService.ts)), di mana master data di-fetch terpisah berdasarkan ID unik yang terkumpul lalu di-map di client.

---

## 🛠️ 4. Workflow Pengembangan (Development Workflow)

1. **Sebelum Mengubah Code**:
   - Periksa `TMA.log` dan [`docs/schema.sql`](../docs/schema.sql) untuk memahami konteks perubahan sebelumnya.
   - Jangan berasumsi tentang tipe data; selalu periksa [`src/types/inventory.ts`](../src/types/inventory.ts).
   - Rujuk [`docs/E1-TMA_AI_OPERATING_PROTOCOL.md`](../docs/E1-TMA_AI_OPERATING_PROTOCOL.md) untuk pedoman anti-regresi di file-file kritis seperti `TransactionsView.tsx` dan `useInventory.ts`.

2. **Pengujian Build & Type Checking**:
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan TypeScript.
   - Jalankan `npm run build` untuk memverifikasi bundle Vite.

3. **Telegram Mini App & Bot**:
   - Deploy dan webhook didokumentasikan di [`docs/TELEGRAM_BOT_AND_MINI_APP.md`](../docs/TELEGRAM_BOT_AND_MINI_APP.md).
   - Token bot disimpan di Supabase secrets (`TELEGRAM_BOT_TOKEN`), bukan di bundle Vite.

4. **Dokumentasi Wajib (TMA.log)**:
   - Setiap selesai melakukan fitur baru, bugfix, atau migrasi SQL, catat perubahan di `TMA.log` dengan format STEP berurutan.

5. **Git Commit & Push**:
   - Gunakan pesan commit deskriptif (misal: `feat: ...`, `fix: ...`, `docs: ...`).
   - Pastikan file sensitif (`.env`, `.env.local`) tidak ter-commit ke Git.
