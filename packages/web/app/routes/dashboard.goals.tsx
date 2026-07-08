import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, TypedResponse } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams, useSubmit } from "@remix-run/react";

import { ConfirmDialog } from "~/components/ConfirmDialog";
import { ExpandableTextEditor } from "~/components/ExpandableTextEditor";
import { PrivateFieldsBadge, PrivateFieldToggle } from "~/components/PrivateFieldToggle";
import { Toast, type ToastType } from "~/components/Toast";
import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import {
  FEATURED_TOOLTIP,
  FIELD_TOOLTIPS,
  GOAL_STATUS_TOOLTIPS,
  PRIORITY_TOOLTIPS,
  VISIBILITY_DOMAIN_PRIVATE_TOOLTIP,
  VISIBILITY_PRIVATE_TOOLTIP,
} from "~/lib/tooltips";
import styles from "~/styles/skills.module.css";

interface Resource {
  id: string;
  title: string;
  url?: string;
  type: "article" | "video" | "course" | "book" | "documentation" | "other";
  completed: boolean;
}

interface Goal {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: Array<{ percentage: number }>;
  resources?: Resource[];
  domainId: string;
  description?: string;
  motivation?: string;
  notes?: string;
  targetDate?: string;
  visibility?: string;
  featured?: boolean;
  privateFields?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Domain {
  id: string;
  name: string;
  visibility?: string;
  categories: Array<{ id: string; name: string }>;
}

export const meta: MetaFunction = () => [{ title: "Learning Goals — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [goalsData, domainsData] = await Promise.all([
    api<{ goals: Goal[] }>("/profile/goals", { token }),
    api<{ domains: Domain[] }>("/profile/domains", { token }),
  ]);
  return json({ goals: goalsData.goals, domains: domainsData.domains });
}

type ActionData = { ok: true; toast?: string } | { error: string };

export async function action({ request }: ActionFunctionArgs): Promise<TypedResponse<ActionData>> {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "add") {
      await api("/profile/goals", {
        method: "POST",
        token,
        body: {
          name: String(form.get("name")),
          domainId: String(form.get("domainId")),
          priority: String(form.get("priority") || "medium"),
          description: String(form.get("description") ?? "") || undefined,
          motivation: form.get("motivation") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          targetDate: String(form.get("targetDate") ?? "") || undefined,
          visibility: form.get("visibility") as string || "public",
          featured: form.get("featured") === "on",
          privateFields: form.getAll("privateField").map(String),
        },
      });
      return json({ ok: true });
    }

    if (intent === "progress") {
      await api(`/profile/goals/${form.get("goalId")}/progress`, {
        method: "PUT",
        token,
        body: {
          percentage: Number(form.get("percentage")),
          note: String(form.get("note") ?? "") || undefined,
        },
      });
      return json({ ok: true, toast: "Progress saved" });
    }

    if (intent === "update") {
      const targetDateRaw = form.get("targetDate");
      const targetDate = targetDateRaw === null
        ? undefined
        : String(targetDateRaw) === ""
          ? null
          : String(targetDateRaw);
      await api(`/profile/goals/${form.get("goalId")}`, {
        method: "PUT",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
          motivation: String(form.get("motivation") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          priority: String(form.get("priority")),
          status: String(form.get("status")),
          targetDate,
          visibility: String(form.get("visibility") ?? "public"),
          featured: form.get("featured") === "on",
          privateFields: form.getAll("privateField").map(String),
        },
      });
      return json({ ok: true });
    }

    if (intent === "complete") {
      await api(`/profile/goals/${form.get("goalId")}/complete`, {
        method: "POST",
        token,
        body: {
          categoryId: String(form.get("categoryId")),
          proficiency: String(form.get("proficiency") || "novice"),
        },
      });
      return json({ ok: true });
    }

    if (intent === "add-resource") {
      const goalId = String(form.get("goalId"));
      await api(`/profile/goals/${goalId}/resources`, {
        method: "POST",
        token,
        body: {
          title: String(form.get("title")),
          url: String(form.get("url") ?? "") || undefined,
          type: String(form.get("type") || "other"),
          completed: form.get("completed") === "on",
        },
      });
      return json({ ok: true, toast: "Resource added" });
    }

    if (intent === "toggle-resource") {
      const goalId = String(form.get("goalId"));
      const resourceId = String(form.get("resourceId"));
      const completed = form.get("completed") === "true";
      await api(`/profile/goals/${goalId}/resources/${resourceId}`, {
        method: "PATCH",
        token,
        body: { completed },
      });
      return json({ ok: true });
    }

    if (intent === "remove-resource") {
      const goalId = String(form.get("goalId"));
      const resourceId = String(form.get("resourceId"));
      await api(`/profile/goals/${goalId}/resources/${resourceId}`, {
        method: "DELETE",
        token,
      });
      return json({ ok: true, toast: "Resource removed" });
    }

    if (intent === "demote") {
      await api(`/profile/goals/${form.get("goalId")}/demote`, {
        method: "POST",
        token,
      });
      return json({ ok: true, toast: "Demoted to interest" });
    }

    if (intent === "delete") {
      await api(`/profile/goals/${form.get("goalId")}`, { method: "DELETE", token });
      return json({ ok: true, toast: "Goal removed" });
    }

    return json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}

