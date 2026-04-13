import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

interface Skill {
  id: string;
  name: string;
  proficiency: string;
  domainId: string;
  categoryId: string;
  notes?: string;
  visibility?: string;
}

interface Domain {
  id: string;
  name: string;
  slug: string;
  categories: Array<{ id: string; name: string; slug: string }>;
}

export const meta: MetaFunction = () => [{ title: "Skills — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [skillsData, domainsData] = await Promise.all([
    api<{ skills: Skill[] }>("/profile/skills", { token }),
    api<{ domains: Domain[] }>("/profile/domains", { token }),
  ]);
  return json({
    skills: skillsData.skills,
    domains: domainsData.domains,
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
          domainId: String(form.get("domainId")),
          categoryId: String(form.get("categoryId")),
          proficiency: String(form.get("proficiency")),
          notes: String(form.get("notes") ?? "") || undefined,
          visibility: form.get("visibility") as string || "public",
        },
      });
      return json({ ok: true });
    }

    if (intent === "update") {
      await api(`/profile/skills/${form.get("skillId")}`, {
        method: "PUT",
        token,
        body: {
          proficiency: String(form.get("proficiency")),
          notes: String(form.get("notes") ?? "") || undefined,
          visibility: String(form.get("visibility") ?? "public"),
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
  const { skills, domains } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const editSkillId = searchParams.get("edit");
  const editSkill = editSkillId ? skills.find((s) => s.id === editSkillId) : undefined;
  const isSubmitting = navigation.state === "submitting";

  // Build domain/category lookup maps
  const domainMap = new Map(domains.map((d) => [d.id, d]));

  // Group skills by domain
  const skillsByDomain = new Map<string, Skill[]>();
  for (const skill of skills) {
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

      {skills.length === 0 ? (
        <p className={styles.emptyState}>
          No skills yet. Add your first skill to get started.
        </p>
      ) : (
        [...skillsByDomain.entries()].map(([domainId, domainSkills]) => {
          const domain = domainMap.get(domainId);
          return (
            <div key={domainId} className={styles.domainGroup}>
              <h2 className={styles.domainName}>{domain?.name ?? domainId}</h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Proficiency</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th>Visibility</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {domainSkills.map((skill) => {
                    const category = domain?.categories.find((c) => c.id === skill.categoryId);
                    return (
                      <tr key={skill.id}>
                        <td>{skill.name}</td>
                        <td>
                          <span className={styles.proficiency} data-level={skill.proficiency}>
                            {skill.proficiency}
                          </span>
                        </td>
                        <td className={styles.categoryName}>{category?.name ?? "—"}</td>
                        <td className={styles.categoryName}>{skill.notes ?? "—"}</td>
                        <td>
                          {skill.visibility === "private" && (
                            <span className={styles.proficiency} data-level="private">private</span>
                          )}
                        </td>
                        <td className={styles.actions}>
                          <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={() => setSearchParams({ edit: skill.id })}
                          >
                            Edit
                          </button>
                          <Form method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="skillId" value={skill.id} />
                            <button type="submit" className={styles.deleteButton}>Remove</button>
                          </Form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      )}

      {/* Edit Skill Modal */}
      {editSkill && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Skill: {editSkill.name}</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="skillId" value={editSkill.id} />

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
                <label htmlFor="edit-notes" className={styles.label}>Notes (optional)</label>
                <input
                  id="edit-notes"
                  name="notes"
                  className={styles.input}
                  defaultValue={editSkill.notes ?? ""}
                />
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

      {/* Add Skill Modal */}
      {showAdd && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Skill</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add" />

              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input id="name" name="name" required className={styles.input} />
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
                <label htmlFor="categoryId" className={styles.label}>Category</label>
                <select id="categoryId" name="categoryId" required className={styles.select}>
                  <option value="">Select category...</option>
                  {domains.flatMap((d) =>
                    d.categories.map((c) => (
                      <option key={c.id} value={c.id}>{d.name} &gt; {c.name}</option>
                    ))
                  )}
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
                <label htmlFor="notes" className={styles.label}>Notes (optional)</label>
                <input id="notes" name="notes" className={styles.input} />
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
                  {isSubmitting ? "Adding..." : "Add Skill"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
