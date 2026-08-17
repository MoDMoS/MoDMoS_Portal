import { useId } from 'react';

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  danger = false,
  busy = false,
  hideCancel = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  hideCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="admin-modal__head">
          <h2 id={titleId}>{title}</h2>
        </div>
        <p className="admin-modal__message">{message}</p>
        <div className="admin-role-actions">
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'กำลังทำ…' : confirmLabel}
          </button>
          {hideCancel ? null : (
            <button type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
