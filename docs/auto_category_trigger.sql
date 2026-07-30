-- ==========================================
-- FITUR STRICT VALIDATION & AUTO-LINK KATEGORI
-- ==========================================
-- KEBIJAKAN KEAMANAN DATA:
-- 1. Menambahkan kolom `category` (TEXT) pada `master_assets`.
-- 2. Jika nama kategori SUDAH ADA di `master_categories` -> Otomatis terhubung `category_id`.
-- 3. Jika nama kategori BELUM ADA di `master_categories` -> INSERT GAGAL (RAISE EXCEPTION)
--    Menolak data typo/tidak dikenal untuk menjaga kebersihan data master!
-- ==========================================

-- Step 1: Tambahkan kolom `category` pada master_assets jika belum ada
ALTER TABLE master_assets ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Step 2: Sinkronkan isi teks category dari master_categories yang sudah ada
UPDATE master_assets a
SET category = c.name
FROM master_categories c
WHERE a.category_id = c.id AND (a.category IS NULL OR a.category = '');

-- Step 3: Membuat Fungsi Trigger Validation Strict
CREATE OR REPLACE FUNCTION handle_asset_category_strict_sync()
RETURNS TRIGGER AS $$
DECLARE
    target_category_id INT;
    target_category_name VARCHAR(50);
BEGIN
    -- Kasus A: Input berbasis teks nama kategori (misal dari CSV / API)
    IF NEW.category IS NOT NULL AND TRIM(NEW.category) != '' THEN
        -- 1. Cek keberadaan di master_categories (case-insensitive & trim space)
        SELECT id, name INTO target_category_id, target_category_name
        FROM master_categories
        WHERE UPPER(TRIM(name)) = UPPER(TRIM(NEW.category))
        LIMIT 1;

        -- 2. Jika SUDAH ADA -> hubungkan category_id & seragamkan nama
        IF FOUND THEN
            NEW.category_id := target_category_id;
            NEW.category := target_category_name;
        
        -- 3. Jika BELUM ADA -> TOLAK DATA (RAISE EXCEPTION)
        ELSE
            RAISE EXCEPTION 'Kategori "%" tidak terdaftar di master_categories! Minta Admin daftarkan kategori atau perbaiki typo terlebih dahulu.', NEW.category;
        END IF;

    -- Kasus B: Input berbasis category_id (misal dari UI Form Dropdown)
    ELSIF NEW.category_id IS NOT NULL THEN
        SELECT name INTO target_category_name
        FROM master_categories
        WHERE id = NEW.category_id;

        IF FOUND THEN
            NEW.category := target_category_name;
        ELSE
            RAISE EXCEPTION 'Kategori dengan ID % tidak ditemukan di master_categories!', NEW.category_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Kategori aset wajib diisi!';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Pasang Trigger ke tabel master_assets
DROP TRIGGER IF EXISTS trigger_sync_asset_category ON master_assets;

CREATE TRIGGER trigger_sync_asset_category
BEFORE INSERT OR UPDATE ON master_assets
FOR EACH ROW
EXECUTE FUNCTION handle_asset_category_strict_sync();
