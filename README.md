# TransitTMA — IT Asset Inventory Telegram Mini App (TMA)

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.1-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?logo=supabase)

**TransitTMA** adalah aplikasi Telegram Mini App (TMA) berbasis React + TypeScript yang dirancang khusus untuk manajemen aset TI (*IT Asset Inventory*), pelacakan mutasi/perpindahan aset antar lokasi (*handover & movement*), audit fisik (*stock opname*), dan impor data massal berbasis CSV dengan pengawasan ketat integritas data (*strict category validation*).

---

## 🌟 Fitur Utama

- **📊 Dashboard Interaktif**: Ringkasan statistik status aset (Active, Backup, Repair, In Transit, Disposed, Retired) & navigasi cepat per kategori.
- **💻 Manajemen Daftar Aset**: Pengelompokan daftar aset berdasarkan **Region/Wilayah** lokasi site operasional.
- **📦 Mutasi Aset (Maker-Checker Handover)**: Catat perpindahan aset antar site dengan alur status (*Pending → Completed / In Transit* saat diterima oleh penerima).
- **📝 Stock Opname (Audit Fisik)**: Fasilitas audit fisik aset berbasis lokasi untuk mencatat status ditemukannya aset (*Ditemukan*, *Hilang*, *Nyasar*).
- **📷 QR / Barcode Scanner Nyata**: Scanner kamera langsung di Telegram Mini App menggunakan `html5-qrcode` — mendukung QR Code, Code 128, Code 39, EAN-13, dan format lainnya. Otomatis membuka detail aset saat kode terdeteksi.
- **📤 Import CSV Massal (Khusus Role Admin)**:
  - Validasi kategori *strict* terhadap database `master_categories` untuk mencegah typo / data kotor.
  - Penanganan payload besar menggunakan **Chunking 250 unit per request** (bebas dari limit query browser).
  - Opsi interaktif Admin: hubungkan typo ke kategori resmi, auto-create kategori baru, atau tombol **"Abaikan / Skip"** unit tertentu.
  - Upload ulang CSV yang sama aman 100% karena menggunakan UPSERT berbasis `serial_number`.
- **🔐 Dual Authentication (Telegram Auto-Login & Web Form Login)**:
  - **Via Telegram Mini App**: Auto-login menggunakan Telegram ID dari SDK (`window.Telegram.WebApp`) — tanpa form, tanpa password.
  - **Via Browser Web**: Halaman login dengan form **Telegram ID + Password** (bcrypt hash, diverifikasi di server via Supabase RPC).
  - **Set Password Web**: User dapat mengatur password akses web dari dalam aplikasi saat login via Telegram.
  - **Logout Web**: Sesi web menggunakan `sessionStorage` (logout otomatis saat browser ditutup).
- **🤖 Interactive Telegram Bot Access Request & Approval**:
  - Otomatis mengidentifikasi Telegram ID, Nama, & Username pengguna dari Telegram WebApp SDK.
  - Pengguna berstatus **Guest** dapat mengajukan verifikasi akses Tim IT via tombol **"Request Akses Tim IT"** di halaman Profil.
  - Telegram Bot mengirimkan pesan notifikasi interaktif lengkap dengan **Tombol Persetujuan 1-Klik** (`✅ Setujui User`, `👑 Setujui Admin`, `❌ Tolak`) langsung ke Grup Admin IT.
  - Approval Admin di Telegram otomatis mengubah role pengguna di Supabase secara real-time dan mengirim notifikasi konfirmasi ke Telegram pengguna.
- **🛡️ Keamanan & Integritas Data**:
  - Soft Delete (`deleted_at`) untuk mencegah kehilangan riwayat aset.
  - PostgreSQL Trigger (`handle_asset_category_strict_sync`) untuk sinkronisasi dan penolakan otomatis data tidak terdaftar.
  - Role-Based Access Control (RBAC) membatasi akses fitur sensitif untuk role `admin`.
  - Password web disimpan sebagai **bcrypt hash** di database — hash tidak pernah dikirim ke client.

---

## 🏗️ Arsitektur Project

