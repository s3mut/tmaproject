-- ==========================================
-- SCRIPT UPDATE KATEGORI ASET DENGAN ID EKSPLISIT (ID 44 - 80)
-- ==========================================
-- Perhatian: TRUNCATE TABLE akan mengosongkan master_categories.
-- Jalankan di SQL Editor Supabase untuk menyesuaikan ID kategori dengan data terbaru Anda.

TRUNCATE TABLE master_categories CASCADE;

-- Mengisi ulang data master_categories dengan ID eksplisit
INSERT INTO master_categories (id, name, icon, color_text, color_bg, created_at) VALUES 
(44, 'ACCESS POINT', 'fa-wifi', 'text-blue-400', 'bg-blue-500/20', '2026-07-28 17:32:33.315938'),
(45, 'Customer Display', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20', '2026-07-28 17:32:33.315938'),
(46, 'HUB', 'fa-network-wired', 'text-indigo-400', 'bg-indigo-500/20', '2026-07-28 17:32:33.315938'),
(47, 'MONITOR', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20', '2026-07-28 17:32:33.315938'),
(48, 'MONITOR KASIR WINCOR', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20', '2026-07-28 17:32:33.315938'),
(49, 'PC WINDOWS', 'fa-computer', 'text-blue-400', 'bg-blue-500/20', '2026-07-28 17:32:33.315938'),
(50, 'PC All in one', 'fa-computer', 'text-blue-400', 'bg-blue-500/20', '2026-07-28 17:32:33.315938'),
(51, 'PDT DATALOGIC', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20', '2026-07-28 17:32:33.315938'),
(52, 'PRINTER DOT MATRIX', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(53, 'PRINTER KASIR WINCOR', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(54, 'PRINTER LASERJET', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(55, 'POS KASIR WINCOR', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20', '2026-07-28 17:32:33.315938'),
(56, 'SCALE DIGI', 'fa-balance-scale', 'text-yellow-400', 'bg-yellow-500/20', '2026-07-28 17:32:33.315938'),
(57, 'SCANNER', 'fa-qrcode', 'text-orange-400', 'bg-orange-500/20', '2026-07-28 17:32:33.315938'),
(58, 'SERVER', 'fa-server', 'text-slate-300', 'bg-slate-600/20', '2026-07-28 17:32:33.315938'),
(59, 'UPS VEKTOR', 'fa-battery-full', 'text-red-400', 'bg-red-500/20', '2026-07-28 17:32:33.315938'),
(60, 'PDT SYMBOL', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20', '2026-07-28 17:32:33.315938'),
(61, 'SCALE METLER', 'fa-balance-scale', 'text-yellow-400', 'bg-yellow-500/20', '2026-07-28 17:32:33.315938'),
(62, 'MONITOR SERVER', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20', '2026-07-28 17:32:33.315938'),
(63, 'UPS SOCOMEC', 'fa-battery-full', 'text-red-400', 'bg-red-500/20', '2026-07-28 17:32:33.315938'),
(64, 'UPS ICA', 'fa-battery-full', 'text-red-400', 'bg-red-500/20', '2026-07-28 17:32:33.315938'),
(65, 'PRINTER BARCODE', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(66, 'PDT ZEBRA', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20', '2026-07-28 17:32:33.315938'),
(67, 'UPS EMERSON', 'fa-battery-full', 'text-red-400', 'bg-red-500/20', '2026-07-28 17:32:33.315938'),
(68, 'UPS GAMMA', 'fa-battery-full', 'text-red-400', 'bg-red-500/20', '2026-07-28 17:32:33.315938'),
(69, 'PC', 'fa-computer', 'text-blue-400', 'bg-blue-500/20', '2026-07-28 17:32:33.315938'),
(70, 'POS KASIR AIO WINTEC', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20', '2026-07-28 17:32:33.315938'),
(71, 'PRINTER KASIR WINTEC', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(72, 'PRINTER KASIR STAR', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(73, 'POS KASIR AIO DIEBOLD', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20', '2026-07-28 17:32:33.315938'),
(74, 'PDT UROVO', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20', '2026-07-28 17:32:33.315938'),
(75, 'UPS ARUBA', 'fa-battery-full', 'text-red-400', 'bg-red-500/20', '2026-07-28 17:32:33.315938'),
(76, 'Printer', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(77, 'POS SCO DIEBOLD', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20', '2026-07-28 17:32:33.315938'),
(78, 'POS SCO WINTEC', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20', '2026-07-28 17:32:33.315938'),
(79, 'PRINTER KASIR SCO WINTEC', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20', '2026-07-28 17:32:33.315938'),
(80, 'SCALE', 'fa-balance-scale', 'text-yellow-400', 'bg-yellow-500/20', '2026-07-28 17:32:33.315938');

-- Sync auto-increment sequence ke nilai tertinggi (80) agar saat tambah kategori baru dari UI ID-nya tidak menabrak ID yang ada
SELECT setval('master_categories_id_seq', (SELECT MAX(id) FROM master_categories));
