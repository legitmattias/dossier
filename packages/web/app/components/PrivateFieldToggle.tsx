import styles from "~/styles/private-field.module.css";

interface PrivateFieldToggleProps {
  /** Field name being marked private (e.g. "url", "proficiency"). Submitted as the value of a checkbox named `privateField`. */
  readonly field: string;
  /** Whether the field is currently marked private. */
  readonly defaultChecked?: boolean;
  /** Optional extra helper text shown below the toggle (e.g. proficiency warning). */
  readonly note?: string;
}

/**
 * Inline checkbox rendered next to an eligible field's label/control. When
 * checked, the field is stripped from public profile output even though the
 * entity itself is `visibility: "public"`. The form's action handler reads all
 * checked values via `formData.getAll("privateField")`.
 */
export function PrivateFieldToggle({ field, defaultChecked, note }: PrivateFieldToggleProps) {
  return (
    <div className={styles.wrap}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          name="privateField"
          value={field}
          defaultChecked={defaultChecked}
          className={styles.checkbox}
        />
        <span className={styles.label}>
          <span className={styles.lock} aria-hidden="true">🔒</span>
          Private
        </span>
      </label>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

interface PrivateFieldsBadgeProps {
  /** Number of private-overridden fields. If 0 nothing renders. */
  readonly count: number;
}

/**
 * Small padlock badge shown next to entity names in list views when the entity
 * has one or more `privateFields` overrides. Helps the owner see at a glance
 * that some content on this row won't appear publicly.
 */
export function PrivateFieldsBadge({ count }: PrivateFieldsBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={styles.badge}
      title={`${count} field${count === 1 ? "" : "s"} hidden from public view`}
      aria-label={`${count} field${count === 1 ? "" : "s"} hidden from public view`}
    >
      <span aria-hidden="true">🔒</span>
      <span className={styles.badgeCount}>{count}</span>
    </span>
  );
}
