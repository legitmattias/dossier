import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";
import settingsStyles from "~/styles/settings.module.css";

interface Profile {
  bio?: string;
  preferredLanguage?: string;
  customInstructions?: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export const meta: MetaFunction = () => [{ title: "Settings — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [{ user }, { keys }, exportClaude, profileData] = await Promise.all([
    api<{ user: { id: string; username: string; email: string } }>("/auth/me", { token }),
    api<{ keys: ApiKey[] }>("/auth/api-keys", { token }),
    api<string>("/profile/export?format=claude", { token }),
    api<Profile>("/profile", { token }).catch(() => ({} as Profile)),
  ]);
  return json({ user, keys, exportPreview: exportClaude, profile: profileData });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "update-profile") {
      await api("/profile", {
        method: "PATCH",
        token,
        body: {
          bio: String(form.get("bio") ?? "") || undefined,
          preferredLanguage: String(form.get("preferredLanguage") ?? "") || undefined,
          customInstructions: String(form.get("customInstructions") ?? "") || undefined,
        },
      });
      return json({ profileSaved: true });
    }

    if (intent === "create-key") {
      const name = String(form.get("name"));
      const scopes = String(form.get("scopes") || "read");
      if (!name) return json({ error: "Name is required" }, { status: 400 });

      const result = await api<{ id: string; name: string; key: string; prefix: string; scopes: string }>(
        "/auth/api-keys",
        { method: "POST", token, body: { name, scopes } },
      );
      return json({ newKey: result.key, keyName: result.name });
    }

    if (intent === "revoke-key") {
      const keyId = String(form.get("keyId"));
      await api(`/auth/api-keys/${keyId}`, { method: "DELETE", token });
      return json({ revoked: true });
    }

    return json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}

export default function SettingsPage() {
  const { user, keys, exportPreview, profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div>
      <h1 className={styles.title}>Settings</h1>

      {/* Profile */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Profile</h2>

        {actionData && "profileSaved" in actionData && (
          <div style={{
            padding: "var(--space-sm) var(--space-md)",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "var(--radius-md)",
            color: "#16a34a",
            fontSize: "0.875rem",
            marginBottom: "var(--space-md)",
          }}>
            Profile updated successfully.
          </div>
        )}

        <Form method="post" className={styles.form}>
          <input type="hidden" name="intent" value="update-profile" />

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>Bio</label>
            <textarea
              id="bio"
              name="bio"
              className={styles.input}
              rows={3}
              defaultValue={profile.bio ?? ""}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="preferredLanguage" className={styles.label}>Preferred Language</label>
            <input
              id="preferredLanguage"
              name="preferredLanguage"
              className={styles.input}
              defaultValue={profile.preferredLanguage ?? ""}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="customInstructions" className={styles.label}>Custom Instructions</label>
            <textarea
              id="customInstructions"
              name="customInstructions"
              className={styles.input}
              rows={4}
              defaultValue={profile.customInstructions ?? ""}
            />
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </Form>
      </div>

      {/* Account */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Account</h2>
        <table className={styles.table}>
          <tbody>
            <tr><td>Username</td><td>@{user.username}</td></tr>
            <tr><td>Email</td><td>{user.email}</td></tr>
            <tr><td>Public Profile</td><td>/u/{user.username}</td></tr>
          </tbody>
        </table>
      </div>

      {/* API Keys */}
      <div className={styles.domainGroup}>
        <div className={styles.header}>
          <h2 className={styles.domainName}>API Keys</h2>
          <button
            className={styles.addButton}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "Generate Key"}
          </button>
        </div>

        {actionData && "error" in actionData && (
          <div className={styles.error}>{actionData.error}</div>
        )}

        {/* New key banner — shown once after creation */}
        {actionData && "newKey" in actionData && (
          <div className={settingsStyles.newKeyBanner}>
            <p><strong>New API key created: {actionData.keyName}</strong></p>
            <code className={settingsStyles.keyValue}>{actionData.newKey}</code>
            <p className={settingsStyles.keyWarning}>
              Copy this key now — it won't be shown again.
            </p>
          </div>
        )}

        {showCreateForm && (
          <Form method="post" className={settingsStyles.createForm}>
            <input type="hidden" name="intent" value="create-key" />
            <div className={styles.field}>
              <label htmlFor="keyName" className={styles.label}>Key Name</label>
              <input
                id="keyName"
                name="name"
                required
                placeholder="e.g. jobhaul, curios-chat"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="scopes" className={styles.label}>Scopes</label>
              <select id="scopes" name="scopes" className={styles.select}>
                <option value="read">Read only</option>
                <option value="read,write">Read & Write</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? "Generating..." : "Generate"}
            </button>
          </Form>
        )}

        {keys.length === 0 ? (
          <p className={styles.emptyState}>No API keys. Generate one to allow external services to access your profile.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Scopes</th>
                <th>Last Used</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td><code>{key.prefix}...</code></td>
                  <td>{key.scopes}</td>
                  <td className={styles.categoryName}>
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className={styles.categoryName}>
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Form method="post">
                      <input type="hidden" name="intent" value="revoke-key" />
                      <input type="hidden" name="keyId" value={key.id} />
                      <button type="submit" className={styles.deleteButton}>Revoke</button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Export Preview */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Export Preview (Claude format)</h2>
        <pre style={{
          padding: "var(--space-md)",
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.8125rem",
          lineHeight: 1.6,
          overflow: "auto",
          maxHeight: "400px",
          whiteSpace: "pre-wrap",
        }}>
          {exportPreview}
        </pre>
      </div>
    </div>
  );
}
