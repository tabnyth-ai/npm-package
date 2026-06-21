import type { ComponentChildren } from "preact";

interface ConfirmModalProps {
  title: string;
  confirmLabel: ComponentChildren;
  children: ComponentChildren;
  disabled?: boolean;
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmModal({ title, confirmLabel, children, disabled, onCancel, onConfirm }: ConfirmModalProps) {
  return (
    <div class="modal-backdrop" role="presentation">
      <section aria-modal="true" class="confirm-modal" role="dialog" aria-labelledby="confirm-modal-title">
        <h2 id="confirm-modal-title">{title}</h2>
        <div class="confirm-modal-body">{children}</div>
        <div class="confirm-modal-actions">
          <button class="secondary-button" type="button" onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
          <button class="danger-button" type="button" onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
