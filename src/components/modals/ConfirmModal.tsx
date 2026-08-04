import { ModalShell, Button } from '../ui';

interface Props {
  isOpen:        boolean;
  title:         string;
  message:       string;
  confirmLabel?: string;
  icon?:         string;
  variant?:      'danger' | 'warning' | 'primary';
  onConfirm:     () => void;
  onCancel:      () => void;
}

const variantIcon: Record<string, string> = {
  danger:  'bg-red-500/15 text-red-400',
  warning: 'bg-amber-500/15 text-amber-400',
  primary: 'bg-blue-500/15 text-blue-400',
};

/**
 * ConfirmModal — refactored to use ModalShell + Button design system.
 */
const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  icon = 'fa-exclamation-triangle',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    titleIcon={icon}
    titleIconBg={variantIcon[variant]}
    maxWidth="max-w-sm"
  >
    <div className="space-y-5">
      <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Batal
        </Button>
        <Button variant={variant === 'warning' ? 'warning' : variant} fullWidth onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </ModalShell>
);

export default ConfirmModal;
