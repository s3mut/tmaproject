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
- **📦 Mutasi Aset (Maker-Checker Handover)**: Catat perpindahan aset antar site dengan alur status (*Pending → Completed / In Transit*), dilengkapi filter status, pencarian real-time di riwayat mutasi, dan fitur **Pencarian Aset by QR/Barcode Scan** (Zero-Click Logistics) yang otomatis menyeleksi barang seketika setelah disekan.
- **🤝 Manajemen Peminjaman Aset & Alur RMA (5-Phase Loan Management)**: Sistem sirkulasi pinjam unit backup sementara untuk Toko dengan siklus kendali profesional:
  - **Fase Pengenalan & Preview Regional**: Pencarian stok unit backup yang tersatukan secara regional di background (`sites.region`). Sebelum submit, toko dapat melihat kartu Preview Alokasi Unit Backup yang menampilkan ketersediaan unit di hub region terdekatnya.
  - **Fase Pengajuan (Request) & Pembatalan Mandiri**: Penomoran unik otomatis anti-duplikasi (`LOAN-[SITE]-[YYMM]-[4_DIGIT_SEQ]`), pemilihan Alias Toko via *auto-complete*, dan sistem alert bila estimasi melebihi durasi standar 14 hari. Pengaju (Creator/Admin) juga berhak menekan tombol **⚪ Batal** (*Cancelled*) sebelum barang diproyeksikan.
  - **Fase Alokasi & Inspeksi Spesifikasi (Dispatch)**: Tim IT dapat melihat **Inspeksi Spesifikasi Lengkap** (S/N, Merek, Model, Aktiva, External ID) pada tiap kandidat dengan prioritas ⭐ Satu Region, menyeken barcode/QR fisik, atau melakukan **🚫 Penolakan Tiket (Reject)** dengan input wajib alasan penawaran.
  - **Fase Penerimaan (Receiving)**: Konfirmasi penerimaan saat barang sampai di toko dalam 1-klik yang memindahkan status unit fisik menjadi *Borrowed* di site Toko.
  - **Fase Monitoring Dinamis**: Peringatan awal **🟡 H-3 Jatuh Tempo** dan eskalasi visual **🔴 OVERDUE** (berkendip & bergaris merah bercahaya) secara real-time apabila barang terlambat dikembalikan.
  - **Fase Pengembalian & Verifikasi (Return)**: Toko mengklik *Kembalikan Unit*, lalu Tim IT memverifikasi kondisi fisik saat barang tiba (Pilihan: `✅ Bagus` reset jadi Backup, `🛠️ Rusak` ubah jadi Repair, atau `❌ Hilang` ubah jadi Disposed/Klaim).
  - **📄 Generator Dokumen BAST & Shipping Label**: Template Berita Acara Serah Terima berdesain korporasi resmi bersumber spesifikasi lengkap dan slot tanda tangan digital yang siap cetak langsung (*Print-Ready* / Save PDF).
  - **🌐 Enterprise RBAC & Regional Auto-Routing (Intra vs. Cross-Region)**: Pembatasan wewenang teknisi IT cabang berdasarkan wilayah (`assigned_region`). Penguncian visual otomatis (`🔒 Wilayah [Region]`) bagi teknisi di luar wilayah kerjanya. Jika stok di region toko kosong, pengajuan otomatis dieksplorasikan ke Alur B (Cross-Region Escalation) dengan status **`Waiting Admin Approval`** agar diotorisasi Admin Global untuk alokasi dari Gudang Pusat / HQ.
  - **🛡️ Audit Trail Alasan Terstruktur & God Mode Override**: Kewajiban memilih kategori alasan terstruktur dan keterangan saat pembatalan maupun penolakan. Admin Global juga diberdayakan dengan tombol otoritas tertinggi **⚡ Force Cancel** untuk penarikan paksa aset yang mereset status fisik secara otomatis kembali ke *Backup*.
