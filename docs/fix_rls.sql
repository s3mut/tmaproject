-- Mengaktifkan ulang RLS dan memaksa policy SELECT (untuk mencegah error array kosong)

ALTER TABLE master_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_assets ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (agar tidak error)
DROP POLICY IF EXISTS "Allow public read access on categories" ON master_categories;
DROP POLICY IF EXISTS "Allow public read access on sites" ON sites;
DROP POLICY IF EXISTS "Allow read assets" ON master_assets;
DROP POLICY IF EXISTS "Allow public read access" ON sites;

-- Buat ulang policy
CREATE POLICY "Allow public read access on categories" ON master_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on sites" ON sites FOR SELECT USING (true);
CREATE POLICY "Allow read assets" ON master_assets FOR SELECT USING (true);
