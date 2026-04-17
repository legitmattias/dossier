import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

interface Skill {
  id: string;
  name: string;
  description?: string;
  proficiency: string;
  proficiencyLabel?: string;
  domainId: string;
  categoryId: string;
  notes?: string;
  visibility?: string;
  featured?: boolean;
  updatedAt: string;
}

interface Domain {
  id: string;
  name: string;
  slug: string;
  visibility?: string;
  proficiencyLabels?: Record<string, string>;
  categories: Array<{ id: string; name: string; slug: string }>;
}

export const meta: MetaFunction = () => [{ title: "Skills — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [skillsData, domainsData, projectsData] = await Promise.all([
    api<{ skills: Skill[] }>("/profile/skills", { token }),
    api<{ domains: Domain[] }>("/profile/domains", { token }),
    api<{ projects: Array<{ id: string; name: string; skillIds: string[] }> }>("/profile/projects", { token }),
  ]);
  return json({
    skills: skillsData.skills,
    domains: domainsData.domains,
    projects: projectsData.projects,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "add") {
      await api("/profile/skills", {
        method: "POST",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
          domainId: String(form.get("domainId")),
          categoryId: String(form.get("categoryId")),
          proficiency: String(form.get("proficiency")),
          proficiencyLabel: String(form.get("proficiencyLabel") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          visibility: form.get("visibility") as string || "public",
          featured: form.get("featured") === "on",
        },
      });
      return json({ ok: true });
    }

    if (intent === "update") {
      await api(`/profile/skills/${form.get("skillId")}`, {
        method: "PUT",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
          domainId: String(form.get("domainId")),
          categoryId: String(form.get("categoryId")),
          proficiency: String(form.get("proficiency")),
          proficiencyLabel: String(form.get("proficiencyLabel") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          visibility: String(form.get("visibility") ?? "public"),
          featured: form.get("featured") === "on",
        },
      });
      return json({ ok: true });
    }

    if (intent === "delete") {
      await api(`/profile/skills/${form.get("skillId")}`, {
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

const PROFICIENCY_LEVELS = ["novice", "familiar", "proficient", "advanced", "expert"] as const;

export default function SkillsPage() {
  const { skills, domains, projects } = useLoaderData<typeof loader>();

  const projectsBySkill = new Map<string, string[]>();
  for (const project of projects) {
    for (const skillId of project.skillIds ?? []) {
      const list = projectsBySkill.get(skillId) ?? [];
      list.push(project.name);
      projectsBySkill.set(skillId, list);
    }
  }
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const editSkillId = searchParams.get("edit");
  const editSkill = editSkillId ? skills.find((s) => s.id === editSkillId) : undefined;
  const isSubmitting = navigation.state !== "idle";
  const [saved, setSaved] = useState(false);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterProficiency, setFilterProficiency] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [addDomainId, setAddDomainId] = useState("");
  const [editDomainId, setEditDomainId] = useState(editSkill?.domainId ?? "");

  // Sync edit domain state when switching skills
  useEffect(() => {
    setEditDomainId(editSkill?.domainId ?? "");
  }, [editSkill?.id]);

  // Show "Saved!" confirmation briefly after successful save
  useEffect(() => {
    if (navigation.state === "idle" && actionData && "ok" in actionData) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, actionData]);

  // Filter skills based on active filters
  const filteredSkills = skills.filter((s) => {
    if (filterDomain && s.domainId !== filterDomain) return false;
    if (filterProficiency && s.proficiency !== filterProficiency) return false;
    if (filterFeatured === "yes" && !s.featured) return false;
    if (filterFeatured === "no" && s.featured) return false;
    if (filterSearch && !s.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  // Build domain/category lookup maps
  const domainMap = new Map(domains.map((d) => [d.id, d]));

  // Group skills by domain
  const skillsByDomain = new Map<string, Skill[]>();
  for (const skill of filteredSkills) {
    const list = skillsByDomain.get(skill.domainId) ?? [];
    list.push(skill);
    skillsByDomain.set(skill.domainId, list);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Skills</h1>
        <button
          className={styles.addButton}
          onClick={() => setSearchParams({ add: "true" })}
        >
          Add Skill
        </button>
      </div>

      {actionData && "error" in actionData && (
        <div className={styles.error}>{actionData.error}</div>
      )}

      {skills.length > 0 && (
        <div className={styles.filterBar}>
          <input
            type="text"
            className={styles.filterSearch}
            placeholder="Search skills..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
          >
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterProficiency}
            onChange={(e) => setFilterProficiency(e.target.value)}
          >
            <option value="">All levels</option>
            {PROFICIENCY_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value)}
          >
            <option value="">All</option>
            <option value="yes">Featured</option>
            <option value="no">Not featured</option>
          </select>
          {(filterDomain || filterProficiency || filterFeatured || filterSearch) && (
            <button
              className={styles.filterClear}
              onClick={() => { setFilterDomain(""); setFilterProficiency(""); setFilterFeatured(""); setFilterSearch(""); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {skills.length === 0 ? (
        <p className={styles.emptyState}>
          No skills yet. Add your first skill to get started.
        </p>
      ) : filteredSkills.length === 0 ? (
        <p className={styles.emptyState}>
          No skills match your filters.
        </p>
      ) : (
        [...skillsByDomain.entries()].map(([domainId, domainSkills]) => {
          const domain = domainMap.get(domainId);
          return (
            <div key={domainId} className={styles.domainGroup}>
              <h2 className={styles.domainName}>{domain?.name ?? domainId}</h2>
              <div className={styles.cardGrid}>
                  {domainSkills.map((skill) => {
                    const category = domain?.categories.find((c) => c.id === skill.categoryId);
                    return (
                      <div key={skill.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                          <span className={styles.cardName}>{skill.name}</span>
                          <div className={styles.cardActions} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                            <button
                              type="button"
                              className={styles.editButton}
                              onClick={() => setSearchParams({ edit: skill.id })}
                            >
                              Edit
                            </button>
                            <Form method="post">
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="skillId" value={skill.id} />
                              <button type="submit" className={styles.deleteButton}>Remove</button>
                            </Form>
                          </div>
                        </div>
                        {skill.description && <div className={styles.cardDescription}>{skill.description}</div>}
                        <div className={styles.cardBadges}>
                          {skill.featured && <span className={styles.featuredBadge}>Featured</span>}
                          <span className={styles.proficiency} data-level={skill.proficiency}>
                            {skill.proficiencyLabel ?? domain?.proficiencyLabels?.[skill.proficiency] ?? skill.proficiency}
                          </span>
                          <span className={styles.cardMeta}>{category?.name ?? "—"}</span>
                          {skill.visibility === "private" && (
                            <span className={styles.proficiency} data-level="private">private</span>
                          )}
                          {domain?.visibility === "private" && (
                            <span className={styles.proficiency} data-level="private" title="This domain is set to private — hidden from exports">hidden by domain</span>
                          )}
                        </div>
                        {skill.notes && <div className={styles.cardNotes}>{skill.notes}</div>}
                        {(projectsBySkill.get(skill.id) ?? []).length > 0 && (
                          <div className={styles.skillChips}>
                            {projectsBySkill.get(skill.id)!.map((name) => (
                              <span key={name} className={styles.skillChip}>{name}</span>
                            ))}
                          </div>
                        )}
                        <div className={styles.cardMeta} style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)' }}>
                          Updated {new Date(skill.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          );
        })
      )}

      {/* Edit Skill Modal */}
      {editSkill && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Edit Skill: {editSkill.name}</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="skillId" value={editSkill.id} />

              <div className={styles.field}>
                <label htmlFor="edit-name" className={styles.label}>Name</label>
                <input
                  id="edit-name"
                  name="name"
                  required
                  className={styles.input}
                  defaultValue={editSkill.name}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-description" className={styles.label}>Description (optional)</label>
                <input
                  id="edit-description"
                  name="description"
                  className={styles.input}
                  defaultValue={editSkill.description ?? ""}
                  placeholder="Brief description of this skill"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-domainId" className={styles.label}>Domain</label>
                <select id="edit-domainId" name="domainId" required className={styles.select} value={editDomainId} onChange={(e) => setEditDomainId(e.target.value)}>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-categoryId" className={styles.label}>Category</label>
                <select id="edit-categoryId" name="categoryId" required className={styles.select} defaultValue={editSkill.categoryId}>
                  {(domains.find((d) => d.id === editDomainId)?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-proficiency" className={styles.label}>Proficiency</label>
                <select
                  id="edit-proficiency"
                  name="proficiency"
                  required
                  className={styles.select}
                  defaultValue={editSkill.proficiency}
                >
                  {PROFICIENCY_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-proficiencyLabel" className={styles.label}>Custom proficiency label (optional)</label>
                <input
                  id="edit-proficiencyLabel"
                  name="proficiencyLabel"
                  className={styles.input}
                  defaultValue={editSkill.proficiencyLabel ?? ""}
                  placeholder="e.g. native, CEFR B2 — overrides domain default"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-notes" className={styles.label}>Notes (optional)</label>
                <input
                  id="edit-notes"
                  name="notes"
                  className={styles.input}
                  defaultValue={editSkill.notes ?? ""}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <input type="checkbox" name="featured" defaultChecked={editSkill.featured} /> Featured
                </label>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-visibility" className={styles.label}>Visibility</label>
                <select
                  id="edit-visibility"
                  name="visibility"
                  className={styles.select}
                  defaultValue={editSkill.visibility ?? "public"}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
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

      {/* Add Skill Modal */}
      {showAdd && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Add Skill</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add" />

              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input id="name" name="name" required className={styles.input} placeholder="e.g. TypeScript, React, Swedish" />
              </div>

              <div className={styles.field}>
                <label htmlFor="description" className={styles.label}>Description (optional)</label>
                <input id="description" name="description" className={styles.input} placeholder="Brief description of this skill" />
              </div>

              <div className={styles.field}>
                <label htmlFor="domainId" className={styles.label}>Domain</label>
                <select id="domainId" name="domainId" required className={styles.select} value={addDomainId} onChange={(e) => setAddDomainId(e.target.value)}>
                  <option value="">Select domain...</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="categoryId" className={styles.label}>Category</label>
                <select id="categoryId" name="categoryId" required className={styles.select}>
                  <option value="">Select category...</option>
                  {(domains.find((d) => d.id === addDomainId)?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="proficiency" className={styles.label}>Proficiency</label>
                <select id="proficiency" name="proficiency" required className={styles.select}>
                  {PROFICIENCY_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="proficiencyLabel" className={styles.label}>Custom proficiency label (optional)</label>
                <input id="proficiencyLabel" name="proficiencyLabel" className={styles.input} placeholder="e.g. native, CEFR B2 — overrides domain default" />
              </div>

              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>Notes (optional)</label>
                <input id="notes" name="notes" className={styles.input} placeholder="Personal notes about this skill" />
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
                <button type="button" onClick={() => { setSaved(false); setSearchParams({}); }} className={styles.cancelButton}>
                  Close
                </button>
                <button type="submit" disabled={isSubmitting || saved} className={styles.submitButton}>
                  {saved ? "Added!" : isSubmitting ? "Adding..." : "Add Skill"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
