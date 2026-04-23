import { useEffect } from "react";
import toastStyles from "~/styles/toast.module.css";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type = "success", onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div
      className={
        type === "error" ? toastStyles.toastError
        : type === "info" ? toastStyles.toastInfo
        : toastStyles.toastSuccess
      }
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <span className={toastStyles.toastMessage}>{message}</span>
      <button
        type="button"
        className={toastStyles.toastClose}
        onClick={onDismiss}
        aria-label="Dismiss"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