- **📈 Enterprise Documentation & Reporting (Recharts & SQL Analytics)**: Dasbor pelaporan eksekutif berbekal visualisasi grafik modern yang ditenagai oleh **Recharts** dan komputasi langsung dari PostgreSQL Views/RPC:
  - **KPI Summary**: Area Chart untuk trend mutasi 12 bulan terakhir dan Donut/Pie Chart proporsi distribusi status aset fisik.
  - **Loans & SLA Monitoring**: Pelacakan tingkat keterlambatan (*Overdue Alerts*) dengan aksi ekspor CSV dan pemicu notifikasi peringatan ke Telegram Bot.
  - **Audit Trail & Utilization**: Linimasa rekam jejak siklus hidup tiap unit aset serta Horizontal Bar Chart untuk ranking utilisasi peminjaman tertinggi per cabang.
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
│   └── bot_webhook_handler.js      # Telegram Bot Webhook Handler (Node.js)
├── sql/
│   ├── create_asset_loans.sql              # Skema Database & Migrasi Sistem Peminjaman
│   └── upgrade_rbac_regional_workflow.sql  # Migrasi Enterprise RBAC, User Region & Cross-Region RPC
├── src/
│   ├── components/                 # Reusable UI Components & Modals
│   │   ├── ui/                     # Atomic Design System Component Library
│   │   │   ├── Button.tsx          # Tombol Serbaguna (6 wujud, 3 ukuran, loading state)
│   │   │   ├── Input.tsx           # Standard Input dengan focus ring & error state
│   │   │   ├── Select.tsx          # Customized Dropdown Select
│   │   │   ├── Textarea.tsx        # Standard Textarea
│   │   │   ├── Badge.tsx           # Asset Status, Mutation, & Role Badges
│   │   │   ├── Skeleton.tsx        # Responsive Loading Animations
│   │   │   ├── ModalShell.tsx      # Unified Wrapper untuk Modals & Overlay
│   │   │   ├── SectionHeader.tsx   # Standard Section Titles & Action Buttons
│   │   │   ├── EmptyState.tsx      # Empty Data Placeholders
│   │   │   └── SiteSearchInput.tsx # High-Performance Auto-Complete Site Search
│   │   ├── Header.tsx              # Top Navigation Bar & Tombol Admin
│   │   ├── BottomNav.tsx           # Bottom Tab Navigation
│   │   ├── ItemCard.tsx            # Card Component Tampilan Aset
│   │   └── modals/                 # Interactive Modal Components
│   │       ├── AuditTrailModal.tsx # Linimasa Rekam Jejak Audit per Unit Aset
│   │       ├── BackupModal.tsx     # Modal Backup & Export CSV/JSON (Khusus Admin)
│   │       ├── BASTDocumentModal.tsx # Generator Dokumen BAST & Shipping Label PDF
│   │       ├── CancelRejectModal.tsx # Form Alasan Wajib Terakreditasi (Cancel/Reject/Force)
│   │       ├── ConfirmModal.tsx    # Modal Konfirmasi Pengganti window.confirm
│   │       ├── CSVImportModal.tsx  # Uploader & Validator CSV Khusus Admin
│   │       ├── DispatchLoanModal.tsx # Alokasi & Scan Barcode Peminjaman IT
│   │       ├── ItemFormModal.tsx   # Form Tambah / Edit Aset
│   │       ├── ItemDetailModal.tsx # Detail Aset & Aksis
│   │       ├── LoanReportModal.tsx # Generator Laporanan Transaksi Peminjaman
│   │       ├── MutationModal.tsx   # Form Mutasi / Perpindahan Aset
│   │       ├── OverdueAlertModal.tsx # Daftar Keterlambatan, Export CSV & Telegram Bot Alert
│   │       ├── QRScannerModal.tsx  # Scanner QR / Barcode (html5-qrcode)
│   │       ├── RequestAccessModal.tsx # Form Request Akses Tim IT (Guest)
│   │       ├── RequestLoanModal.tsx   # Form Pengajuan Peminjaman Toko
│   │       ├── ReturnCheckModal.tsx   # Verifikasi Kondisi Barang Kembalian IT
│   │       ├── SetPasswordModal.tsx   # Atur Password Akses Web
│   │       └── UserManagementModal.tsx # Panel Admin Manajemen Role & Teritori IT
│   ├── contexts/
│   │   └── AuthContext.tsx         # AuthProvider & useAuth() Hook (Dual Auth)
│   ├── hooks/
│   │   ├── useInventory.ts         # Central State Management Hook (Inventaris & Loans)
│   │   └── useReport.ts            # Hook Analitik & State Management Laporan
│   ├── lib/
│   │   └── supabase.ts             # Supabase Client Initialization
│   ├── services/                   # API Integration Layer
│   │   ├── assetService.ts         # Asset CRUD & View Integration
│   │   ├── authService.ts          # Auth Service: Web Login, Session, Password
│   │   ├── csvImportService.ts     # Parsing & Chunking Upload CSV
│   │   ├── loanService.ts          # API Layer Siklus Peminjaman & Overdue
│   │   ├── mutationService.ts      # Mutation Log & Handover
│   │   ├── reportService.ts        # Service Pelaporan, Export CSV, & Telegram Notif
│   │   ├── siteService.ts          # Fetch Sites & Regions
│   │   └── userService.ts          # Telegram SDK User Sync & Bot Notification
│   ├── types/
│   │   └── inventory.ts            # TypeScript Definitions & Enums
│   └── views/                      # Main Page / Tab Views
│       ├── DashboardView.tsx       # Ringkasan Stats & Grid Kategori
│       ├── ItemsView.tsx           # Daftar Aset Grouped by Region
│       ├── HistoryView.tsx         # Riwayat Mutasi Aset
│       ├── LoansView.tsx           # Dashboard Monitoring Peminjaman & BAST
│       ├── LoginView.tsx           # Halaman Login Web (Telegram ID + Password)
│       ├── ReportView.tsx          # Dashboard Pelaporan Enterprise & Grafik Recharts
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
cd E1-TMA
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
| 4 | `docs/setup_web_auth_and_dummy_users.sql` | **Wajib**: Setup lengkap Web Auth (kolom password, semua fungsi RPC) + 3 akun dummy untuk testing |
| 5 | `docs/reporting_views_and_rpcs.sql` | Mengaktifkan 5 Views & 4 RPC untuk sistem analitik dan pelaporan real-time |

> **⚠️ Catatan**: Script nomor 4 bersifat **idempotent** (aman dijalankan berulang kali) dan sudah mencakup semua kebutuhan setup web login.

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
