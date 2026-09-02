# Justifikasi Arsitektur: Alasan Mempertahankan Telegram Mini App (TMA) vs Standalone Web

**Dokumen**: Architecture & Business Justification  
**Proyek**: E1-TMA / TransitTMA (IT Asset & Movement Management System)  
**Target Pembaca**: Stakeholder, Management, IT Operation & Development Team  
**Tanggal**: 27 Agustus 2026  
**Status**: Approved / Active  

---

## 📌 1. Ringkasan Eksekutif (Executive Summary)

Dokumen ini memaparkan analisis komparatif serta alasan-alasan strategis, operasional, dan teknis mengapa aplikasi **E1-TMA** jauh lebih efektif dipertahankan sebagai **Telegram Mini App (TMA)** dibandingkan dikonversi menjadi aplikasi web mandiri (*standalone web browser*).

Karakteristik utama dari sistem manajemen aset TI dan mutasi barang adalah **operasional lapangan yang cepat (*fast-paced*), verifikasi fisik (*scan QR/barcode*), alur persetujuan (*approval maker-checker*), dan koordinasi antar-site**. Ekosistem Telegram Mini App memberikan keunggulan mutlak dalam aspek-aspek tersebut.

---

## 🚀 2. Alasan Strategis & Keunggulan Utama

### 1. Zero-Friction Authentication & Pencegahan Fraud (*Anti-Account Sharing*)
* **Zero-Login Experience**: Staf lapangan, teknisi, dan PIC site tidak perlu mengingat username, password, atau mengalami sesi login kedaluwarsa (*token expired*) saat sedang melakukan audit di lapangan.
* **Keamanan Kriptografis Telegram**: Telegram menyediakan `initData` yang ditandatangani secara kriptografis (*HMAC-SHA256* menggunakan Bot Token). Data identitas pengguna (`telegram_id`, `username`, nama lengkap) diverifikasi langsung secara valid tanpa celah *spoofing*.
* **Akuntabilitas Mutasi & Opname**: Pada website biasa, staf sering kali meminjamkan akun/kata sandi kepada rekan kerja untuk melakukan *approval* cepat. Di Telegram, akun terikat kuat pada nomor telepon dan perangkat pribadi pengguna, sehingga catatan log mutasi (*Maker-Checker*) dan audit memiliki nilai kepatuhan (*compliance*) yang tinggi.

---

### 2. Keandalan Notifikasi Real-Time & Bot Interaktif
* **Bypass Kelemahan Web Push**: Web Push Notification di browser (terutama Safari di iOS atau browser Android dengan mode hemat baterai) memiliki tingkat kegagalan tinggi karena izin notifikasi sering ditolak atau dibunuh oleh background OS. Notifikasi melalui Bot Telegram memiliki tingkat keterbacaan (*deliverability*) mendekati **100%**.
* **Actionable Bot Notifications**: Bot Telegram tidak hanya mengirim teks, melainkan kartu transaksi lengkap dengan tombol aksi (*Inline Keyboard Buttons*), seperti:
  * Tombol persetujuan mutasi langsung dari chat.
  * Peringatan jatuh tempo peminjaman unit (*overdue reminder* via Supabase Edge Function `cron-overdue`).
  * Notifikasi instan saat aset tiba di site tujuan (*handover acknowledgment*).

---

### 3. Akses Cepat & Adopsi Lapangan Maksimal (*Mobile-First*)
* **Zero Installation**: Teknisi tidak perlu mengunduh aplikasi terpisah dari Google Play Store / Apple App Store, dan tidak perlu menyimpan URL bookmark yang rentan terlupa atau terhapus.
* **Platform Komunikasi Harian**: Telegram adalah aplikasi yang sudah dibuka setiap saat oleh tim lapangan untuk koordinasi kerja. Mengintegrasikan TMA langsung ke aplikasi yang sudah aktif meningkatkan tingkat adopsi pengguna (*user adoption rate*) secara signifikan.

---

