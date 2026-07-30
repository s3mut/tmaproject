-- ==========================================
-- TransitTMA - Database Schema (Enterprise Upgrade)
-- PostgreSQL Schema Definition
-- UPDATED: 2026-07-29
-- ==========================================

-- ==========================================
-- 0. Membuat Tipe Data ENUM
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
CREATE TYPE asset_status AS ENUM ('Active', 'Backup', 'Broken', 'Repair', 'Disposed', 'In Transit');
CREATE TYPE mutation_status AS ENUM ('Pending', 'Completed', 'Rejected');
CREATE TYPE opname_status AS ENUM ('Ditemukan', 'Hilang', 'Nyasar');

-- ==========================================
-- 1. Membuat Tabel Pendukung (Sites & Categories)
-- ==========================================
CREATE TABLE sites (
    site_code VARCHAR(4) PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL,
    site_alias VARCHAR(4) UNIQUE,
    region VARCHAR(50),
    site_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'fa-box',
    color_text VARCHAR(50) DEFAULT 'text-slate-400',
    color_bg VARCHAR(50) DEFAULT 'bg-slate-500/20',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. Membuat Tabel Telegram Users
-- ==========================================
CREATE TABLE telegram_users (
    telegram_id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'guest',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. Membuat Tabel Master Assets
-- ==========================================
CREATE TABLE master_assets (
    id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    aktiva VARCHAR(50),
    category_id INTEGER NOT NULL,
    brand VARCHAR(50),
    model_type VARCHAR(100),
    computer_name VARCHAR(100),
    site_alias VARCHAR(4),
    status asset_status DEFAULT 'Active',
    external_id VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_asset_site 
        FOREIGN KEY (site_alias) 
        REFERENCES sites(site_alias) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT,

    CONSTRAINT fk_asset_category
        FOREIGN KEY (category_id)
        REFERENCES master_categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Trigger auto-update timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_master_assets_modtime
BEFORE UPDATE ON master_assets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- ==========================================
-- 4. Membuat Tabel Mutasi (Log & Handover)
-- ==========================================
CREATE TABLE asset_mutations (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    from_site_code VARCHAR(4),
    to_site_code VARCHAR(4) NOT NULL,
    moved_by BIGINT NOT NULL,
    notes TEXT,
    status mutation_status DEFAULT 'Pending',
    received_by BIGINT,
    received_at TIMESTAMP,
    mutation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mutation_asset FOREIGN KEY (asset_id) REFERENCES master_assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_mutation_from_site FOREIGN KEY (from_site_code) REFERENCES sites(site_code) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_mutation_to_site FOREIGN KEY (to_site_code) REFERENCES sites(site_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mutation_user FOREIGN KEY (moved_by) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mutation_receiver FOREIGN KEY (received_by) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ==========================================
-- 5. Membuat Tabel Stock Opname (Audit)
-- ==========================================
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

-- ==========================================
-- 6. Membuat VIEW untuk Kemudahan Query
-- ==========================================
DROP VIEW IF EXISTS view_assets_detail;
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

-- ==========================================
-- 7. Row Level Security (RLS)
-- ==========================================
-- Asumsi otentikasi via JWT claims atau setting postgres `request.jwt.claims`
-- (Ini adalah contoh RLS dasar, implementasi riil tergantung cara otentikasi Supabase Anda)

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_details ENABLE ROW LEVEL SECURITY;

-- Izinkan public/semua users membaca data referensi
CREATE POLICY "Allow public read access on sites" ON sites FOR SELECT USING (true);
CREATE POLICY "Allow public read access on categories" ON master_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on users" ON telegram_users FOR SELECT USING (true);

-- Assets: Semua bisa melihat yang aktif, tapi hanya admin yang bisa menghapus (update deleted_at)
-- Karena aplikasi belum mengimplementasikan auth Supabase secara native (auth via Telegram WebApp),
-- RLS penuh membutuhkan Custom JWT. Untuk saat ini, kita mengizinkan akses ke tabel utama 
-- tetapi Anda dapat memperketatnya nanti berdasarkan custom claims.
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
