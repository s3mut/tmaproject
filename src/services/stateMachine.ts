/**
 * stateMachine.ts — State Machine kaku untuk TransactionStatus
 *
 * Menerapkan aturan transisi status yang valid sesuai standar ERP.
 * Tidak ada transisi yang "melompat" atau mundur (kecuali Cancelled).
 *
 * Prinsip:
 * - Setiap status memiliki daftar status yang boleh menjadi berikutnya.
 * - Status terminal (Completed, Rejected, Cancelled) tidak boleh berubah.
 * - Semua validasi transisi harus melalui fungsi ini sebelum memanggil API.
 */

import type { TransactionStatus } from '../types/inventory';

// ── Valid Transition Map ──────────────────────────────────────────────────────
// Key: Status saat ini → Value: Status yang diizinkan sebagai berikutnya
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  Requested:    ['Approved', 'Rejected', 'Cancelled'],
  Approved:     ['In Transit', 'Cancelled'],
  'In Transit': ['In Progress', 'Cancelled'],
  'In Progress':['Returning', 'Completed'],   // 'Completed' untuk Repair / Mutation tanpa retur
  Returning:    ['Completed', 'Cancelled'],
  Completed:    [],   // Terminal — tidak dapat berubah
  Rejected:     [],   // Terminal
  Cancelled:    [],   // Terminal
};

// ── Terminal States ──────────────────────────────────────────────────────────
export const TERMINAL_STATUSES: TransactionStatus[] = ['Completed', 'Rejected', 'Cancelled'];

// ── Icon & Label per transisi (untuk tombol UI) ──────────────────────────────
export interface TransitionAction {
  targetStatus: TransactionStatus;
  label: string;
  icon: string;
  confirmMessage: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
}

const TRANSITION_ACTIONS: Record<string, TransitionAction> = {
  'Requested→Approved': {
    targetStatus: 'Approved',
    label: 'Setujui',
    icon: 'fa-check',
    confirmMessage: 'Setujui transaksi ini? Notifikasi akan dikirim ke pemohon.',
    variant: 'success',
  },
  'Requested→Rejected': {
    targetStatus: 'Rejected',
    label: 'Tolak',
    icon: 'fa-times',
    confirmMessage: 'Tolak transaksi ini? Tindakan ini tidak dapat dibatalkan.',
    variant: 'danger',
  },
  'Requested→Cancelled': {
    targetStatus: 'Cancelled',
    label: 'Batalkan',
    icon: 'fa-ban',
    confirmMessage: 'Batalkan transaksi ini?',
    variant: 'warning',
  },
  'Approved→In Transit': {
    targetStatus: 'In Transit',
    label: 'Kirim Barang',
    icon: 'fa-truck',
    confirmMessage: 'Konfirmasi barang sudah dikirimkan?',
    variant: 'info',
  },
  'Approved→Cancelled': {
    targetStatus: 'Cancelled',
    label: 'Batalkan',
    icon: 'fa-ban',
    confirmMessage: 'Batalkan transaksi yang sudah disetujui ini?',
    variant: 'warning',
  },
  'In Transit→In Progress': {
    targetStatus: 'In Progress',
    label: 'Terima Unit',
    icon: 'fa-box-open',
    confirmMessage: 'Konfirmasi unit sudah diterima di tujuan? Tanggal jatuh tempo akan dikunci saat ini.',
    variant: 'success',
  },
  'In Transit→Cancelled': {
    targetStatus: 'Cancelled',
    label: 'Batalkan Pengiriman',
    icon: 'fa-ban',
    confirmMessage: 'Batalkan pengiriman yang sedang berlangsung?',
    variant: 'danger',
  },
  'In Progress→Returning': {
    targetStatus: 'Returning',
    label: 'Kembalikan Unit',
    icon: 'fa-reply',
    confirmMessage: 'Konfirmasi unit sedang dikirim balik ke gudang?',
    variant: 'warning',
  },
  'In Progress→Completed': {
    targetStatus: 'Completed',
    label: 'Selesaikan',
    icon: 'fa-check-double',
    confirmMessage: 'Selesaikan transaksi ini? Dokumen akan dikunci permanen.',
    variant: 'success',
  },
  'Returning→Completed': {
    targetStatus: 'Completed',
    label: 'Terima di Gudang',
    icon: 'fa-warehouse',
    confirmMessage: 'Konfirmasi unit sudah diterima di gudang? Lokasi aset akan direset otomatis.',
    variant: 'success',
  },
  'Returning→Cancelled': {
    targetStatus: 'Cancelled',
    label: 'Batalkan Retur',
    icon: 'fa-ban',
    confirmMessage: 'Batalkan proses retur ini?',
    variant: 'danger',
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Periksa apakah transisi dari `from` ke `to` valid.
 */
export function isValidTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/**
 * Assert transisi valid. Melempar Error jika tidak valid.
 * Gunakan ini di service layer sebelum memanggil API.
 */
export function assertTransition(
  from: TransactionStatus,
  to: TransactionStatus
): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `[StateMachine] Transisi tidak valid: "${from}" → "${to}". ` +
      `Transisi yang diizinkan dari "${from}": [${VALID_TRANSITIONS[from]?.join(', ') || 'tidak ada'}]`
    );
  }
}

/**
 * Ambil semua aksi yang tersedia dari status saat ini.
 * Digunakan untuk render tombol dinamis di TransactionCard / HistoryView.
 */
export function getAvailableActions(
  currentStatus: TransactionStatus,
  transactionType?: string
): TransitionAction[] {
  const nextStatuses = VALID_TRANSITIONS[currentStatus] ?? [];

  return nextStatuses
    .map((target) => {
      const key = `${currentStatus}→${target}`;
      return TRANSITION_ACTIONS[key] ?? null;
    })
    .filter((a): a is TransitionAction => a !== null)
    .filter((action) => {
      // Untuk Mutation, tidak perlu "Kembalikan Unit" (Returning → hanya untuk Borrowing)
      if (
        transactionType === 'Mutation' &&
        action.targetStatus === 'Returning'
      ) return false;
      return true;
    });
}

/**
 * Periksa apakah sebuah status adalah terminal (tidak bisa berubah).
 */
export function isTerminalStatus(status: TransactionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Periksa apakah dokumen terkunci (doc_status = 1 atau terminal).
 */
export function isDocumentLocked(
  status: TransactionStatus,
  docStatus?: number | null
): boolean {
  return isTerminalStatus(status) || docStatus === 1 || docStatus === 2;
}
