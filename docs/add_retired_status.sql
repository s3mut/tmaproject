-- ============================================================
-- Migration: Tambah nilai 'Retired' ke ENUM asset_status
-- TransitTMA — 2026-07-31
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- PostgreSQL tidak mendukung DROP nilai ENUM, tapi bisa tambah nilai baru.
-- Tambah 'Retired' ke setelah 'In Transit'
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'Retired' AFTER 'In Transit';