### 4. Integrasi Hardware & Fitur Native Perangkat
* **Native QR / Barcode Scanner**: TMA memanfaatkan scanner native Telegram (`window.Telegram.WebApp.showScanQrPopup`) yang bekerja pada level sistem operasi. Ini jauh lebih cepat, stabil, dan minim lag dibandingkan scanner berbasis kamera WebRTC pada browser biasa.
* **Haptic Feedback**: Menyediakan umpan balik getaran taktil (*Haptic Feedback*) pada saat scan berhasil, tombol ditekan, atau validasi gagal, memberikan pengalaman layaknya aplikasi native iOS/Android.
* **Komponen Native UI**: Fitur bawaan seperti *MainButton*, *BackButton*, *ClosingConfirmation*, dan adaptasi tema warna (Dark/Light mode) selaras dengan antarmuka Telegram.

---

### 5. Efisiensi Biaya, Distribusi, & Pemeliharaan (*TCO & Agility*)
* **Bypass App Store Tax & Review Delay**: Tidak ada biaya lisensi tahunan pengembang Apple/Google, tidak ada penundaan rilis akibat review aplikasi berhari-hari.
* **Pembaruan Instan (*Instant Rollout*)**: Setiap update sistem frontend (Vite/React) yang di-deploy ke server/CDN langsung dinikmati oleh 100% pengguna tanpa perlu menunggu pengguna memperbarui aplikasi di toko aplikasi.
* **Konsumsi Resource Sangat Ringan**: Menggunakan webview bawaan yang teroptimasi, tidak memenuhi memori RAM ponsel pengguna dengan tab browser terbuka yang menumpuk.

---

### 6. Konvergensi Komunikasi & Transaksi dalam Satu Wadah
* **Konteks Lapangan Terpadu**: Proses mutasi aset fisik selalu membutuhkan klarifikasi (misal: konfirmasi kondisi barang, pengiriman foto bukti fisik, koordinasi jam serah terima).
* Dengan TMA, ruang chat tim/grup koordinasi dan aplikasi pencatatan sistem berada dalam satu aplikasi. Pengguna tidak perlu melakukan pergantian konteks (*context switching*) bolak-balik antara browser dan aplikasi chat.

---

## 📊 3. Matriks Perbandingan: Telegram Mini App vs Standalone Web

| Parameter Evaluasi | Telegram Mini App (TMA) | Standalone Web (Browser) |
| :--- | :--- | :--- |
| **Alur Autentikasi** | **Otomatis & Terverifikasi** (via Telegram ID & HMAC) | Manual (Email, Password, OTP, SSO) |
| **Pencegahan Berbagi Akun** | **Tinggi** (Terikat nomor/device Telegram) | Rendah (Kredensial mudah dipinjamkan) |
| **Keandalan Push Alert** | **100% Terkirim** langsung ke inbox Telegram | Rendah (Izin web push sering ditolak/dibatasi OS) |
| **Kecepatan Scanner QR** | **Sangat Cepat** (Native OS Hardware Scanner) | Tergantung browser/kamera WebRTC |
| **User Adoption Lapangan** | **Sangat Tinggi** (Aplikasi sudah terpasang & aktif) | Sedang / Rendah (Sering lupa URL/password) |
| **Pemberitahuan Overdue** | **Interaktif** (Bot mengirim alert & tombol aksi) | Terbatas pada email atau notifikasi web pasif |
| **Biaya & Waktu Rilis** | **Rendah & Instan** (Sekali deploy langsung aktif) | Rendah (Web) hingga Tinggi (jika ke Native App) |

---

## 💡 4. Kesimpulan & Rekomendasi

Tetap menggunakan arsitektur **Telegram Mini App (TMA)** adalah keputusan yang paling rasional, efisien, dan selaras dengan proses bisnis **E1-TMA**. TMA menghadirkan kombinasi terbaik: **kemudahan pengembangan berbasis Web (React/Vite)** dengan **keandalan notifikasi, hardware scanner, dan kecepatan akses setara Mobile App Native**.