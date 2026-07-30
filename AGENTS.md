# AGENTS.md — Panduan Agent AI & Developer (Project TransitTMA)

Dokumen ini berisi panduan lengkap arsitektur, standar pengkodean, kebijakan keamanan data, serta alur kerja untuk Agent AI (Antigravity/DeepMind) dan Developer yang mengerjakan project **TransitTMA**.

---

## 📌 1. Ikhtisar Project (Project Overview)

**TransitTMA** adalah Telegram Mini App (TMA) berbasis React + TypeScript untuk manajemen aset TI (IT Asset Inventory), pencatatan lokasi (*sites*), pelacakan mutasi (*movement/handover*), serta audit fisik (*stock opname*).

- **Teknologi Utama**:
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, FontAwesome 6 Icons.
  - **Backend & Database**: Supabase PostgreSQL dengan PostgREST API & Row Level Security (RLS).
  - **Integrasi**: Telegram WebApp SDK (`window.Telegram.WebApp`).

---

## 🏗️ 2. Struktur Direktori Utama

```
TransitTMA/
├── .agents/
│   └── AGENTS.md                   # Panduan & Instruksi Agent AI
├── docs/                           # Dokumentasi & Script Database (SQL)
│   ├── schema.sql                  # Definisi Schema Enterprise PostgreSQL
│   ├── migration.sql               # Script Migrasi Database
│   ├── seed_categories.sql         # Seed Kategori Aset (ID 44-80)
│   ├── auto_category_trigger.sql   # Trigger PostgreSQL Strict Validation Kategori
│   ├── import_assets_from_csv.sql  # Script Staging & Migrasi CSV
│   └── DEVLOG.md                   # Catatan Pengembang
├── src/
│   ├── components/                 # Komponen UI Reusable
│   │   ├── Header.tsx              # Navigation Bar & Tombol Import CSV (Admin)
│   │   ├── BottomNav.tsx            # Navigation Tab Bawah
│   │   ├── ItemCard.tsx            # Card Tampilan Aset
│   │   └── modals/                 # Modal Interactive (Form, Detail, Mutasi, QR, CSV)
│   │       ├── CSVImportModal.tsx  # Uploader CSV Khusus Admin (Strict Validation)
│   │       ├── ItemFormModal.tsx   # Form Tambah/Edit Aset
│   │       ├── ItemDetailModal.tsx # Form Detail & Aksis Aset
│   │       ├── MutationModal.tsx   # Form Mutasi Aset (Maker)
│   │       └── QRScannerModal.tsx  # Scanner QR/Barcode
│   ├── hooks/                      # Custom Hooks
│   │   └── useInventory.ts         # Hook Utama State Management Inventory
│   ├── lib/                        # Konfigurasi Third-Party
│   │   └── supabase.ts             # Inisialisasi Supabase Client
│   ├── services/                   # Service Layer API (Supabase Integration)
│   │   ├── assetService.ts         # CRUD Master Assets & View
│   │   ├── mutationService.ts      # Log Mutasi & Handover Asset
│   │   ├── siteService.ts          # Fetch Sites & Regions
│   │   └── csvImportService.ts     # Parsing & Batch Chunking CSV Uploader
│   ├── types/                      # TypeScript Definitions
│   │   └── inventory.ts            # Types & Enum sesuai Schema SQL
│   └── views/                      # Tampilan Halaman/Tab
│       ├── DashboardView.tsx       # Ringkasan Statistik & Kategori
│       ├── ItemsView.tsx           # Daftar Aset Grouped by Region
│       ├── HistoryView.tsx         # Riwayat Mutasi & Handover
│       ├── SitesView.tsx           # Daftar Site Operasional
│       ├── OpnameView.tsx          # Audit Fisik Aset (Stock Opname)
│       └── ProfileView.tsx         # Profil Telegram User
├── .env.example                    # Template Environment Variables
├── package.json                    # Dependencies & Scripts
├── TMA.log                         # Log Perubahan Project Lengkap
└── vite.config.ts                  # Konfigurasi Vite Build
```

---

## 🔑 3. Aturan Arsitektur & Aturan Penting (Critical Rules)

### A. Integritas Data Kategori & Strict Validation Trigger
1. Tabel `master_assets` memiliki relasi **Foreign Key** `category_id` ke `master_categories(id)` DAN menyimpan nama `category` (TEXT) untuk konsistensi.
2. Database dilindungi oleh Trigger PostgreSQL `handle_asset_category_strict_sync` ([docs/auto_category_trigger.sql](file:///d:/Documents/05.%20PROJECT/TransitTMA/docs/auto_category_trigger.sql)):
   - **Nama Kategori Valid** $\rightarrow$ Otomatis dihubungkan dengan `category_id` yang sesuai.
   - **Nama Kategori Tidak Terdaftar / Typo** $\rightarrow$ `RAISE EXCEPTION` (Insert ditolak oleh database untuk mencegah data kotor/typo).

### B. Proteksi Role-Based Access Control (RBAC)
1. Fitur sensitif seperti **Import CSV Massal** dan **Soft Delete** hanya diizinkan untuk pengguna dengan `userRole === 'admin'`.
2. Komponen [CSVImportModal.tsx](file:///d:/Documents/05.%20PROJECT/TransitTMA/src/components/modals/CSVImportModal.tsx) & tombol pada [Header.tsx](file:///d:/Documents/05.%20PROJECT/TransitTMA/src/components/Header.tsx) secara eksplisit memeriksa `userRole`.

### C. Penanganan Payload Besar (Batch Chunking)
1. Untuk mencegah error payload / timeout Supabase (`Query is too large`), proses upload batch pada `csvImportService.ts` WAJIB menggunakan **Chunking 250 unit per request**.
2. Selalu sediakan callback progress ke UI saat memproses batch besar.

### D. Penanganan PostgREST FK Relationship
1. Saat membuat query `.select()` yang melibatkan relasi JOIN di Supabase:
   - Gunakan eksplisit nama Foreign Key (misal: `fk_mutation_asset`, `fk_mutation_from_site`, `fk_mutation_to_site`, `fk_mutation_user`).
   - Selalu sediakan fallback query / manual mapping di JavaScript jika schema cache PostgREST tidak menemukan relasi.

---

## 🛠️ 4. Workflow Pengembangan (Development Workflow)

1. **Sebelum Mengubah Code**:
   - Periksa `TMA.log` dan [docs/schema.sql](file:///d:/Documents/05.%20PROJECT/TransitTMA/docs/schema.sql) untuk memahami konteks perubahan sebelumnya.
   - Jangan berasumsi tentang tipe data; selalu periksa [src/types/inventory.ts](file:///d:/Documents/05.%20PROJECT/TransitTMA/src/types/inventory.ts).

2. **Pengujian Build & Type Checking**:
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan TypeScript.
   - Jalankan `npm run build` untuk memverifikasi bundle Vite.

3. **Dokumentasi Wajib (TMA.log)**:
   - Setiap selesai melakukan fitur baru, bugfix, atau migrasi SQL, catat perubahan di `TMA.log` dengan format STEP berurutan.

4. **Git Commit & Push**:
   - Gunakan pesan commit deskriptif (misal: `feat: ...`, `fix: ...`, `docs: ...`).
   - Pastikan file sensitif (`.env`, `.env.local`) tidak ter-commit ke Git.
