# Ringkasan Pengembangan Sistem Inventory (E1-TMA)
**Tanggal Sesi:** 26 Agustus 2026

Dokumen ini berisi rangkuman komprehensif dari diskusi, perbaikan, dan penambahan fitur yang dilakukan pada sistem Telegram Mini App (TMA) Inventory selama sesi pengembangan ini.

---

## 1. Persetujuan Transaksi via Telegram (Webhook)
**Kebutuhan:** Memungkinkan Admin IT / Super Admin untuk merespons (Menyetujui/Menolak) pengajuan mutasi atau peminjaman langsung dari obrolan (chat) Telegram tanpa harus login ke dalam aplikasi web.

**Implementasi:**
- **Edge Function:** Membuat fungsi *serverless* (`supabase/functions/telegram-bot`) yang memiliki *endpoint* `/notify` untuk mengirim pesan notifikasi ke admin, dan `/webhook` untuk menangkap klik tombol *Inline Keyboard* (Approve/Reject) dari Telegram.
- **Dukungan Super Admin:** Menambahkan logika agar jika `assigned_region` Admin bernilai `"ALL"`, maka ia berhak menerima dan memproses permintaan dari *region* manapun.
- **Pembersihan (Clean-up):** Menghapus *file* dan komponen lawas yang sudah usang akibat perombakan sistem transaksi terpadu (seperti `RequestLoanModal.tsx`, `DispatchLoanModal.tsx`, `ReturnCheckModal.tsx`, dan *script* Node.js lama).

---

## 2. Penyempurnaan Alur Peminjaman (Borrowing Workflow)
**Kebutuhan:** Menjelaskan prosedur (SOP) peminjaman unit *backup* oleh toko serta memperbaiki logika pemindahan lokasi aset saat transaksi selesai.

**Perbaikan Logika (Bugfix):**
- Sebelumnya, saat status transaksi peminjaman diubah menjadi **Completed**, sistem secara permanen memindahkan lokasi aset tersebut ke toko peminjam. 
- **Solusi:** Logika pada `transactionService.ts` telah diperbaiki. Kini, jika transaksi bertipe "Peminjaman" (*Borrowing*) diselesaikan, lokasi aset akan otomatis **dikembalikan ke gudang asal** (`from_site_code`), bukan menetap di toko. 

**Prosedur Input Unit Backup Baru:**
- **Satuan:** Menggunakan menu *Tambah Aset* secara manual dan men-set statusnya menjadi `Backup`.
- **Massal (Kiriman CSO):** Menggunakan fitur *Import CSV* oleh Admin IT.

---

## 3. Fitur Ekspor Usulan Pemusnahan (Bulk Disposal Draft)
**Kebutuhan:** Tim IT seringkali butuh untuk mencetak daftar aset yang diajukan untuk dimusnahkan guna meminta tanda tangan atasan sebelum pemusnahan dieksekusi secara sistem.

**Implementasi:**
- Fitur pemusnahan massal tetap bersifat eksekusi langsung (mengubah status aset menjadi *Disposed* & mencetak BAST Pemusnahan).
- **Fitur Baru:** Menambahkan tombol **"Export Daftar Usulan (CSV Excel)"** di dalam `BulkDisposalModal.tsx`. Tombol ini memungkinkan Admin IT untuk memilih barang-barang yang rusak, lalu mengunduh daftarnya ke dalam format CSV tanpa mengeksekusi proses pemusnahan di *database*.

---

## 4. Pelacakan Keterlambatan & Pengingat Otomatis (Overdue Tracking & Auto-Reminder)
**Kebutuhan:** Banyak kasus di lapangan di mana toko meminjam mesin *backup* namun lupa mengembalikannya dalam waktu yang lama.

**Implementasi:**
- **Database:** Menambahkan kolom `duration_days` dan `due_date` pada tabel `asset_transactions`.
- **Formulir Transaksi:** Memaksa peminjam untuk memasukkan "Durasi Pinjam (Hari)" jika memilih tipe transaksi peminjaman.
- **Kalkulasi Jatuh Tempo:** Sistem akan otomatis menghitung tanggal jatuh tempo (`due_date`) saat toko/Admin menekan tombol "Terima" (*In Progress*).
- **Pengingat Harian (Cron Job Telegram):** Membuat *Edge Function* baru bernama `cron-overdue`. Jika diaktifkan via *Cron Job* Supabase, skrip ini akan menyeleksi barang yang lewat batas waktu (*overdue*) dan mengirimkan laporan harian (rekap) ke Telegram masing-masing Admin IT Region.
