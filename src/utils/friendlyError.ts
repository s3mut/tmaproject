export function getFriendlyErrorMessage(error: any): string {
  const raw = error?.message || String(error) || '';
  const lower = raw.toLowerCase();

  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'Data ini sudah terdaftar sebelumnya (kemungkinan Serial Number atau kode sudah dipakai). Periksa kembali input Anda.';
  }
  if (lower.includes('foreign key constraint')) {
    return 'Data terkait (kategori/lokasi/aset) tidak ditemukan atau sudah dihapus. Muat ulang halaman dan coba lagi.';
  }
  if (lower.includes('row-level security') || lower.includes('rls')) {
    return 'Anda tidak memiliki izin untuk melakukan aksi ini di wilayah/data tersebut.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('abort')) {
    return 'Koneksi tidak stabil. Periksa internet Anda dan coba lagi.';
  }
  if (lower.includes('payload too large') || lower.includes('too large')) {
    return 'Data yang dikirim terlalu besar. Coba kurangi jumlah item sekaligus.';
  }
  if (lower.includes('timeout')) {
    return 'Permintaan memakan waktu terlalu lama. Coba lagi dalam beberapa saat.';
  }

  // Fallback: tampilkan pesan asli tapi dengan prefix yang jelas
  return `Terjadi kesalahan: ${raw || 'tidak diketahui'}. Jika berulang, hubungi admin.`;
}
