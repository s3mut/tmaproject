interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  confirmClass = 'bg-red-600 hover:bg-red-500',
  icon = 'fa-exclamation-triangle',
  onConfirm,
  onCancel,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content p-6 max-w-sm mx-auto space-y-5">
        {/* Icon */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
            <i className={`fas ${icon}`}></i>
          </div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-all"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
