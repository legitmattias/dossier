import { useEffect, useRef, useState } from "react";

import styles from "~/styles/expandable-text-editor.module.css";

interface ExpandableTextEditorProps {
  readonly id?: string;
  readonly name: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly label?: string;
  readonly className?: string;
}

/**
 * Long-text editor with a compact inline textarea (default 3 rows) and an
 * "expand" button that opens a focused, mobile-friendly modal with a much
 * larger editing surface. The Save button in the modal commits the value to
 * the underlying textarea (which carries the `name` attribute for form
 * submission). Cancel discards just the in-progress modal edit. The outer
 * Remix Form still does the actual persistence.
 */
export function ExpandableTextEditor({
  id,
  name,
  defaultValue = "",
  placeholder,
  rows = 3,
  label,
  className,
}: ExpandableTextEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(defaultValue);
  const modalTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus + select-end when modal opens
  useEffect(() => {
    if (expanded && modalTextareaRef.current) {
      modalTextareaRef.current.focus();
      modalTextareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [expanded, draft.length]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!expanded) return;
    document.body.classList.add("nav-locked");
    return () => document.body.classList.remove("nav-locked");
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const openModal = () => {
    setDraft(value);
    setExpanded(true);
  };
  const saveModal = () => {
    setValue(draft);
    setExpanded(false);
  };
  const cancelModal = () => {
    setExpanded(false);
  };

  return (
    <>
      <div className={styles.wrap}>
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${styles.textarea} ${className ?? ""}`}
        />
        <button
          type="button"
          onClick={openModal}
          className={styles.expandButton}
          aria-label={label ? `Expand ${label} editor` : "Expand editor"}
          title="Expand for full-screen editing"
        >
          ⤢
        </button>
      </div>

      {expanded && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={label ?? "Edit"}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{label ?? "Edit"}</h3>
              <button
                type="button"
                onClick={cancelModal}
                className={styles.closeButton}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <textarea
              ref={modalTextareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className={styles.fullscreenTextarea}
            />
            <div className={styles.modalActions}>
              <button type="button" onClick={cancelModal} className={styles.cancelButton}>
                Cancel
              </button>
              <button type="button" onClick={saveModal} className={styles.saveButton}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
