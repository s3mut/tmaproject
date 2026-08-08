import type { ReactNode } from 'react';

interface Props {
  isOpen:     boolean;
  onClose:    () => void;
  title:      string;
  titleIcon?: string;   // FontAwesome class
  titleIconBg?: string; // tailwind bg+text classes for the icon pill
  children:   ReactNode;
  maxWidth?:  string;   // default 'max-w-md'
  /** If true, modal snaps from bottom (default). False = centered. */
  bottomSheet?: boolean;
}

/**
 * Design System — ModalShell
 * Unified modal wrapper providing: overlay, slide-up animation, header (title + X), scroll area.
 * All modals should use this to guarantee consistent structure & animations.
 *
 * Usage:
 *   <ModalShell isOpen={open} onClose={onClose} title="Edit Aset" titleIcon="fa-pen">
 *     {content}
 *   </ModalShell>
 */
const ModalShell = ({
  isOpen,
  onClose,
  title,
  titleIcon,
  titleIconBg = 'bg-blue-500/20 text-blue-400',
  children,
  maxWidth = 'max-w-md',
  bottomSheet = true,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`modal-content p-0 ${maxWidth} ${
          bottomSheet ? '' : 'mx-auto mb-auto mt-auto rounded-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            {titleIcon && (
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${titleIconBg}`}>
                <i className={`fas ${titleIcon} text-base`} />
              </div>
            )}
            <h2 className="text-base font-bold text-slate-50">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-50 flex items-center justify-center transition-all"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-72px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalShell;
