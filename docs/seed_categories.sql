-- ==========================================
-- SCRIPT UPDATE KATEGORI ASET (REPLACE ALL)
-- ==========================================
-- PERHATIAN: Perintah TRUNCATE CASCADE di bawah ini akan menghapus SELURUH isi 
-- tabel master_categories. Jika ada data di tabel master_assets yang sudah 
-- menggunakan kategori ini, data aset tersebut juga berpotensi ikut terhapus atau error!

TRUNCATE TABLE master_categories CASCADE;

-- Mengisi ulang dengan data kategori yang baru
INSERT INTO master_categories (name, icon, color_text, color_bg) VALUES 
('ACCESS POINT', 'fa-wifi', 'text-blue-400', 'bg-blue-500/20'),
('Customer Display', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20'),
('HUB', 'fa-network-wired', 'text-indigo-400', 'bg-indigo-500/20'),
('MONITOR', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20'),
('MONITOR KASIR WINCOR', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20'),
('PC WINDOWS', 'fa-computer', 'text-blue-400', 'bg-blue-500/20'),
('PC All in one', 'fa-computer', 'text-blue-400', 'bg-blue-500/20'),
('PDT DATALOGIC', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20'),
('PRINTER DOT MATRIX', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('PRINTER KASIR WINCOR', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('PRINTER LASERJET', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('POS KASIR WINCOR', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20'),
('SCALE DIGI', 'fa-balance-scale', 'text-yellow-400', 'bg-yellow-500/20'),
('SCANNER', 'fa-qrcode', 'text-orange-400', 'bg-orange-500/20'),
('SERVER', 'fa-server', 'text-slate-300', 'bg-slate-600/20'),
('UPS VEKTOR', 'fa-battery-full', 'text-red-400', 'bg-red-500/20'),
('PDT SYMBOL', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20'),
('SCALE METLER', 'fa-balance-scale', 'text-yellow-400', 'bg-yellow-500/20'),
('MONITOR SERVER', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20'),
('UPS SOCOMEC', 'fa-battery-full', 'text-red-400', 'bg-red-500/20'),
('UPS ICA', 'fa-battery-full', 'text-red-400', 'bg-red-500/20'),
('PRINTER BARCODE', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('PDT ZEBRA', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20'),
('UPS EMERSON', 'fa-battery-full', 'text-red-400', 'bg-red-500/20'),
('UPS GAMMA', 'fa-battery-full', 'text-red-400', 'bg-red-500/20'),
('PC', 'fa-computer', 'text-blue-400', 'bg-blue-500/20'),
('POS KASIR AIO WINTEC', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20'),
('PRINTER KASIR WINTEC', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('PRINTER KASIR STAR', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('POS KASIR AIO DIEBOLD', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20'),
('PDT UROVO', 'fa-barcode', 'text-orange-400', 'bg-orange-500/20'),
('UPS ARUBA', 'fa-battery-full', 'text-red-400', 'bg-red-500/20'),
('Printer', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('POS SCO DIEBOLD', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20'),
('POS SCO WINTEC', 'fa-cash-register', 'text-purple-400', 'bg-purple-500/20'),
('PRINTER KASIR SCO WINTEC', 'fa-print', 'text-emerald-400', 'bg-emerald-500/20'),
('SCALE', 'fa-balance-scale', 'text-yellow-400', 'bg-yellow-500/20');
