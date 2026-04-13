import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

interface Domain {
  id: string;
  slug: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  categories: Category[];
}

export const meta: MetaFunction = () => [{ title: "Domains — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const data = await api<{ domains: Domain[] }>("/profile/domains", { token });
  return json({ domains: data.domains });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "add-domain") {
      await api("/profile/domains", {
        method: "POST",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
        },
      });
      return json({ ok: true });
    }

    if (intent === "add-category") {
      const domainId = String(form.get("domainId"));
      await api(`/profile/domains/${domainId}/categories`, {
        method: "POST",
        token,
        body: {
          name: String(form.get("name")),
          description: String(form.get("description") ?? "") || undefined,
        },
      });
      return json({ ok: true });
    }

    if (intent === "delete-domain") {
      const domainId = String(form.get("domainId"));
      await api(`/profile/domains/${domainId}`, {
        method: "DELETE",
        token,
      });
      return json({ ok: true });
    }

    if (intent === "delete-category") {
      const domainId = String(form.get("domainId"));
      const categoryId = String(form.get("categoryId"));
      await api(`/profile/domains/${domainId}/categories/${categoryId}`, {
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

export default function DomainsPage() {
  const { domains } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdd = searchParams.get("add") === "true";
  const addCatDomainId = searchParams.get("addCat");
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Domains</h1>
        <button className={styles.addButton} onClick={() => setSearchParams({ add: "true" })}>
          Add Domain
        </button>
      </div>

      {actionData && "error" in actionData && (
        <div className={styles.error}>{actionData.error}</div>
      )}

      {domains.length === 0 ? (
        <p className={styles.emptyState}>No domains yet. Add a domain to organize your skills and interests.</p>
      ) : (
        <div className={styles.cardGrid}>
          {domains.map((domain) => (
            <div key={domain.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>
                  {domain.name}
                  {domain.isBuiltIn && <span className={styles.cardMeta}> (built-in)</span>}
                </span>
                {!domain.isBuiltIn && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-domain" />
                    <input type="hidden" name="domainId" value={domain.id} />
                    <button type="submit" className={styles.deleteButton}>Remove</button>
                  </Form>
                )}
              </div>

              {domain.description && (
                <div className={styles.cardDescription}>{domain.description}</div>
              )}

              <div className={styles.chipGrid}>
                {domain.categories.map((cat) => (
                  <span className={styles.chip} key={cat.id}>
                    {cat.name}
                    {!domain.isBuiltIn && (
                      <Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="intent" value="delete-category" />
                        <input type="hidden" name="domainId" value={domain.id} />
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <button type="submit" className={styles.chipAction}>x</button>
                      </Form>
                    )}
                  </span>
                ))}
              </div>

              <button
                className={styles.editButton}
                onClick={() => setSearchParams({ addCat: domain.id })}
                style={{ marginTop: "var(--space-sm)" }}
              >
                Add Category
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Domain modal */}
      {showAdd && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Domain</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add-domain" />

              <div className={styles.field}>
                <label htmlFor="domain-name" className={styles.label}>Name</label>
                <input id="domain-name" name="name" required className={styles.input} />
              </div>

              <div className={styles.field}>
                <label htmlFor="domain-description" className={styles.label}>Description (optional)</label>
                <input id="domain-description" name="description" className={styles.input} />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setSearchParams({})} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? "Adding..." : "Add Domain"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Add Category modal */}
      {addCatDomainId && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              Add Category to {domains.find((d) => d.id === addCatDomainId)?.name ?? "Domain"}
            </h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="add-category" />
              <input type="hidden" name="domainId" value={addCatDomainId} />

              <div className={styles.field}>
                <label htmlFor="cat-name" className={styles.label}>Name</label>
                <input id="cat-name" name="name" required className={styles.input} />
              </div>

              <div className={styles.field}>
                <label htmlFor="cat-description" className={styles.label}>Description (optional)</label>
                <input id="cat-description" name="description" className={styles.input} />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setSearchParams({})} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? "Adding..." : "Add Category"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
