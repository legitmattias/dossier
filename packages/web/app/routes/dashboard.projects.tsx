import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  url?: string;
  role?: string;
  status: string;
  priority: string;
  featured: boolean;
  visibility: string;
  skillIds: string[];
  highlights: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const meta: MetaFunction = () => [{ title: "Projects — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const data = await api<{ projects: Project[] }>("/profile/projects", { token });
  return json({ projects: data.projects });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "add") {
      await api("/profile/projects", {
        method: "POST",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
          url: String(form.get("url") ?? "") || undefined,
          role: String(form.get("role") ?? "") || undefined,
          status: String(form.get("status") || "active"),
          priority: String(form.get("priority") || "medium"),
          featured: form.get("featured") === "on",
          visibility: String(form.get("visibility") || "public"),
        },
      });
      return json({ ok: true });
    }

    if (intent === "update") {
      const id = String(form.get("projectId"));
      await api(`/profile/projects/${id}`, {
        method: "PUT",
        token,
        body: {
          name: String(form.get("name") ?? "") || undefined,
          description: String(form.get("description") ?? "") || undefined,
          url: String(form.get("url") ?? "") || undefined,
          role: String(form.get("role") ?? "") || undefined,
          status: String(form.get("status") ?? "") || undefined,
          priority: String(form.get("priority") ?? "") || undefined,
          featured: form.has("featured") ? form.get("featured") === "on" : undefined,
          visibility: String(form.get("visibility") ?? "") || undefined,
        },
      });
      return json({ ok: true });
    }

    if (intent === "delete") {
      await api(`/profile/projects/${form.get("projectId")}`, {
        method: "DELETE",
        token,
      });
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

const STATUS_OPTIONS = ["active", "completed", "paused", "ideation"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
const VISIBILITY_OPTIONS = ["public", "private"] as const;

export default function ProjectsPage() {
  const { projects } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <button
          className={styles.addButton}
          onClick={() => setSearchParams({ add: "true" })}
        >
          Add Project
        </button>
      </div>

      {actionData && "error" in actionData && (
        <div className={styles.error}>{actionData.error}</div>
      )}

      {projects.length === 0 ? (
        <p className={styles.emptyState}>
          No projects yet. Add your first project to get started.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Featured</th>
              <th>Visibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  {project.url ? (
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      {project.name}
                    </a>
                  ) : (
                    project.name
                  )}
                </td>
                <td>
                  <span className={styles.proficiency} data-level={project.status}>
                    {project.status}
                  </span>
                </td>
                <td>
                  <span className={styles.proficiency} data-level={project.priority}>
                    {project.priority}
                  </span>
                </td>
                <td>{project.featured ? "\u2605" : ""}</td>
                <td className={styles.categoryName}>{project.visibility}</td>
                <td className={styles.actions}>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button type="submit" className={styles.deleteButton}>Remove</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Project Modal */}
      {showAdd && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Project</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add" />

              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input id="name" name="name" required className={styles.input} />
              </div>

              <div className={styles.field}>
                <label htmlFor="description" className={styles.label}>Description (optional)</label>
                <input id="description" name="description" className={styles.input} />
              </div>

              <div className={styles.field}>
                <label htmlFor="url" className={styles.label}>URL (optional)</label>
                <input id="url" name="url" type="url" className={styles.input} />
              </div>

              <div className={styles.field}>
                <label htmlFor="role" className={styles.label}>Role (optional)</label>
                <input id="role" name="role" className={styles.input} />
              </div>

              <div className={styles.field}>
                <label htmlFor="status" className={styles.label}>Status</label>
                <select id="status" name="status" className={styles.select} defaultValue="active">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="priority" className={styles.label}>Priority</label>
                <select id="priority" name="priority" className={styles.select} defaultValue="medium">
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="featured" className={styles.label}>
                  <input id="featured" name="featured" type="checkbox" /> Featured
                </label>
              </div>

              <div className={styles.field}>
                <label htmlFor="visibility" className={styles.label}>Visibility</label>
                <select id="visibility" name="visibility" className={styles.select} defaultValue="public">
                  {VISIBILITY_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setSearchParams({})} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? "Adding..." : "Add Project"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
