# 📋 TransitTMA — Project Development Log

> File ini adalah catatan perjalanan pengembangan proyek **TransitTMA** dari awal hingga saat ini.
> Selalu diperbarui setiap kali ada perubahan signifikan.

---

## 📌 Informasi Proyek

| Item | Detail |
|---|---|
| **Nama Proyek** | TransitTMA |
| **Tujuan** | Aplikasi IT Asset Inventory berbasis Telegram Mini App |
| **Platform** | Telegram Mini App (TMA) |
| **Stack** | React + TypeScript + Vite + Tailwind CSS v3 + Supabase |
| **Database** | PostgreSQL via Supabase |
| **Supabase Project** | `umhgqkbisdxfcxzkakqa.supabase.co` |
| **Lokasi Folder** | `d:\Documents\05. PROJECT\TransitTMA` |

---

## 🗓️ Session Log

---

### Session 1 — 2026-07-17 | Inisialisasi Proyek

**Tujuan:** Membuat proyek baru dari nol sebagai Telegram Mini App.

#### Yang Dilakukan:
- Membuat folder proyek baru `TransitTMA` menggunakan `npx create-vite@latest` dengan template **React + TypeScript**
- Menjalankan `npm install` untuk instalasi dependensi awal
- Membuat tampilan awal (placeholder) di `src/App.tsx` dengan desain premium glassmorphism
- Menulis `src/index.css` dengan design system dasar (dark mode, animasi fade-in/slide-up)
- Menambahkan script Telegram WebApp SDK ke `index.html`
- Mendeteksi lingkungan Telegram vs Browser biasa

#### File yang Dibuat/Dimodifikasi:
- `src/App.tsx` — Placeholder halaman utama
- `src/index.css` — CSS dasar dengan glassmorphism
- `index.html` — Ditambah script Telegram WebApp SDK

---

### Session 2 — 2026-07-17 | Konversi Prototype (script01.txt)

**Tujuan:** Menggunakan `script01.txt` sebagai prototype dan mengkonversinya ke arsitektur React + TypeScript yang proper.

#### Tentang Prototype (`script01.txt`):
File HTML single-page dengan fitur:
- Dashboard dengan 4 stat cards (Total, Tersedia, Dipinjam, Rusak)
- Daftar barang dengan filter dan search
- Riwayat aktivitas
- Profil dan menu
- Bottom navigation 4 tab
- Add/Edit/Delete modal (bottom sheet)
- QR Scanner simulasi
- Toast notification
- Data disimpan di localStorage

#### Keputusan Arsitektur:
- Menggunakan **Tailwind CSS v3** (bukan CDN, di-install sebagai dependensi)
- Memisahkan kode menjadi komponen dan views yang reusable

#### Yang Dilakukan:
- Install `tailwindcss@3` + `postcss` + `autoprefixer`
- Konfigurasi `tailwind.config.js` dan `postcss.config.js`
- Membuat struktur folder: `src/types/`, `src/data/`, `src/hooks/`, `src/components/`, `src/views/`

#### File yang Dibuat:

**Types & Data:**
- `src/types/inventory.ts` — Interface `InventoryItem`, `HistoryLog`, config maps
- `src/data/sampleData.ts` — 5 data sample barang IT
- `src/hooks/useInventory.ts` — Custom hook dengan localStorage (CRUD + history)

**Komponen:**
- `src/components/StatusBadge.tsx` — Badge status berwarna
- `src/components/ItemCard.tsx` — Card item dengan icon kategori
- `src/components/Header.tsx` — Header sticky dengan search bar
- `src/components/BottomNav.tsx` — Bottom navigation 4 tab
- `src/components/Toast.tsx` — Notifikasi toast
- `src/components/modals/ItemFormModal.tsx` — Form tambah/edit item
- `src/components/modals/ItemDetailModal.tsx` — Detail item + aksi
- `src/components/modals/QRScannerModal.tsx` — Simulasi scan QR

**Views:**
- `src/views/DashboardView.tsx` — Halaman beranda
- `src/views/ItemsView.tsx` — Daftar barang + filter
- `src/views/HistoryView.tsx` — Log aktivitas
- `src/views/ProfileView.tsx` — Profil dan menu

**Update:**
- `src/App.tsx` — Orchestrator semua view + modals
- `src/index.css` — Semua custom CSS dari prototype
- `index.html` — Meta description, Font Awesome CDN

---

### Session 3 — 2026-07-18 | Alignment dengan Database Schema (SQL)

