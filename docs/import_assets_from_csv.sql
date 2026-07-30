-- ==========================================
-- SCRIPT IMPORT CSV (DENGAN STRICT VALIDATION & VERIFIKASI ADMIN)
-- ==========================================
-- Alur Kerja Aman:
-- 1. Upload CSV ke tabel sementara (staging_assets)
-- 2. Cek mana data yang COCOK & MANA YANG TIDAK COCOK (Typo / Kategori Baru)
-- 3. Admin melakukan Penyesuaian / Verifikasi
-- 4. Hanya data yang VALID yang dipindahkan ke master_assets
-- ==========================================

-- ==========================================
-- STEP 1: Buat Staging Table
-- ==========================================
DROP TABLE IF EXISTS staging_assets;

CREATE TABLE staging_assets (
    serial_number   VARCHAR(100),
    aktiva          VARCHAR(50),
    category        VARCHAR(100),    -- Kolom teks dari CSV
    brand           VARCHAR(50),
    model_type      VARCHAR(100),
    computer_name   VARCHAR(100),
    site_alias      VARCHAR(4),
    status          VARCHAR(20)  DEFAULT 'Active',
    external_id     VARCHAR(50),
    description     TEXT
);

-- ==========================================
-- STEP 2: Import CSV via Supabase Table Editor UI
-- ==========================================
-- 1. Buka Supabase Dashboard -> Table Editor -> staging_assets
-- 2. Import CSV Anda ke tabel staging_assets
-- 3. Lanjut ke STEP 3 di bawah.

-- ==========================================
-- STEP 3: LAPORAN VERIFIKASI SEBELUM IMPORT
-- ==========================================

-- 3a. Cek Kategori di CSV yang TIDAK TERDAFTAR di master_categories (Kategori Bermasalah / Typo)
SELECT 
    s.category               AS category_di_csv,
    COUNT(s.serial_number)   AS jumlah_aset,
    '❌ MEMBUTUHKAN VERIFIKASI ADMIN' AS status
FROM staging_assets s
LEFT JOIN master_categories mc 
    ON UPPER(TRIM(s.category)) = UPPER(TRIM(mc.name))
WHERE mc.id IS NULL
GROUP BY s.category
ORDER BY s.category;

-- 3b. Tampilkan daftar unit aset spesifik yang gagal verifikasi kategori
SELECT 
    s.serial_number,
    s.aktiva,
    s.category AS category_typo_atau_baru,
    s.brand,
    s.site_alias
FROM staging_assets s
LEFT JOIN master_categories mc 
    ON UPPER(TRIM(s.category)) = UPPER(TRIM(mc.name))
WHERE mc.id IS NULL;


-- ==========================================
-- STEP 3b: OPSI PENANGANAN OLEH ADMIN
-- ==========================================

-- OPSI 1: Jika typo di CSV, Admin sesuaikan nama kategori di staging table:
-- Contoh:
-- UPDATE staging_assets SET category = 'PRINTER DOT MATRIX' WHERE category = 'Printer Dotmatrix';
-- UPDATE staging_assets SET category = 'PC WINDOWS' WHERE category = 'PC-Win';

-- OPSI 2: Jika kategori tersebut benar-benar BARU & VALID, Admin daftarkan ke master_categories terlebih dahulu:
-- Contoh:
-- INSERT INTO master_categories (name, icon, color_text, color_bg) 
-- VALUES ('NAMA KATEGORI BARU', 'fa-box', 'text-slate-400', 'bg-slate-500/20');


-- ==========================================
-- STEP 4: EKSEKUSI MIGRASI (HANYA DATA VALID YANG MASUK)
-- ==========================================

INSERT INTO master_assets (
    serial_number,
    aktiva,
    category,        -- Teks kategori (Trigger akan verifikasi & isi category_id)
    brand,
    model_type,
    computer_name,
    site_alias,
    status,
    external_id,
    description
)
SELECT 
    TRIM(s.serial_number)                               AS serial_number,
    NULLIF(TRIM(s.aktiva), '')                          AS aktiva,
    TRIM(s.category)                                    AS category,
    NULLIF(TRIM(s.brand), '')                           AS brand,
    NULLIF(TRIM(s.model_type), '')                      AS model_type,
    NULLIF(TRIM(s.computer_name), '')                   AS computer_name,
    NULLIF(TRIM(s.site_alias), '')                      AS site_alias,
    COALESCE(
        NULLIF(TRIM(s.status), '')::asset_status, 
        'Active'
    )                                                   AS status,
    NULLIF(TRIM(s.external_id), '')                     AS external_id,
    NULLIF(TRIM(s.description), '')                     AS description
FROM staging_assets s
INNER JOIN master_categories mc 
    ON UPPER(TRIM(s.category)) = UPPER(TRIM(mc.name)) -- INNER JOIN memastikan hanya kategori yang valid di-insert!
WHERE s.serial_number IS NOT NULL AND TRIM(s.serial_number) != ''
ON CONFLICT (serial_number) DO NOTHING;

-- ==========================================
-- STEP 5: LAPORAN AKHIR & CLEANUP
-- ==========================================

SELECT 
    'Total Data di CSV'                           AS keterangan, COUNT(*) AS jumlah FROM staging_assets
UNION ALL
SELECT 
    'Berhasil Upload ke master_assets'           AS keterangan, COUNT(*) AS jumlah FROM master_assets
UNION ALL
SELECT 
    'Gagal Upload (Perlu Verifikasi Admin/Typo)'  AS keterangan, COUNT(*) AS jumlah 
FROM staging_assets s
LEFT JOIN master_categories mc ON UPPER(TRIM(s.category)) = UPPER(TRIM(mc.name))
WHERE mc.id IS NULL;

-- Hapus staging setelah selesai
-- DROP TABLE IF EXISTS staging_assets;
