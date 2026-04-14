import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

interface Goal {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: Array<{ percentage: number }>;
  domainId: string;
  description?: string;
  motivation?: string;
  visibility?: string;
  featured?: boolean;
}

interface Domain {
  id: string;
  name: string;
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

export async function action({ request }: ActionFunctionArgs) {
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
          visibility: form.get("visibility") as string || "public",
          featured: form.get("featured") === "on",
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
      return json({ ok: true });
    }

    if (intent === "update") {
      await api(`/profile/goals/${form.get("goalId")}`, {
        method: "PUT",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
          motivation: String(form.get("motivation") ?? "") || undefined,
          priority: String(form.get("priority")),
          status: String(form.get("status")),
          visibility: String(form.get("visibility") ?? "public"),
          featured: form.get("featured") === "on",
        },
      });
      return json({ ok: true });
    }

    if (intent === "delete") {
      await api(`/profile/goals/${form.get("goalId")}`, { method: "DELETE", token });
      return json({ ok: true });
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
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const editId = searchParams.get("edit");
  const isSubmitting = navigation.state === "submitting";
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const filteredGoals = goals.filter((g) => {
    if (filterPriority && g.priority !== filterPriority) return false;
    if (filterSearch && !g.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const domainMap = new Map(domains.map((d) => [d.id, d.name]));
  const active = filteredGoals.filter((g) => g.status === "active");
  const paused = filteredGoals.filter((g) => g.status === "paused");
  const completed = filteredGoals.filter((g) => g.status === "completed");
  const abandoned = filteredGoals.filter((g) => g.status === "abandoned");
  const editGoal = editId ? goals.find((g) => g.id === editId) : undefined;

  function getProgress(goal: Goal): number {
    if (goal.progress.length === 0) return 0;
    return goal.progress[goal.progress.length - 1].percentage;
  }

  function renderGoalCard(goal: Goal) {
    const percentage = getProgress(goal);
    return (
      <div className={styles.card} key={goal.id}>
        <div className={styles.cardHeader}>
          <span className={styles.cardName}>{goal.name}</span>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              className={styles.editButton}
              onClick={() => setSearchParams({ edit: goal.id })}
            >
              Edit
            </button>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="goalId" value={goal.id} />
              <button
                type="submit"
                className={styles.deleteButton}
                onClick={(e) => {
                  if (!confirm(`Delete goal "${goal.name}"?`)) e.preventDefault();
                }}
              >
                Remove
              </button>
            </Form>
          </div>
        </div>
        {goal.description && <div className={styles.cardDescription}>{goal.description}</div>}
        <div className={styles.cardBadges}>
          {goal.featured && <span className={styles.featuredBadge}>Featured</span>}
          <span className={styles.proficiency} data-level={goal.priority}>{goal.priority}</span>
          <span className={styles.proficiency} data-level={goal.status}>{goal.status}</span>
          {goal.visibility === "private" && (
            <span className={styles.proficiency} data-level="private">private</span>
          )}
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${percentage}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={styles.progressLabel}>{percentage}%</span>
          <Form method="post" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input type="hidden" name="intent" value="progress" />
            <input type="hidden" name="goalId" value={goal.id} />
            <input
              type="number"
              name="percentage"
              min="0"
              max="100"
              defaultValue={percentage}
              className={styles.input}
              style={{ width: '60px', padding: '2px 6px', fontSize: '0.75rem' }}
            />
            <button type="submit" className={styles.editButton}>Set</button>
          </Form>
        </div>
      </div>
    );
  }

  function renderSection(title: string, items: Goal[]) {
    if (items.length === 0) return null;
    return (
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>{title}</h2>
        <div className={styles.cardGrid}>
          {items.map(renderGoalCard)}
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
          {(filterPriority || filterSearch) && (
            <button className={styles.filterClear} onClick={() => { setFilterPriority(""); setFilterSearch(""); }}>Clear filters</button>
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
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
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
                <label htmlFor="priority" className={styles.label}>Priority</label>
                <select id="priority" name="priority" className={styles.select}>
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="description" className={styles.label}>Description (optional)</label>
                <input id="description" name="description" className={styles.input} placeholder="What does this goal involve?" />
              </div>

              <div className={styles.field}>
                <label htmlFor="motivation" className={styles.label}>Motivation (optional)</label>
                <textarea id="motivation" name="motivation" className={styles.input} rows={3} placeholder="Why are you learning this?" />
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

              <div className={styles.formActions}>
                <button type="button" onClick={() => setSearchParams({})} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? "Adding..." : "Add Goal"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {editGoal && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Learning Goal</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="goalId" value={editGoal.id} />

              <div className={styles.field}>
                <label htmlFor="edit-name" className={styles.label}>Name</label>
                <input id="edit-name" name="name" required className={styles.input} defaultValue={editGoal.name} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-description" className={styles.label}>Description (optional)</label>
                <input id="edit-description" name="description" className={styles.input} defaultValue={editGoal.description ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-motivation" className={styles.label}>Motivation (optional)</label>
                <textarea id="edit-motivation" name="motivation" className={styles.input} rows={3} defaultValue={editGoal.motivation ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-priority" className={styles.label}>Priority</label>
                <select id="edit-priority" name="priority" className={styles.select} defaultValue={editGoal.priority}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-status" className={styles.label}>Status</label>
                <select id="edit-status" name="status" className={styles.select} defaultValue={editGoal.status}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
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

              <div className={styles.formActions}>
                <button type="button" onClick={() => setSearchParams({})} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