export default function GoalsPage() {
  const { goals, domains } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const editId = searchParams.get("edit");
  const isSubmitting = navigation.state === "submitting";
  const [saved, setSaved] = useState(false);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [demoteConfirm, setDemoteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData && "ok" in actionData) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, actionData]);

  useEffect(() => {
    if (!actionData) return;
    if ("error" in actionData && actionData.error) {
      setToast({ message: actionData.error, type: "error" });
    } else if ("toast" in actionData && actionData.toast) {
      setToast({ message: actionData.toast, type: "success" });
    }
  }, [actionData]);

  const filteredGoals = goals.filter((g) => {
    if (filterPriority && g.priority !== filterPriority) return false;
    if (filterFeatured === "yes" && !g.featured) return false;
    if (filterFeatured === "no" && g.featured) return false;
    if (filterSearch && !g.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const sortedGoals = [...filteredGoals].sort((a, b) => {
    if (sortBy === "added") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return a.name.localeCompare(b.name);
  });

  const domainMap = new Map(domains.map((d) => [d.id, d]));
  const active = sortedGoals.filter((g) => g.status === "active");
  const paused = sortedGoals.filter((g) => g.status === "paused");
  const completed = sortedGoals.filter((g) => g.status === "completed");
  const abandoned = sortedGoals.filter((g) => g.status === "abandoned");
  const editGoal = editId ? goals.find((g) => g.id === editId) : undefined;
  const completeGoalId = searchParams.get("complete");
  const completeGoal = completeGoalId ? goals.find((g) => g.id === completeGoalId) : undefined;

  function getProgress(goal: Goal): number {
    if (goal.progress.length === 0) return 0;
    return goal.progress[goal.progress.length - 1].percentage;
  }

  function renderGoalRow(goal: Goal) {
    const percentage = getProgress(goal);
    const domain = domainMap.get(goal.domainId);
    const domainPrivate = domain?.visibility === "private";
    return (
      <details className={styles.row} key={goal.id}>
        <summary className={styles.rowSummary}>
          <svg className={styles.rowDisclosure} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className={styles.rowMain}>
            <div className={styles.rowTitle}>
              {goal.featured && (
                <span className={styles.rowStar} aria-label="Featured" title={FEATURED_TOOLTIP}>★</span>
              )}
              <span className={styles.rowName}>{goal.name}</span>
              <PrivateFieldsBadge count={(goal.privateFields ?? []).filter((f) => f !== "progress").length} />
            </div>
            <div className={styles.rowMeta}>
              <span>{domain?.name ?? goal.domainId}</span>
              {(goal.resources?.length ?? 0) > 0 && (
                <>
                  <span className={styles.rowMetaSep} />
                  <span title={`${goal.resources!.length} resource${goal.resources!.length === 1 ? "" : "s"}`}>
                    📚 {goal.resources!.length}
                  </span>
                </>
              )}
              {goal.status !== "completed" && goal.status !== "abandoned" && (
                <span className={styles.rowProgressInline} title={`Progress: ${percentage}%`}>
                  <span className={styles.rowMetaSep} />
                  <div className={styles.rowProgressBar}>
                    <div className={styles.rowProgressFill} style={{ width: `${percentage}%` }} />
                  </div>
                  <span className={styles.rowProgressLabel}>{percentage}%</span>
                </span>
              )}
            </div>
          </div>
          <div className={styles.rowBadges}>
            <span
              className={styles.proficiency}
              data-level={goal.priority}
              title={PRIORITY_TOOLTIPS[goal.priority] ?? goal.priority}
            >
              {goal.priority}
            </span>
            <span
              className={styles.proficiency}
              data-level={goal.status}
              title={GOAL_STATUS_TOOLTIPS[goal.status] ?? goal.status}
            >
              {goal.status}
            </span>
            {goal.visibility === "private" && (
              <span className={styles.proficiency} data-level="private" title={VISIBILITY_PRIVATE_TOOLTIP}>private</span>
            )}
            {domainPrivate && (
              <span className={styles.proficiency} data-level="private" title={VISIBILITY_DOMAIN_PRIVATE_TOOLTIP}>hidden</span>
            )}
          </div>
        </summary>

        <div className={styles.rowDetails}>
          {goal.description && (
            <div className={styles.rowDetailBlock}>
              <span className={styles.rowDetailLabel}>Description</span>
              <span className={styles.rowDetailValue}>{goal.description}</span>
            </div>
          )}
          {goal.motivation && (
            <div className={styles.rowDetailBlock}>
              <span className={styles.rowDetailLabel}>Motivation</span>
              <span className={styles.rowDetailValue}>{goal.motivation}</span>
            </div>
          )}
          {goal.notes && (
            <div className={styles.rowDetailBlock}>
              <span className={styles.rowDetailLabel}>Notes</span>
              <span className={styles.rowDetailValue}>{goal.notes}</span>
            </div>
          )}

          {goal.status === "active" && (
            <div className={styles.rowDetailBlock}>
              <span className={styles.rowDetailLabel}>Progress ({percentage}%)</span>
              <ProgressStepper goalId={goal.id} current={percentage} />
            </div>
          )}

          <div className={styles.rowDetailBlock}>
            <span className={styles.rowDetailLabel}>Dates</span>
            <span className={styles.rowDetailValue}>
              Added {new Date(goal.createdAt).toLocaleDateString()}
              {new Date(goal.updatedAt).getTime() - new Date(goal.createdAt).getTime() > 60000 && (
                <> · Updated {new Date(goal.updatedAt).toLocaleDateString()}</>
              )}
            </span>
          </div>

          <div className={styles.rowActionsRight}>
            {goal.status === "active" && (
              <button
                type="button"
                className={styles.editButton}
                onClick={() => setSearchParams({ complete: goal.id })}
                title="Mark this goal complete and create a skill from it"
              >
                Complete
              </button>
            )}
            <button
              type="button"
              className={styles.editButton}
              onClick={() => setSearchParams({ edit: goal.id })}
              title="Edit goal details"
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setDeleteConfirm({ id: goal.id, name: goal.name })}
              title="Permanently remove this goal"
            >
              Remove
            </button>
          </div>
        </div>
      </details>
    );
  }

  function renderSection(title: string, items: Goal[]) {
    if (items.length === 0) return null;
    return (
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>{title}</h2>
        <div className={styles.rowList}>
          {items.map(renderGoalRow)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Learning Goals</h1>
        <button className={styles.addButton} onClick={() => setSearchParams({ add: "true" })}>
          Add Goal
        </button>
      </div>

      {actionData && "error" in actionData && (
        <div className={styles.error}>{actionData.error}</div>
      )}

      {goals.length > 0 && (
        <div className={styles.filterBar}>
          <input type="text" className={styles.filterSearch} placeholder="Search goals..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          <select className={styles.filterSelect} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select className={styles.filterSelect} value={filterFeatured} onChange={(e) => setFilterFeatured(e.target.value)}>
            <option value="">All</option>
            <option value="yes">Featured</option>
            <option value="no">Not featured</option>
          </select>
          <select className={styles.filterSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="added">Sort: Recently added</option>
            <option value="updated">Sort: Recently updated</option>
          </select>
          {(filterPriority || filterFeatured || filterSearch) && (
            <button className={styles.filterClear} onClick={() => { setFilterPriority(""); setFilterFeatured(""); setFilterSearch(""); }}>Clear filters</button>
          )}
        </div>
      )}

      {goals.length === 0 ? (
        <p className={styles.emptyState}>No learning goals yet.</p>
      ) : filteredGoals.length === 0 ? (
        <p className={styles.emptyState}>No goals match your filters.</p>
      ) : (
        <>
          {renderSection("Active", active)}
          {renderSection("Paused", paused)}
          {renderSection("Completed", completed)}
          {renderSection("Abandoned", abandoned)}
        </>
      )}

      {showAdd && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Add Learning Goal</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add" />

              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input id="name" name="name" required className={styles.input} placeholder="e.g. Learn Rust" />
              </div>

              <div className={styles.field}>
                <label htmlFor="domainId" className={styles.label}>Domain</label>
                <select id="domainId" name="domainId" required className={styles.select}>
                  <option value="">Select domain...</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="priority" className={styles.label} title={FIELD_TOOLTIPS.priority}>Priority</label>
                <select id="priority" name="priority" className={styles.select} defaultValue="medium">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <PrivateFieldToggle field="priority" />
              </div>

              <div className={styles.field}>
                <label htmlFor="description" className={styles.label} title={FIELD_TOOLTIPS.description}>Description (optional)</label>
                <ExpandableTextEditor id="description" name="description" placeholder="What does this goal involve?" label="Description" />
              </div>

              <div className={styles.field}>
                <label htmlFor="motivation" className={styles.label} title={FIELD_TOOLTIPS.motivation}>Motivation (optional)</label>
                <ExpandableTextEditor id="motivation" name="motivation" rows={3} placeholder="Why are you learning this?" label="Motivation" />
                <PrivateFieldToggle field="motivation" />
              </div>

              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label} title={FIELD_TOOLTIPS.notes}>Notes (internal — never exported)</label>
                <ExpandableTextEditor id="notes" name="notes" rows={2} placeholder="Internal notes (not exported)" label="Notes" />
              </div>

              <div className={styles.field}>
                <label htmlFor="targetDate" className={styles.label} title={FIELD_TOOLTIPS.targetDate}>Target date (optional)</label>
                <input id="targetDate" name="targetDate" type="date" className={styles.input} />
                <PrivateFieldToggle field="targetDate" />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <input type="checkbox" name="featured" /> Featured
                </label>
              </div>

              <div className={styles.field}>
                <label htmlFor="visibility" className={styles.label}>Visibility</label>
                <select id="visibility" name="visibility" className={styles.select} defaultValue="public">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-sm) var(--space-md)", margin: 0 }}>
                <legend style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", padding: "0 var(--space-sm)" }} title="Hide selected sub-collections from public output even when the goal itself is public.">More privacy controls</legend>
                <PrivateFieldToggle field="progress" defaultChecked note="History of % updates. Private by default — uncheck to publish." />
                <PrivateFieldToggle field="resources" note="Articles, courses, books linked to this goal." />
              </fieldset>

              <div className={styles.formActions}>
                <button type="button" onClick={() => { setSaved(false); setSearchParams({}); }} className={styles.cancelButton}>
                  Close
                </button>
                <button type="submit" disabled={isSubmitting || saved} className={styles.submitButton}>
                  {saved ? "Added!" : isSubmitting ? "Adding..." : "Add Goal"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {completeGoal && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Complete Goal: {completeGoal.name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.875rem' }}>
              Completing a goal creates a new skill. Choose where the skill should be categorized.
            </p>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="complete" />
              <input type="hidden" name="goalId" value={completeGoal.id} />

              <div className={styles.field}>
                <label htmlFor="complete-categoryId" className={styles.label}>Category</label>
                <select id="complete-categoryId" name="categoryId" required className={styles.select}>
                  <option value="">Select category...</option>
                  {(() => {
                    const goalDomain = domains.find((d) => d.id === completeGoal.domainId);
                    return goalDomain?.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ));
                  })()}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="complete-proficiency" className={styles.label}>Initial Proficiency</label>
                <select id="complete-proficiency" name="proficiency" className={styles.select} defaultValue="novice">
                  <option value="novice">Novice</option>
                  <option value="familiar">Familiar</option>
                  <option value="proficient">Proficient</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => { setSaved(false); setSearchParams({}); }} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || saved} className={styles.submitButton}>
                  {saved ? "Completed!" : isSubmitting ? "Completing..." : "Complete Goal"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {editGoal && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Edit Learning Goal</h2>
            <Form method="post" className={styles.form} key={editGoal.id}>
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="goalId" value={editGoal.id} />

              <div className={styles.field}>
                <label htmlFor="edit-name" className={styles.label}>Name</label>
                <input id="edit-name" name="name" required className={styles.input} defaultValue={editGoal.name} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-description" className={styles.label}>Description (optional)</label>
                <ExpandableTextEditor id="edit-description" name="description" defaultValue={editGoal.description ?? ""} label="Description" />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-motivation" className={styles.label} title={FIELD_TOOLTIPS.motivation}>Motivation (optional)</label>
                <ExpandableTextEditor id="edit-motivation" name="motivation" rows={3} defaultValue={editGoal.motivation ?? ""} label="Motivation" />
                <PrivateFieldToggle
                  field="motivation"
                  defaultChecked={editGoal.privateFields?.includes("motivation")}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-notes" className={styles.label}>Notes (optional)</label>
                <ExpandableTextEditor id="edit-notes" name="notes" rows={2} defaultValue={editGoal.notes ?? ""} placeholder="Internal notes (not exported)" label="Notes" />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-priority" className={styles.label} title={FIELD_TOOLTIPS.priority}>Priority</label>
                <select id="edit-priority" name="priority" className={styles.select} defaultValue={editGoal.priority}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <PrivateFieldToggle
                  field="priority"
                  defaultChecked={editGoal.privateFields?.includes("priority")}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-status" className={styles.label} title={FIELD_TOOLTIPS.goalStatus}>Status</label>
                <select id="edit-status" name="status" className={styles.select} defaultValue={editGoal.status}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
                <PrivateFieldToggle
                  field="status"
                  defaultChecked={editGoal.privateFields?.includes("status")}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-targetDate" className={styles.label} title={FIELD_TOOLTIPS.targetDate}>Target date (optional)</label>
                <input
                  id="edit-targetDate"
                  name="targetDate"
                  type="date"
                  className={styles.input}
                  defaultValue={editGoal.targetDate ? editGoal.targetDate.slice(0, 10) : ""}
                />
                <PrivateFieldToggle
                  field="targetDate"
                  defaultChecked={editGoal.privateFields?.includes("targetDate")}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <input type="checkbox" name="featured" defaultChecked={editGoal.featured} /> Featured
                </label>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-visibility" className={styles.label}>Visibility</label>
                <select id="edit-visibility" name="visibility" className={styles.select} defaultValue={editGoal.visibility ?? "public"}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-sm) var(--space-md)", margin: 0 }}>
                <legend style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", padding: "0 var(--space-sm)" }} title="Hide selected sub-collections from public output even when the goal itself is public.">More privacy controls</legend>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "var(--space-xs) 0 var(--space-sm)" }}>
                  Toggle whether these sub-collections appear on your public profile.
                </p>
                <PrivateFieldToggle
                  field="progress"
                  defaultChecked={editGoal.privateFields?.includes("progress") ?? true}
                  note="History of % updates. Private by default — uncheck to publish."
                />
                <PrivateFieldToggle
                  field="resources"
                  defaultChecked={editGoal.privateFields?.includes("resources")}
                  note="Articles, courses, books linked to this goal (managed below)."
                />
              </fieldset>

              <div className={styles.formActions}>
                <button type="button" onClick={() => { setSaved(false); setSearchParams({}); }} className={styles.cancelButton}>
                  Close
                </button>
                <button type="submit" disabled={isSubmitting || saved} className={styles.submitButton}>
                  {saved ? "Saved!" : isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </Form>

            <ResourcesSection goal={editGoal} isSubmitting={isSubmitting} />

            <div
              style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border)" }}
            >
              <button
                type="button"
                className={styles.cancelButton}
                disabled={isSubmitting}
                onClick={() => setDemoteConfirm({ id: editGoal.id, name: editGoal.name })}
                title="Convert this goal back to an interest"
              >
                Demote to Interest
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete goal?"
        message={
          <p>
            <strong>"{deleteConfirm?.name}"</strong> will be permanently removed along with its progress history. This cannot be undone.
          </p>
        }
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          const form = new FormData();
          form.append("intent", "delete");
          form.append("goalId", deleteConfirm.id);
          submit(form, { method: "post" });
          setDeleteConfirm(null);
        }}
      />

      <ConfirmDialog
        open={!!demoteConfirm}
        title="Demote to interest?"
        message={
          <>
            <p>
              <strong>"{demoteConfirm?.name}"</strong> will be converted to an interest.
            </p>
            <p style={{ marginTop: "var(--space-sm)" }}>
              Preserved: name, domain, description, notes. Discarded: priority, status, progress, resources, motivation, target date.
            </p>
          </>
        }
        confirmLabel="Demote"
        variant="warning"
        onCancel={() => setDemoteConfirm(null)}
        onConfirm={() => {
          if (!demoteConfirm) return;
          const form = new FormData();
          form.append("intent", "demote");
          form.append("goalId", demoteConfirm.id);
          submit(form, { method: "post" });
          setDemoteConfirm(null);
          setSearchParams({});
        }}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

const RESOURCE_TYPE_ICONS: Record<Resource["type"], string> = {
  article: "📄",
  video: "🎬",
  course: "🎓",
  book: "📚",
  documentation: "📑",
  other: "•",
};

function ResourcesSection({ goal, isSubmitting }: { goal: Goal; isSubmitting: boolean }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const resources = goal.resources ?? [];
  return (
    <div style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-md)", borderTop: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
        <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }} title="Articles, courses, books, and other materials linked to this goal.">
          Resources <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({resources.length})</span>
        </h3>
        <button
          type="button"
          className={styles.editButton}
          onClick={() => setShowAddForm((v) => !v)}
          disabled={isSubmitting}
        >
          {showAddForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showAddForm && (
        <Form method="post" style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", padding: "var(--space-sm)", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-sm)" }}>
          <input type="hidden" name="intent" value="add-resource" />
          <input type="hidden" name="goalId" value={goal.id} />
          <input name="title" required placeholder="Title (e.g. The Rust Book)" className={styles.input} />
          <input name="url" type="url" placeholder="URL (optional)" className={styles.input} />
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <select name="type" defaultValue="article" className={styles.select} style={{ flex: 1, minWidth: 0 }}>
              <option value="article">📄 Article</option>
              <option value="video">🎬 Video</option>
              <option value="course">🎓 Course</option>
              <option value="book">📚 Book</option>
              <option value="documentation">📑 Documentation</option>
              <option value="other">• Other</option>
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.875rem" }}>
              <input type="checkbox" name="completed" /> Already completed
            </label>
          </div>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting} style={{ alignSelf: "flex-end", padding: "4px var(--space-md)", fontSize: "0.75rem" }}>
            Add Resource
          </button>
        </Form>
      )}

      {resources.length === 0 && !showAddForm && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", margin: 0 }}>
          No resources yet. Add articles, videos, or courses you're using to learn.
        </p>
      )}

      {resources.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          {resources.map((r) => (
            <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-xs) var(--space-sm)", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", minHeight: 44 }}>
              <Form method="post" style={{ display: "inline-flex" }}>
                <input type="hidden" name="intent" value="toggle-resource" />
                <input type="hidden" name="goalId" value={goal.id} />
                <input type="hidden" name="resourceId" value={r.id} />
                <input type="hidden" name="completed" value={String(!r.completed)} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  title={r.completed ? "Mark as not completed" : "Mark as completed"}
                  aria-label={r.completed ? "Mark as not completed" : "Mark as completed"}
                  style={{
                    width: 28, height: 28, minHeight: 28,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: r.completed ? "var(--gradient-accent)" : "rgba(255,255,255,0.05)",
                    color: r.completed ? "white" : "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {r.completed ? "✓" : ""}
                </button>
              </Form>
              <span style={{ fontSize: "1rem" }} aria-hidden="true" title={r.type}>
                {RESOURCE_TYPE_ICONS[r.type]}
              </span>
              <span style={{ flex: 1, minWidth: 0, textDecoration: r.completed ? "line-through" : "none", color: r.completed ? "var(--color-text-muted)" : "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }} title={r.url}>
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
              </span>
              <Form method="post" style={{ display: "inline-flex" }}>
                <input type="hidden" name="intent" value="remove-resource" />
                <input type="hidden" name="goalId" value={goal.id} />
                <input type="hidden" name="resourceId" value={r.id} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.deleteButton}
                  title="Remove resource"
                  aria-label="Remove resource"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                >
                  ✕
                </button>
              </Form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressStepper({ goalId, current }: { goalId: string; current: number }) {
  const [value, setValue] = useState<number>(current);

  // Sync when current changes (after successful save)
  useEffect(() => setValue(current), [current]);

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const snapToTen = (n: number) => Math.round(n / 10) * 10;

  return (
    <Form method="post" className={styles.progressStepper}>
      <input type="hidden" name="intent" value="progress" />
      <input type="hidden" name="goalId" value={goalId} />
      <button
        type="button"
        className={styles.progressStepperBtn}
        disabled={value <= 0}
        onClick={() => setValue((v) => clamp(snapToTen(v - 10)))}
        aria-label="Decrease by 10%"
      >
        −10
      </button>
      <button
        type="button"
        className={styles.progressStepperBtn}
        disabled={value >= 100}
        onClick={() => setValue((v) => clamp(snapToTen(v + 10)))}
        aria-label="Increase by 10%"
      >
        +10
      </button>
      <span className={styles.progressStepperInputWrap}>
        <input
          type="number"
          name="percentage"
          className={styles.progressStepperInput}
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(clamp(Number(e.target.value) || 0))}
          aria-label="Progress percentage"
        />
        <span className={styles.progressStepperSuffix} aria-hidden="true">%</span>
      </span>
      <button type="submit" className={styles.submitButton} style={{ padding: "4px var(--space-md)", fontSize: "0.75rem" }}>
        Save
      </button>
    </Form>
  );
}
