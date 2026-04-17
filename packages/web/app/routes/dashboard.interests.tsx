import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

interface Interest {
  id: string;
  name: string;
  domainId: string;
  description?: string;
  notes?: string;
  visibility?: string;
  featured?: boolean;
  updatedAt?: string;
  createdAt: string;
}

interface Domain {
  id: string;
  name: string;
  visibility?: string;
}

export const meta: MetaFunction = () => [{ title: "Interests — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [interestsData, domainsData] = await Promise.all([
    api<{ interests: Interest[] }>("/profile/interests", { token }),
    api<{ domains: Domain[] }>("/profile/domains", { token }),
  ]);
  return json({ interests: interestsData.interests, domains: domainsData.domains });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "add") {
      await api("/profile/interests", {
        method: "POST",
        token,
        body: {
          name: String(form.get("name")),
          domainId: String(form.get("domainId")),
          description: String(form.get("description") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          visibility: form.get("visibility") as string || "public",
          featured: form.get("featured") === "on",
        },
      });
      return json({ ok: true });
    }

    if (intent === "update") {
      await api(`/profile/interests/${form.get("interestId")}`, {
        method: "PUT",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          visibility: String(form.get("visibility") ?? "public"),
          featured: form.get("featured") === "on",
        },
      });
      return json({ ok: true });
    }

    if (intent === "delete") {
      await api(`/profile/interests/${form.get("interestId")}`, {
        method: "DELETE",
        token,
      });
      return json({ ok: true });
    }

    if (intent === "promote") {
      await api(`/profile/interests/${form.get("interestId")}/promote`, {
        method: "POST",
        token,
        body: {},
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

export default function InterestsPage() {
  const { interests, domains } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const editInterest = interests.find((i) => i.id === searchParams.get("edit"));
  const isSubmitting = navigation.state !== "idle";
  const [saved, setSaved] = useState(false);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    if (navigation.state === "idle" && actionData && "ok" in actionData) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, actionData]);

  const domainMap = new Map(domains.map((d) => [d.id, d]));

  const filteredInterests = interests.filter((i) => {
    if (filterDomain && i.domainId !== filterDomain) return false;
    if (filterFeatured === "yes" && !i.featured) return false;
    if (filterFeatured === "no" && i.featured) return false;
    if (filterSearch && !i.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const sortedInterests = [...filteredInterests].sort((a, b) => {
    if (sortBy === "added") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "updated") {
      const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
      const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
      return bUpdated - aUpdated;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Interests</h1>
        <button className={styles.addButton} onClick={() => setSearchParams({ add: "true" })}>
          Add Interest
        </button>
      </div>

      {actionData && "error" in actionData && (
        <div className={styles.error}>{actionData.error}</div>
      )}

      {interests.length > 0 && (
        <div className={styles.filterBar}>
          <input type="text" className={styles.filterSearch} placeholder="Search interests..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          <select className={styles.filterSelect} value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}>
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
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
          {(filterDomain || filterFeatured || filterSearch) && (
            <button className={styles.filterClear} onClick={() => { setFilterDomain(""); setFilterFeatured(""); setFilterSearch(""); }}>Clear filters</button>
          )}
        </div>
      )}

      {interests.length === 0 ? (
        <p className={styles.emptyState}>No interests yet. Track topics you're curious about.</p>
      ) : sortedInterests.length === 0 ? (
        <p className={styles.emptyState}>No interests match your filters.</p>
      ) : (
        <div className={styles.cardGrid}>
          {sortedInterests.map((interest) => (
            <div key={interest.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{interest.name}</span>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="promote" />
                    <input type="hidden" name="interestId" value={interest.id} />
                    <button type="submit" className={styles.editButton}>Promote to Goal</button>
                  </Form>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => setSearchParams({ edit: interest.id })}
                  >
                    Edit
                  </button>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="interestId" value={interest.id} />
                    <button type="submit" className={styles.deleteButton}>Remove</button>
                  </Form>
                </div>
              </div>
              {interest.domainId && <div className={styles.cardMeta}>{domainMap.get(interest.domainId)?.name ?? "—"}</div>}
              <div className={styles.cardBadges}>
                {interest.featured && <span className={styles.featuredBadge}>Featured</span>}
                {interest.visibility === "private" && (
                  <span className={styles.proficiency} data-level="private">private</span>
                )}
                {interest.domainId && domainMap.get(interest.domainId)?.visibility === "private" && (
                  <span className={styles.proficiency} data-level="private" title="This domain is set to private — hidden from exports">hidden by domain</span>
                )}
              </div>
              {interest.description && <div className={styles.cardDescription}>{interest.description}</div>}
              {interest.notes && <div className={styles.cardNotes}>{interest.notes}</div>}
              <div className={styles.cardMeta} style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)' }}>
                Added {new Date(interest.createdAt).toLocaleDateString()}
                {interest.updatedAt && new Date(interest.updatedAt).getTime() - new Date(interest.createdAt).getTime() > 60000 && (
                  <> · Updated {new Date(interest.updatedAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Add Interest</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add" />

              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input id="name" name="name" required className={styles.input} placeholder="e.g. WebAssembly, Modal Jazz" />
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
                <label htmlFor="description" className={styles.label}>Description (optional)</label>
                <input id="description" name="description" className={styles.input} placeholder="Why are you interested in this?" />
              </div>

              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>Notes (optional)</label>
                <textarea id="notes" name="notes" className={styles.input} rows={2} placeholder="Internal notes (not exported)" />
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
                  {saved ? "Added!" : isSubmitting ? "Adding..." : "Add Interest"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {editInterest && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Edit Interest</h2>
            <Form method="post" className={styles.form} key={editInterest.id}>
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="interestId" value={editInterest.id} />

              <div className={styles.field}>
                <label htmlFor="edit-name" className={styles.label}>Name</label>
                <input id="edit-name" name="name" required className={styles.input} defaultValue={editInterest.name} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-description" className={styles.label}>Description (optional)</label>
                <input id="edit-description" name="description" className={styles.input} defaultValue={editInterest.description ?? ""} />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-notes" className={styles.label}>Notes (optional)</label>
                <textarea id="edit-notes" name="notes" className={styles.input} rows={2} defaultValue={editInterest.notes ?? ""} placeholder="Internal notes (not exported)" />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <input type="checkbox" name="featured" defaultChecked={editInterest.featured} /> Featured
                </label>
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-visibility" className={styles.label}>Visibility</label>
                <select id="edit-visibility" name="visibility" className={styles.select} defaultValue={editInterest.visibility ?? "public"}>
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
    </div>
  );
}