**Tujuan:** Menyesuaikan struktur data TypeScript dengan skema PostgreSQL resmi yang didefinisikan di `docs/schema.sql`.

#### Schema yang Dibuat (`docs/schema.sql`):

| Tabel/View | Keterangan |
|---|---|
| `sites` | Daftar lokasi/site (PK: `site_code VARCHAR(4)`) |
| `telegram_users` | Pengguna Telegram dengan role (admin/user/guest) |
| `master_assets` | Tabel utama aset IT |
| `asset_mutations` | Log perpindahan aset antar site |
| `view_assets_detail` | VIEW join antara `master_assets` + `sites` |

**Enum baru:**
- `asset_status`: `Active`, `Backup`, `Broken`, `Repair`
- `user_role`: `admin`, `user`, `guest`

#### Perbedaan Utama dari Prototype:

| Aspek | Prototype Lama | Schema Baru |
|---|---|---|
| Status | `tersedia/dipinjam/rusak/perbaikan` | `Active/Backup/Broken/Repair` |
| Field aset | `code, name, specs, pic` | `serial_number, bta_number, brand, model_type, computer_name` |
| Lokasi | String bebas | Relasi FK ke tabel `sites` |
| History | Log sederhana | Tabel `asset_mutations` (mutasi antar site) |

---

### Session 4 — 2026-07-18 | Integrasi Supabase

**Tujuan:** Mengganti localStorage dengan koneksi langsung ke Supabase (PostgreSQL).

#### Keputusan yang Disepakati:

| Keputusan | Pilihan |
|---|---|
| Backend | **Supabase** (langsung, bukan localStorage) |
| Auth Telegram | **Hardcoded sementara** (telegram_id: 999999999, name: "Admin IT") |
| Nama Tab "Barang" | Diganti menjadi **"Aset"** |

#### Credentials Supabase:
- **URL:** `https://umhgqkbisdxfcxzkakqa.supabase.co`
- **Anon Key:** `sb_publishable_6OLXZ60kkzvRDiM38AFMOw_t0fklOB1`
- Disimpan di `.env` sebagai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`

#### Yang Dilakukan:
- Install `@supabase/supabase-js`
- Buat `.env` dengan credentials Supabase
- Refaktor total `src/types/inventory.ts` selaras 1:1 dengan schema SQL

#### File yang Dibuat:
- `src/lib/supabase.ts` — Inisialisasi Supabase client
- `src/services/assetService.ts` — CRUD `master_assets` + `view_assets_detail`
- `src/services/siteService.ts` — CRUD `sites`
- `src/services/mutationService.ts` — CRUD `asset_mutations` dengan nested join
- `src/components/modals/MutationModal.tsx` — Modal baru untuk proses mutasi aset (pindah site)
- `docs/schema.sql` — File SQL resmi skema database
- `docs/DEVLOG.md` — File ini (project development log)

#### File yang Diupdate:
- `src/hooks/useInventory.ts` — Ganti localStorage ke Supabase async + loading/error state
- `src/types/inventory.ts` — Refaktor total (types baru: `AssetDetail`, `MutationDetail`, `Site`, dll.)
- `src/components/StatusBadge.tsx` — Label baru: Active/Backup/Broken/Repair
- `src/components/ItemCard.tsx` — Field baru: brand, model_type, site_name
- `src/components/Header.tsx` — Title "Daftar Aset", search placeholder baru
- `src/components/BottomNav.tsx` — "Barang" menjadi "Aset", "Riwayat" menjadi "Mutasi"
- `src/components/modals/ItemFormModal.tsx` — Field baru sesuai schema
- `src/components/modals/ItemDetailModal.tsx` — Tampil field baru + tombol "Pindah"
- `src/views/DashboardView.tsx` — Stats baru + loading skeleton
- `src/views/ItemsView.tsx` — Filter chips baru, search field baru
- `src/views/HistoryView.tsx` — Tampilkan mutasi aset (from/to site, moved_by)
- `src/views/ProfileView.tsx` — Info hardcoded user + Supabase connection badge
- `src/App.tsx` — Integrasi semua hook + mutation modal + error handling
- `src/index.css` — CSS badge baru (status-active/backup/broken/repair)

---

## 🏗️ Arsitektur Saat Ini

```
TransitTMA/
├── .env                           # Supabase credentials (jangan di-commit!)
├── index.html                     # Entry point + Telegram SDK + Font Awesome
├── tailwind.config.js             # Tailwind v3 config
├── docs/
│   ├── schema.sql                 # Skema PostgreSQL resmi
│   └── DEVLOG.md                  # File ini
└── src/
    ├── main.tsx                   # React entry
    ├── App.tsx                    # Root component & state orchestrator
    ├── index.css                  # Global styles
    ├── lib/
    │   └── supabase.ts            # Supabase client
    ├── types/
    │   └── inventory.ts           # Semua TypeScript interfaces & config maps
    ├── data/
    │   └── sampleData.ts          # (Kosong - data dari Supabase)
    ├── hooks/
    │   └── useInventory.ts        # State management + Supabase calls
    ├── services/
    │   ├── assetService.ts        # CRUD master_assets + view_assets_detail
    │   ├── siteService.ts         # CRUD sites
    │   └── mutationService.ts     # CRUD asset_mutations (dengan join)
    ├── components/
    │   ├── StatusBadge.tsx        # Badge status aset
    │   ├── ItemCard.tsx           # Card aset di list
    │   ├── Header.tsx             # Header sticky + search
    │   ├── BottomNav.tsx          # Bottom navigation 4 tab
    │   ├── Toast.tsx              # Notifikasi singkat
    │   └── modals/
    │       ├── ItemFormModal.tsx   # Form tambah/edit aset
    │       ├── ItemDetailModal.tsx # Detail aset + aksi
    │       ├── MutationModal.tsx   # Pindah aset antar site
    │       └── QRScannerModal.tsx  # Simulasi QR scan
    └── views/
        ├── DashboardView.tsx      # Beranda: stats + kategori + recent
        ├── ItemsView.tsx          # Daftar aset + filter + search
        ├── HistoryView.tsx        # Riwayat mutasi aset
        └── ProfileView.tsx        # Profil user + menu
