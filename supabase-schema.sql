-- ==============================================================================
-- SKEMA LENGKAP SUPABASE - MANAJEMEN HARGA AKRILIK (BAHASA INDONESIA)
-- ==============================================================================

-- 1. MENGHAPUS TABEL LAMA JIKA ADA
-- (Buka komentar '#' di bawah jika Anda ingin me-reset ulang semua data sebelumnya)
-- DROP TABLE IF EXISTS harga_akrilik;
-- DROP TABLE IF EXISTS pemasok;
-- DROP TABLE IF EXISTS tipe_akrilik;

-- ==============================================================================
-- 2. PEMBUATAN STRUKTUR TABEL 
-- ==============================================================================

-- Tabel Tipe Akrilik (Bening, Susu, Warna, dll)
CREATE TABLE IF NOT EXISTS tipe_akrilik (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Pemasok / Supplier
CREATE TABLE IF NOT EXISTS pemasok (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Utama: Relasi Harga Akrilik berdasarkan Ketebalan, Tipe, & Pemasok
CREATE TABLE IF NOT EXISTS harga_akrilik (
  tebal TEXT NOT NULL,
  tipe_id UUID NOT NULL REFERENCES tipe_akrilik(id) ON DELETE CASCADE,
  pemasok TEXT NOT NULL,
  harga INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- PRIMARY KEY ini Wajib ada agar aplikasi dapat mengenali kapan harus Replace/Update data (Upsert)
  -- ketika pengguna mengubah harga dari tebal dan pemasok yang sama di layar UI.
  PRIMARY KEY (tebal, tipe_id, pemasok)
);

-- ==============================================================================
-- 3. PERIZINAN AKSES (ROW LEVEL SECURITY POLICIES)
-- ==============================================================================
-- Mengaktifkan RLS untuk menghindari Error "new row violates row-level security policy"
ALTER TABLE tipe_akrilik ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemasok ENABLE ROW LEVEL SECURITY;
ALTER TABLE harga_akrilik ENABLE ROW LEVEL SECURITY;

-- Karena aplikasi belum mengadopsi fitur Login Pengguna (Anonymous API),
-- kita membuka pintu akses kontrol sepenuhnya (Semua pengguna bisa Tambah, Ubah, Hapus).
CREATE POLICY "Akses publik penuh tipe akrilik" ON tipe_akrilik FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penuh pemasok" ON pemasok FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penuh harga akrilik" ON harga_akrilik FOR ALL USING (true) WITH CHECK (true);
