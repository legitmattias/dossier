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
}

interface Domain {
  id: string;
  name: string;
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
  const isSubmitting = navigation.state === "submitting";

  const domainMap = new Map(domains.map((d) => [d.id, d.name]));

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

      {interests.length === 0 ? (
        <p className={styles.emptyState}>No interests yet. Track topics you're curious about.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Interest</th><th>Domain</th><th>Description</th><th></th></tr>
          </thead>
          <tbody>
            {interests.map((interest) => (
              <tr key={interest.id}>
                <td>{interest.name}</td>
                <td className={styles.categoryName}>{domainMap.get(interest.domainId) ?? "—"}</td>
                <td className={styles.categoryName}>{interest.description ?? "—"}</td>
                <td className={styles.actions}>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="interestId" value={interest.id} />
                    <button type="submit" className={styles.deleteButton}>Remove</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAdd && (
        <div className={styles.modal} onClick={() => setSearchParams({})}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Interest</h2>
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
                <label htmlFor="description" className={styles.label}>Description (optional)</label>
                <input id="description" name="description" className={styles.input} />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setSearchParams({})} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? "Adding..." : "Add Interest"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