```

---

## 📊 Status Fitur Saat Ini

| Fitur | Status | Keterangan |
|---|---|---|
| Inisialisasi proyek Vite + React + TypeScript | ✅ Done | |
| Integrasi Tailwind CSS v3 | ✅ Done | |
| Komponen UI (cards, badges, modals, nav) | ✅ Done | |
| Koneksi Supabase | ✅ Done | |
| TypeScript types selaras schema SQL | ✅ Done | |
| Service layer (CRUD via Supabase) | ✅ Done | |
| Modal Mutasi Aset | ✅ Done | |
| Tab "Aset" dan "Mutasi" | ✅ Done | |
| Telegram WebApp SDK | ✅ Done | |
| Schema SQL (docs/schema.sql) | ✅ Done | Perlu dijalankan di Supabase |
| Seed data (sites + users) | ⏳ Pending | Perlu insert manual |
| Auth Telegram (real) | ⏳ Pending | Sementara hardcoded |
| QR Scanner (kamera nyata) | ⏳ Pending | |
| Export CSV/Excel | ⏳ Pending | |
| Push Notification Telegram | ⏳ Pending | |

---

## ⚠️ Hal Penting yang Perlu Diingat

1. **File `.env` tidak boleh di-commit ke Git** — berisi credentials Supabase
2. **Hardcoded user** (`telegram_id: 999999999`, name: "Admin IT") digunakan sementara di field `moved_by` pada tabel `asset_mutations` — harus diganti dengan auth Telegram sungguhan setelah fitur tersebut diimplementasi
3. **Schema SQL harus dijalankan terlebih dahulu** di Supabase SQL Editor (`docs/schema.sql`) sebelum app bisa berjalan
4. **Data seed** (minimal tabel `sites` dan `telegram_users`) perlu diisi sebelum fitur mutasi bisa digunakan
5. **anon key Supabase** format baru: `sb_publishable_...` (bukan `eyJ...` JWT) — ini valid untuk Supabase terbaru

---

## 🚀 Next Steps (Rencana Berikutnya)

- [ ] Jalankan `docs/schema.sql` di Supabase SQL Editor
- [ ] Insert data seed: minimal beberapa `sites` dan `telegram_users` (telegram_id = 999999999)
- [ ] Test koneksi end-to-end: tambah aset, mutasi aset, lihat riwayat
- [ ] Implementasi Telegram Auth (ganti hardcoded user dengan `WebApp.initDataUnsafe.user`)
- [ ] QR Scanner dengan kamera nyata (menggunakan library `html5-qrcode` atau `zxing`)
- [ ] Fitur Export CSV/Excel
- [ ] Notifikasi via Telegram Bot API

---

*Dibuat: 2026-07-18 | Terakhir diperbarui: 2026-07-18*
