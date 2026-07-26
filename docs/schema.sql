-- ==========================================
-- TransitTMA - Database Schema
-- PostgreSQL Schema Definition
-- ==========================================

-- ==========================================
-- 0. Membuat Tipe Data ENUM
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
CREATE TYPE asset_status AS ENUM ('Active', 'Backup', 'Broken', 'Repair');

-- ==========================================
-- 1. Membuat Tabel Sites
-- ==========================================
CREATE TABLE sites (
    site_code VARCHAR(4) PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL,
    site_alias VARCHAR(10),
    region VARCHAR(50),
    site_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. Membuat Tabel Telegram Users
-- ==========================================
CREATE TABLE telegram_users (
    telegram_id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'guest', -- Menggunakan tipe data ENUM yang dibuat di atas
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. Membuat Tabel Master Assets
-- ==========================================
CREATE TABLE master_assets (
    id BIGSERIAL PRIMARY KEY, -- Menggunakan BIGSERIAL pengganti AUTO_INCREMENT
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    bta_number VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(50),
    model_type VARCHAR(100),
    computer_name VARCHAR(100),
    site_code VARCHAR(4),
    status asset_status DEFAULT 'Active', -- Menggunakan tipe data ENUM yang dibuat di atas
    external_id VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_asset_site 
        FOREIGN KEY (site_code) 
        REFERENCES sites(site_code) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

-- 3.1. Function dan Trigger untuk auto-update kolom 'updated_at'
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
-- 4. Membuat Tabel Mutasi (Log)
-- ==========================================
CREATE TABLE asset_mutations (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    from_site_code VARCHAR(4),
    to_site_code VARCHAR(4) NOT NULL,
    moved_by BIGINT NOT NULL,
    notes TEXT,
    mutation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mutation_asset 
        FOREIGN KEY (asset_id) 
        REFERENCES master_assets(id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_mutation_from_site 
        FOREIGN KEY (from_site_code) 
        REFERENCES sites(site_code) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL,
        
    CONSTRAINT fk_mutation_to_site 
        FOREIGN KEY (to_site_code) 
        REFERENCES sites(site_code) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT,
        
    CONSTRAINT fk_mutation_user 
        FOREIGN KEY (moved_by) 
        REFERENCES telegram_users(telegram_id) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

-- ==========================================
-- 5. Membuat VIEW untuk Kemudahan Query
-- ==========================================
CREATE VIEW view_assets_detail AS
SELECT 
    a.id,
    a.serial_number,
    a.bta_number,
    a.category,
    a.brand,
    a.model_type,
    a.computer_name,
    a.status,
    a.description,
    CONCAT(s.site_code, '-', s.site_alias, '-', s.region) AS full_location_code,
    s.site_name,
    s.site_address
FROM 
    master_assets a
LEFT JOIN 
    sites s ON a.site_code = s.site_code;