```
TransitTMA/
├── .agents/
│   └── AGENTS.md                   # Panduan Lengkap Agent AI & Developer
├── docs/                           # Documentation & SQL Database Scripts
│   ├── schema.sql                  # PostgreSQL Schema Enterprise
│   ├── migration.sql               # Script Migrasi Database
│   ├── seed_categories.sql         # Data Seed Master Kategori (ID 44-80)
│   ├── auto_category_trigger.sql   # Trigger Validation Strict Kategori
│   ├── import_assets_from_csv.sql  # Script Staging & Migrasi CSV
│   ├── web_auth_rpc.sql            # SQL Migration: Web Auth (web_password + RPC)
│   └── bot_webhook_handler.js      # Telegram Bot Webhook Handler (Node.js)
├── src/
│   ├── components/                 # Reusable UI Components & Modals
│   │   ├── Header.tsx              # Top Navigation Bar & Tombol Admin
│   │   ├── BottomNav.tsx           # Bottom Tab Navigation
│   │   ├── ItemCard.tsx            # Card Component Tampilan Aset
│   │   └── modals/                 # Interactive Modal Components
│   │       ├── CSVImportModal.tsx  # Uploader & Validator CSV Khusus Admin
│   │       ├── ItemFormModal.tsx   # Form Tambah / Edit Aset
│   │       ├── ItemDetailModal.tsx # Detail Aset & Aksis
│   │       ├── MutationModal.tsx   # Form Mutasi / Perpindahan Aset
│   │       ├── QRScannerModal.tsx  # Scanner QR / Barcode (html5-qrcode)
│   │       ├── RequestAccessModal.tsx  # Form Request Akses Tim IT (Guest)
│   │       └── SetPasswordModal.tsx    # Atur Password Akses Web
│   ├── contexts/
│   │   └── AuthContext.tsx         # AuthProvider & useAuth() Hook (Dual Auth)
│   ├── hooks/
│   │   └── useInventory.ts         # Central State Management Hook
│   ├── lib/
│   │   └── supabase.ts             # Supabase Client Initialization
│   ├── services/                   # API Integration Layer
│   │   ├── assetService.ts         # Asset CRUD & View Integration
│   │   ├── authService.ts          # Auth Service: Web Login, Session, Password
│   │   ├── mutationService.ts      # Mutation Log & Handover
│   │   ├── siteService.ts          # Fetch Sites & Regions
│   │   ├── csvImportService.ts     # Parsing & Chunking Upload CSV
│   │   └── userService.ts          # Telegram SDK User Sync & Bot Notification
│   ├── types/
│   │   └── inventory.ts            # TypeScript Definitions & Enums
│   └── views/                      # Main Page / Tab Views
│       ├── DashboardView.tsx       # Ringkasan Stats & Grid Kategori
│       ├── ItemsView.tsx           # Daftar Aset Grouped by Region
│       ├── HistoryView.tsx         # Riwayat Mutasi Aset
│       ├── LoginView.tsx           # Halaman Login Web (Telegram ID + Password)
│       ├── SitesView.tsx           # Daftar Lokasi Site Operasional
│       ├── OpnameView.tsx          # Audit Fisik Aset
│       └── ProfileView.tsx         # Profil User & Pengaturan Akses Web
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
cd TransitTMA
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env` di root project berdasarkan `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Opsional: Untuk fitur notifikasi Telegram Bot (Request Akses Admin)
VITE_TELEGRAM_BOT_TOKEN=your-bot-token-here
VITE_TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id-here
```

### 4. Setup Database Supabase
Eksekusi file SQL yang berada di folder `docs/` secara berurutan di Supabase SQL Editor:

| Urutan | File | Keterangan |
|--------|------|-----------|
| 1 | `docs/schema.sql` | Membuat tabel dasar, type ENUM, dan VIEW |
| 2 | `docs/seed_categories.sql` | Mengisi data master kategori (ID 44–80) |
| 3 | `docs/auto_category_trigger.sql` | Memasang trigger validasi strict kategori |
| 4 | `docs/web_auth_rpc.sql` | **Wajib untuk fitur Web Login**: kolom `web_password` + RPC functions |

### 5. Jalankan Local Development Server
```bash
npm run dev
```

---

## 🔐 Pengaturan Password Akses Web

Untuk pengguna yang ingin login via browser (bukan Telegram):
1. Buka aplikasi **via Telegram Mini App** terlebih dahulu (auto-login).
2. Buka tab **Profil** → klik menu **"Password Akses Web"**.
3. Set password minimal 8 karakter.
4. Sekarang Anda dapat login via browser menggunakan **Telegram ID + Password** di halaman [Login Web](https://tmaproject.vercel.app).

> **Tips**: Cek Telegram ID Anda via `@userinfobot` di Telegram.

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
Project ini dibuat untuk manajemen internal TI **TransitTMA**.
