import { useEffect, useState } from "react";
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
  notes?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const meta: MetaFunction = () => [{ title: "Projects — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [projectsData, skillsData] = await Promise.all([
    api<{ projects: Project[] }>("/profile/projects", { token }),
    api<{ skills: Array<{ id: string; name: string }> }>("/profile/skills", { token }),
  ]);
  return json({ projects: projectsData.projects, skills: skillsData.skills });
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
          notes: String(form.get("notes") ?? "") || undefined,
          status: String(form.get("status") || "active"),
          priority: String(form.get("priority") || "medium"),
          featured: form.get("featured") === "on",
          visibility: String(form.get("visibility") || "public"),
          skillIds: form.getAll("skillIds").map(String).filter(Boolean),
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
          skillIds: form.getAll("skillIds").map(String).filter(Boolean),
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
  const { projects, skills } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const editProject = projects.find((p) => p.id === searchParams.get("edit"));
  const isSubmitting = navigation.state !== "idle";
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    if (navigation.state === "idle" && actionData && "ok" in actionData) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, actionData]);

  const filteredProjects = projects.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (filterFeatured === "yes" && !p.featured) return false;
    if (filterFeatured === "no" && p.featured) return false;
    if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "added") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return a.name.localeCompare(b.name);
  });

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

      {projects.length > 0 && (
        <div className={styles.filterBar}>
          <input type="text" className={styles.filterSearch} placeholder="Search projects..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={styles.filterSelect} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
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
          {(filterStatus || filterPriority || filterFeatured || filterSearch) && (
            <button className={styles.filterClear} onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterFeatured(""); setFilterSearch(""); }}>Clear filters</button>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <p className={styles.emptyState}>
          No projects yet. Add your first project to get started.
        </p>
      ) : filteredProjects.length === 0 ? (
        <p className={styles.emptyState}>
          No projects match your filters.
        </p>
      ) : (
        <div className={styles.cardGrid}>
          {sortedProjects.map((project) => (
            <div className={styles.card} key={project.id}>
              <div className={styles.cardHeader}>
                {project.url ? (
                  <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.cardNameLink}>
                    {project.name}
                  </a>
                ) : (
                  <span className={styles.cardName}>{project.name}</span>
                )}
                {project.featured && <span className={styles.featuredBadge}>Featured</span>}
              </div>
              {project.description && <div className={styles.cardDescription}>{project.description}</div>}
              {project.role && (
                <div className={styles.cardMeta}>
                  <span className={styles.cardMetaLabel}>Role:</span> {project.role}
                </div>
              )}
              {project.skillIds && project.skillIds.length > 0 && (
                <div className={styles.skillChips}>
                  {project.skillIds.map((skillId) => {
                    const skill = skills.find((s) => s.id === skillId);
                    return skill ? <span key={skillId} className={styles.skillChip}>{skill.name}</span> : null;
                  })}
                </div>
              )}
              <div className={styles.cardBadges}>
                <span className={styles.proficiency} data-level={project.status}>{project.status}</span>
                <span className={styles.proficiency} data-level={project.priority}>{project.priority}</span>
                {project.visibility === "private" && (
                  <span className={styles.proficiency} data-level="private">private</span>
                )}
              </div>
              {project.notes && <div className={styles.cardNotes}>{project.notes}</div>}
              <div className={styles.cardActions}>
                <button
                  className={styles.editButton}
                  onClick={() => setSearchParams({ edit: project.id })}
                >
                  Edit
                </button>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="projectId" value={project.id} />
                  <button type="submit" className={styles.deleteButton}>Remove</button>
                </Form>
              </div>
              <div className={styles.cardMeta} style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)' }}>
                Added {new Date(project.createdAt).toLocaleDateString()}
                {new Date(project.updatedAt).getTime() - new Date(project.createdAt).getTime() > 60000 && (
                  <> · Updated {new Date(project.updatedAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAdd && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Add Project</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add" />

              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input id="name" name="name" required className={styles.input} placeholder="e.g. My SaaS App" />
              </div>

              <div className={styles.field}>
                <label htmlFor="description" className={styles.label}>Description (optional)</label>
                <input id="description" name="description" className={styles.input} placeholder="Brief summary of the project" />
              </div>

              <div className={styles.field}>
                <label htmlFor="url" className={styles.label}>URL (optional)</label>
                <input id="url" name="url" type="url" className={styles.input} placeholder="https://github.com/..." />
              </div>

              <div className={styles.field}>
                <label htmlFor="role" className={styles.label}>Role (optional)</label>
                <input id="role" name="role" className={styles.input} placeholder="e.g. Lead developer, Solo developer" />
              </div>

              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>Notes (optional)</label>
                <input id="notes" name="notes" className={styles.input} placeholder="Internal notes (not exported)" />
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

              <div className={styles.field}>
                <label className={styles.label}>Skills</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Filter skills..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                />
                <div className={styles.skillPickerList}>
                  {skills
                    .filter((s) => s.name.toLowerCase().includes(skillFilter.toLowerCase()))
                    .map((skill) => (
                      <label key={skill.id} className={styles.skillPickerItem}>
                        <input
                          type="checkbox"
                          name="skillIds"
                          value={skill.id}
                        />
                        {skill.name}
                      </label>
                    ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => { setSaved(false); setSearchParams({}); }} className={styles.cancelButton}>
                  Close
                </button>
                <button type="submit" disabled={isSubmitting || saved} className={styles.submitButton}>
                  {saved ? "Added!" : isSubmitting ? "Adding..." : "Add Project"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Edit Project</h2>
            <Form method="post" className={styles.form} key={editProject.id}>
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="projectId" value={editProject.id} />

              <div className={styles.field}>
                <label htmlFor="edit-name" className={styles.label}>Name</label>
                <input id="edit-name" name="name" required className={styles.input} defaultValue={editProject.name} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-description" className={styles.label}>Description (optional)</label>
                <input id="edit-description" name="description" className={styles.input} defaultValue={editProject.description ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-url" className={styles.label}>URL (optional)</label>
                <input id="edit-url" name="url" type="url" className={styles.input} defaultValue={editProject.url ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-role" className={styles.label}>Role (optional)</label>
                <input id="edit-role" name="role" className={styles.input} defaultValue={editProject.role ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-notes" className={styles.label}>Notes (optional)</label>
                <input id="edit-notes" name="notes" className={styles.input} defaultValue={editProject.notes ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-status" className={styles.label}>Status</label>
                <select id="edit-status" name="status" className={styles.select} defaultValue={editProject.status}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-priority" className={styles.label}>Priority</label>
                <select id="edit-priority" name="priority" className={styles.select} defaultValue={editProject.priority}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-featured" className={styles.label}>
                  <input id="edit-featured" name="featured" type="checkbox" defaultChecked={editProject.featured} /> Featured
                </label>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-visibility" className={styles.label}>Visibility</label>
                <select id="edit-visibility" name="visibility" className={styles.select} defaultValue={editProject.visibility}>
                  {VISIBILITY_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Skills</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Filter skills..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                />
                <div className={styles.skillPickerList}>
                  {skills
                    .filter((s) => s.name.toLowerCase().includes(skillFilter.toLowerCase()))
                    .map((skill) => (
                      <label key={skill.id} className={styles.skillPickerItem}>
                        <input
                          type="checkbox"
                          name="skillIds"
                          value={skill.id}
                          defaultChecked={editProject.skillIds.includes(skill.id)}
                        />
                        {skill.name}
                      </label>
                    ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => { setSaved(false); setSearchParams({}); }} className={styles.cancelButton}>
                  Close
                </button>
                <button type="submit" disabled={isSubmitting || saved} className={styles.submitButton}>
                  {saved ? "Saved!" : isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
