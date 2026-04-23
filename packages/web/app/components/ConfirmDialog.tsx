import { useEffect, useRef } from "react";
import styles from "~/styles/skills.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Styled confirmation dialog — drop-in replacement for browser `confirm()`.
 * Closes on Escape. Focuses the cancel button by default (safer default).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClassName =
    variant === "danger"
      ? styles.deleteButton
      : variant === "warning"
      ? styles.editButton
      : styles.submitButton;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className={styles.modalCard} style={{ maxWidth: 460 }}>
        <h2 id="confirm-dialog-title" className={styles.modalTitle}>{title}</h2>
        <div style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)", lineHeight: 1.55 }}>
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>
        <div className={styles.formActions}>
          <button ref={cancelRef} type="button" onClick={onCancel} className={styles.cancelButton}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmClassName}
            style={{ padding: "var(--space-sm) var(--space-lg)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
