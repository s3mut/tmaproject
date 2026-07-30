-- ==========================================
-- SCRIPT MIGRASI (UPDATE) TANPA MENGHAPUS DATA
-- ==========================================
-- Jalankan kode ini di SQL Editor Supabase JIKA Anda tidak ingin menghapus data yang sudah ada.

-- 1. Tambah nilai baru ke ENUM asset_status (Supabase mungkin membutuhkan eksekusi terpisah jika gagal)
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'Disposed';
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'In Transit';

-- 2. Buat ENUM baru
CREATE TYPE mutation_status AS ENUM ('Pending', 'Completed', 'Rejected');
CREATE TYPE opname_status AS ENUM ('Ditemukan', 'Hilang', 'Nyasar');

-- 3. Hapus VIEW lama terlebih dahulu (karena menghalangi perubahan kolom)
DROP VIEW IF EXISTS view_assets_detail;

-- 4. Ubah batas panjang site_alias dari 10 menjadi 4
ALTER TABLE sites ALTER COLUMN site_alias TYPE VARCHAR(4);
ALTER TABLE master_assets ALTER COLUMN site_alias TYPE VARCHAR(4);

-- 4. Buat tabel master_categories
CREATE TABLE master_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'fa-box',
    color_text VARCHAR(50) DEFAULT 'text-slate-400',
    color_bg VARCHAR(50) DEFAULT 'bg-slate-500/20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- (Opsional) Isi data awal kategori agar assets yang ada tidak error
INSERT INTO master_categories (name, icon, color_text, color_bg) VALUES 
('Laptop', 'fa-laptop', 'text-purple-400', 'bg-purple-500/20'),
('PC', 'fa-desktop', 'text-blue-400', 'bg-blue-500/20'),
('Monitor', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/20'),
('Network', 'fa-wifi', 'text-emerald-400', 'bg-emerald-500/20'),
('Server', 'fa-server', 'text-indigo-400', 'bg-indigo-500/20'),
('Printer', 'fa-print', 'text-orange-400', 'bg-orange-500/20');

-- 5. Update master_assets
-- Tambah kolom deleted_at
ALTER TABLE master_assets ADD COLUMN deleted_at TIMESTAMP NULL;
-- Tambah kolom category_id (sementara izinkan NULL)
ALTER TABLE master_assets ADD COLUMN category_id INTEGER;

-- Hubungkan category_id dengan nama kategori lama (jika ada data)
UPDATE master_assets SET category_id = (SELECT id FROM master_categories WHERE name = master_assets.category LIMIT 1);
-- Jika ada yang tidak cocok, set ke kategori default (misal ID 1)
UPDATE master_assets SET category_id = 1 WHERE category_id IS NULL;

-- Jadikan category_id NOT NULL dan tambahkan Foreign Key
ALTER TABLE master_assets ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE master_assets DROP COLUMN category; -- Hapus kolom category lama yang berupa teks

ALTER TABLE master_assets 
    ADD CONSTRAINT fk_asset_category 
    FOREIGN KEY (category_id) REFERENCES master_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 6. Update asset_mutations (Tambah kolom handover)
ALTER TABLE asset_mutations ADD COLUMN status mutation_status DEFAULT 'Completed';
ALTER TABLE asset_mutations ADD COLUMN received_by BIGINT;
ALTER TABLE asset_mutations ADD COLUMN received_at TIMESTAMP;

ALTER TABLE asset_mutations 
    ADD CONSTRAINT fk_mutation_receiver 
    FOREIGN KEY (received_by) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 7. Buat tabel Stock Opname
CREATE TABLE stock_opname (
    id BIGSERIAL PRIMARY KEY,
    site_alias VARCHAR(4) NOT NULL,
    conducted_by BIGINT NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_opname_site FOREIGN KEY (site_alias) REFERENCES sites(site_alias) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_opname_user FOREIGN KEY (conducted_by) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE stock_opname_details (
    id BIGSERIAL PRIMARY KEY,
    opname_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    status opname_status NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_opname_detail_parent FOREIGN KEY (opname_id) REFERENCES stock_opname(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_opname_detail_asset FOREIGN KEY (asset_id) REFERENCES master_assets(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 8. Perbarui VIEW (Di-CREATE ulang setelah struktur tabel siap)
CREATE VIEW view_assets_detail AS
SELECT 
    a.id,
    a.serial_number,
    a.aktiva,
    a.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color_text AS category_color_text,
    c.color_bg AS category_color_bg,
    a.brand,
    a.model_type,
    a.computer_name,
    a.site_alias,
    a.status,
    a.external_id,
    a.description,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    CONCAT(s.site_code, '-', s.site_alias, '-', s.region) AS full_location_code,
    s.site_name,
    s.site_address
FROM 
    master_assets a
LEFT JOIN 
    sites s ON a.site_alias = s.site_alias
LEFT JOIN
    master_categories c ON a.category_id = c.id
WHERE 
    a.deleted_at IS NULL;

-- 9. Setup RLS (Jalankan ini jika Anda ingin mengaktifkan keamanan RLS penuh)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on sites" ON sites FOR SELECT USING (true);
CREATE POLICY "Allow public read access on categories" ON master_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on users" ON telegram_users FOR SELECT USING (true);
CREATE POLICY "Allow read assets" ON master_assets FOR SELECT USING (true);
CREATE POLICY "Allow insert assets" ON master_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update assets" ON master_assets FOR UPDATE USING (true);
CREATE POLICY "Allow read mutations" ON asset_mutations FOR SELECT USING (true);
CREATE POLICY "Allow insert mutations" ON asset_mutations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update mutations" ON asset_mutations FOR UPDATE USING (true);
CREATE POLICY "Allow read opname" ON stock_opname FOR SELECT USING (true);
CREATE POLICY "Allow insert opname" ON stock_opname FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update opname" ON stock_opname FOR UPDATE USING (true);
CREATE POLICY "Allow read opname details" ON stock_opname_details FOR SELECT USING (true);
CREATE POLICY "Allow insert opname details" ON stock_opname_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update opname details" ON stock_opname_details FOR UPDATE USING (true);
