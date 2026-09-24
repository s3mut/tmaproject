# 🗺️ Peta Alur Navigasi & Proses E1-TMA

Berikut adalah diagram alur komprehensif dari semua menu dan antarmuka di dalam aplikasi. Kotak berwarna kuning/merah menandakan area yang alurnya masih terputus atau belum diimplementasikan sepenuhnya.

```mermaid
flowchart TD
    %% Styling
    classDef mainMenu fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef modal fill:#334155,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef process fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    classDef missing fill:#451a03,stroke:#ef4444,stroke-width:2px,stroke-dasharray: 5 5,color:#fca5a5

    Start((Aplikasi Dibuka)) --> Auth{Cek Sesi}
    Auth -->|Telegram WebApp| Main[Navigasi Utama]
    Auth -->|Web Browser / Belum Login| Login(LoginView)
    Login --> Main
    
    Main ==> |Header| HeaderGroup
    Main ==> |Bottom Nav| BottomNavGroup
    
    %% HEADER
    subgraph HeaderGroup [Header Actions]
        H1(Tombol Scan QR) --> M1([QRScannerModal])
        M1 -->|Aset Ditemukan| M2([ItemDetailModal])
        
        H2(Tombol Import CSV) -->|Khusus Admin| M3([CSVImportModal])
        M3 -->|Proses Batch| DB1[(Simpan ke Database)]
    end

    %% BOTTOM NAV
    subgraph BottomNavGroup [Navigasi Bawah]
        T1[🏠 Dashboard]
        T2[🔄 Transactions]
        T3[🏢 Sites]
        T4[📋 Opname]
        T5[🗑️ Disposal]
        T6[👤 Profile]
    end

    %% DASHBOARD FLOW
    T1 --> D1(Tampil Ringkasan & Grafik)
    T1 -->|Filter| D2(Daftar Aset)
    T1 -->|Tombol +| M4([ItemFormModal])
    D2 -->|Klik Aset| M2
    
    M2 -->|Edit| M4
    M2 -->|Hapus / Soft Delete| M5([ConfirmModal])
    M2 -->|Mutasi / Pinjam| M6([TransactionModal])
    M2 -->|Afkir| M7([ProposeDisposalModal])

    M7 -->|Pilih Alasan| P1("Ubah Status -> PENDING_DISPOSAL")
    P1 -->|Upload Foto Fisik| Miss1["Upload ke Supabase Storage Belum Tersedia"]:::missing

    %% TRANSACTIONS FLOW
    T2 --> Tr1(Daftar Riwayat Transaksi)
    Tr1 --> Tr2(Update Status: Requested -> Transit -> Completed)
    Tr1 --> Miss2["Alur Transaksi Repair (Perbaikan) Belum Ada UI"]:::missing

    %% OPNAME FLOW
    T4 --> O1(Pilih Lokasi & Mulai Sesi)
    O1 --> O2(Sesi Aktif: Scan Aset)
    O2 -->|Scan Manual/Kamera| M1
    O2 -->|Selesai & Ajukan| O3(Submit Draft Rekonsiliasi)
    O3 --> O4(Terkunci / DocStatus=1)
    O4 -.-> Miss3["UI Super Admin (Reconciliation Queue) Belum Ada"]:::missing
    
    %% DISPOSAL FLOW
    T5 --> Disp1(Daftar Antrean Afkir / Pending Disposal)
    Disp1 -->|Khusus Admin| Disp2(Pilih Usulan & Batch Approve)
    Disp2 --> DB2[(Status berubah jadi Disposed)]

    %% PROFILE FLOW
    T6 --> Pr1(Tampil Data User TG)
    T6 -->|Buka Laporan| R1(ReportView)
    R1 -.-> Miss4["Grafik Analitik Lanjutan (Recharts) Belum Lengkap"]:::missing
    T6 -->|Khusus Admin| S1(SettingsView)
    
    S1 --> S2(Sinkronisasi Kategori / Master Data)

```

---

## ⚠️ Daftar Alur yang Terputus / Menggantung (Pending Finishing)

Berdasarkan analisis *system health check*, berikut adalah fitur-fitur yang logika *backend*-nya sebagian besar sudah ada atau direncanakan di BRD, namun **alur di layar (UI) belum rampung atau terputus**:

### 1. Antrean Persetujuan Rekonsiliasi Opname (Super Admin)
- **Status:** 🔴 Terputus Sepenuhnya.
- **Kondisi:** Saat ini, di halaman `OpnameView`, teknisi/auditor sudah bisa menekan tombol **"Ajukan Rekonsiliasi"** ke pusat. Dokumen tersebut sukses tersimpan di database (`stock_reconciliations` status = Submitted).
- **Masalah:** **TIDAK ADA HALAMAN** untuk Super Admin melihat daftar rekonsiliasi tersebut, mengecek selisihnya, dan menekan tombol *Approve*. Fungsi API-nya (`approveReconciliation` di `opnameService.ts`) sudah ditulis, tapi *UI-nya sama sekali belum dibuat*.

### 2. Lampiran Foto Fisik Aset saat Pengusulan Disposal
- **Status:** 🟠 Menggantung (Bisa dipakai tanpa foto, tapi melanggar tata kelola audit).
- **Kondisi:** Halaman `ProposeDisposalModal` sudah bisa dipakai untuk mengusulkan pembuangan barang yang rusak (Afkir). Di skema database, ada kolom `photo_url` untuk melampirkan bukti fisik kerusakan.
- **Masalah:** Di dalam UI *modal* pengajuan tersebut, belum ada tombol/fitur unggah (*upload file/camera*) untuk foto ke Supabase Storage. Pengajuan hanya berupa teks alasan saja.

### 3. Alur Transaksi "Repair" (Perbaikan)
- **Status:** 🟠 Belum Tersedia.
- **Kondisi:** Aplikasi ini dirancang untuk Mutasi (Pindah) dan Peminjaman (Borrow). Skema database sebenarnya sudah mendukung `transaction_type = 'Repair'`.
- **Masalah:** Belum ada form khusus atau logika antarmuka untuk mencatat pengiriman barang rusak ke pihak vendor/pihak ke-3, estimasi harga perbaikan, dan waktu selesainya.

### 4. Edge Function: Notifikasi "Overdue" (Jatuh Tempo Peminjaman)
- **Status:** 🟠 Tertunda.
- **Kondisi:** Aplikasi sudah berhasil mengirim notifikasi ke bot Telegram saat barang dikirim (*In Transit*). Namun, jika barang dipinjam dan batas waktunya (*Due Date*) lewat, tidak ada yang mengingatkan.
- **Masalah:** *Cron-job* harian (Supabase Edge Function) yang berfungsi untuk mengecek daftar peminjaman terlambat dan mengirimkan notifikasi *alert* ke Telegram belum ditulis/diaktifkan.

### 5. Halaman Laporan (Report View / Analytics)
- **Status:** 🟡 Sedang Berjalan / Sangat Standar.
- **Kondisi:** Tombol ke menu Laporan (di dalam tab Profile) sudah ada.
- **Masalah:** Mengacu pada BRD, manajemen ingin melihat tren pergerakan aset dan utilisasi lokasi (menggunakan *library* Recharts). Halaman saat ini masih berupa *placeholder* kosong atau sangat dasar.

---
**Tindakan Lanjutan:**
Apakah Anda ingin kita menyelesaikan **Alur Persetujuan Rekonsiliasi (Nomor 1)** terlebih dahulu agar alur Audit/Opname bisa dibilang *End-to-End* komplit?
