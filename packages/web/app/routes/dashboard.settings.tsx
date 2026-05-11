import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";

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
  maxVisibility: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiVersion {
  version: string;
  commitSha: string;
  builtAt: string;
  api: string;
}

interface FeedbackStatus {
  enabled: boolean;
}

export const meta: MetaFunction = () => [{ title: "Settings — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const [{ user }, { keys }, exportClaude, profileData, apiVersion, feedbackStatus] = await Promise.all([
    api<{ user: { id: string; username: string; email: string; isAdmin?: boolean; feedbackOptIn?: boolean } }>("/auth/me", { token }),
    api<{ keys: ApiKey[] }>("/auth/api-keys", { token }),
    api<string>("/profile/export?format=llm-md", { token }),
    api<Profile>("/profile", { token }).catch(() => ({} as Profile)),
    api<ApiVersion>("/version").catch(() => null),
    api<FeedbackStatus>("/feedback/status").catch(() => ({ enabled: false } as FeedbackStatus)),
  ]);
  return json({ user, keys, exportPreview: exportClaude, profile: profileData, apiVersion, feedbackStatus });
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
      const maxVisibility = form.get("maxVisibility") === "public" ? "public" : null;
      if (!name) return json({ error: "Name is required" }, { status: 400 });

      const result = await api<{ id: string; name: string; key: string; prefix: string; scopes: string }>(
        "/auth/api-keys",
        { method: "POST", token, body: { name, scopes, maxVisibility } },
      );
      return json({ newKey: result.key, keyName: result.name });
    }

    if (intent === "revoke-key") {
      const keyId = String(form.get("keyId"));
      await api(`/auth/api-keys/${keyId}`, { method: "DELETE", token });
      return json({ revoked: true });
    }

    if (intent === "set-feedback-opt-in") {
      const optIn = form.get("feedbackOptIn") === "on";
      await api("/auth/me", {
        method: "PATCH",
        token,
        body: { feedbackOptIn: optIn },
      });
      return json({ feedbackOptInSaved: true, feedbackOptIn: optIn });
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
  const { user, keys, exportPreview, profile, apiVersion, feedbackStatus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyDismissed, setKeyDismissed] = useState(false);

  // Reset dismissed state when new key is generated
  useEffect(() => {
    if (actionData && "newKey" in actionData) {
      setKeyDismissed(false);
      setKeyCopied(false);
    }
  }, [actionData]);

  return (
    <div>
      <h1 className={styles.title}>Settings</h1>

      {/* Profile */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Profile</h2>

        {actionData && "profileSaved" in actionData && (
          <div className={styles.successBanner}>
            Profile updated successfully.
          </div>
        )}

        <Form method="post" className={styles.form}>
          <input type="hidden" name="intent" value="update-profile" />

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label} title="Exported in your profile — visible to AI tools and public profiles">Bio</label>
            <textarea
              id="bio"
              name="bio"
              className={styles.input}
              rows={6}
              defaultValue={profile.bio ?? ""}
              placeholder="A short bio about yourself"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="preferredLanguage" className={styles.label} title="Language AI tools should respond in">Preferred Language</label>
            <input
              id="preferredLanguage"
              name="preferredLanguage"
              className={styles.input}
              defaultValue={profile.preferredLanguage ?? ""}
              placeholder="e.g. English, Swedish"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="customInstructions" className={styles.label} title="Instructions included in your exported profile for AI tools to follow">Custom Instructions</label>
            <textarea
              id="customInstructions"
              name="customInstructions"
              className={styles.input}
              rows={8}
              defaultValue={profile.customInstructions ?? ""}
              placeholder="Instructions for AI tools using your profile"
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
        <div className={styles.accountRow}>
          <span className={styles.accountLabel}>Username</span>
          <span className={styles.accountValue}>@{user.username}</span>
        </div>
        <div className={styles.accountRow}>
          <span className={styles.accountLabel}>Email</span>
          <span className={styles.accountValue}>{user.email}</span>
        </div>
        <div className={styles.accountRow}>
          <span className={styles.accountLabel}>Public Profile</span>
          <span className={styles.accountValue}>/u/{user.username}</span>
        </div>
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
        {actionData && "newKey" in actionData && !keyDismissed && (
          <div className={settingsStyles.newKeyBanner}>
            <p><strong>New API key created: {actionData.keyName}</strong></p>
            <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
              <code className={settingsStyles.keyValue} style={{ flex: 1 }}>{actionData.newKey}</code>
              <button
                type="button"
                title="Copy to clipboard"
                onClick={() => {
                  navigator.clipboard.writeText(actionData.newKey as string);
                  setKeyCopied(true);
                  setTimeout(() => setKeyCopied(false), 2000);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
              >
                {keyCopied ? "\u2713" : "\u2398"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-sm)" }}>
              <p className={settingsStyles.keyWarning} style={{ margin: 0 }}>
                Copy this key now — it won't be shown again.
              </p>
              <button
                type="button"
                onClick={() => setKeyDismissed(true)}
                className={styles.submitButton}
                style={{ fontSize: "0.8rem", padding: "var(--space-xs) var(--space-md)" }}
              >
                Done
              </button>
            </div>
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
                placeholder="e.g. my-integration, chatbot"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="scopes" className={styles.label} title="Read keys can query your profile. Write keys can also add/update/remove entities.">Scopes</label>
              <select id="scopes" name="scopes" className={styles.select}>
                <option value="read">Read only</option>
                <option value="read,write">Read & Write</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="maxVisibility" className={styles.label} title="Filter reads as if anonymous. Useful for portfolio bots — the key authenticates as you, but only sees the public slice of your profile.">Visibility cap</label>
              <select id="maxVisibility" name="maxVisibility" className={styles.select} defaultValue="">
                <option value="">No cap — sees everything the owner sees</option>
                <option value="public">Public only — reads filtered as if anonymous</option>
              </select>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "var(--space-xs)" }}>
                With the cap on, private entities, domain-private cascades, <code>notes</code>, and per-field <code>privateFields</code> overrides are all stripped from this key's reads.
              </p>
            </div>
            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? "Generating..." : "Generate"}
            </button>
          </Form>
        )}

        {keys.length === 0 ? (
          <p className={styles.emptyState}>No API keys. Generate one to allow external services to access your profile.</p>
        ) : (
          <div className={styles.cardGrid}>
            {keys.map((key) => (
              <div className={styles.card} key={key.id}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{key.name}</span>
                  <Form method="post">
                    <input type="hidden" name="intent" value="revoke-key" />
                    <input type="hidden" name="keyId" value={key.id} />
                    <button type="submit" className={styles.deleteButton}>Revoke</button>
                  </Form>
                </div>
                <div className={styles.cardMeta}>
                  <code style={{ fontFamily: "var(--font-mono)" }}>{key.prefix}...</code>
                </div>
                <div className={styles.cardBadges}>
                  <span className={styles.proficiency} data-level="familiar">{key.scopes}</span>
                  {key.maxVisibility === "public" && (
                    <span
                      className={styles.proficiency}
                      data-level="novice"
                      title="This key sees only the public slice of your profile"
                    >
                      🔒 public-only
                    </span>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"} | Created: {new Date(key.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback opt-in */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Feedback &amp; Telemetry</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.55, marginBottom: "var(--space-md)", maxWidth: 640 }}>
          This Dossier instance {feedbackStatus.enabled
            ? <>is <strong>accepting</strong> feedback submissions. Below you can choose whether to participate.</>
            : <>is <strong>not</strong> accepting feedback — the operator has feedback disabled on this deployment.</>
          }
        </p>
        {feedbackStatus.enabled && (
          <>
            {actionData && "feedbackOptInSaved" in actionData && (
              <div className={styles.successBanner}>
                Feedback preference saved.
              </div>
            )}
            <Form method="post" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <input type="hidden" name="intent" value="set-feedback-opt-in" />
              <label style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" name="feedbackOptIn" defaultChecked={user.feedbackOptIn ?? false} style={{ marginTop: 4 }} />
                <span style={{ fontSize: "0.9375rem", lineHeight: 1.55 }}>
                  <strong>Allow AI agents acting on my behalf to submit feedback to this instance&apos;s operator.</strong>
                  <br />
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                    When enabled, AI sessions using the Dossier MCP can submit feedback messages describing friction, bugs, or suggestions encountered during use. The operator of this Dossier instance can read the full text of these messages and may forward them to GitHub Issues. The tool description instructs agents not to include personal profile data (skill names, goal contents, notes), but this is trust-based — only enable this if you trust both the AI and the operator. You can revoke consent at any time.
                  </span>
                </span>
              </label>
              <button type="submit" disabled={isSubmitting} className={styles.submitButton} style={{ alignSelf: "flex-start" }}>
                {isSubmitting ? "Saving..." : "Save preference"}
              </button>
            </Form>
          </>
        )}
      </div>

      {/* Version */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Version</h2>
        <div className={settingsStyles.versionGrid}>
          <span className={settingsStyles.versionLabel}>Web</span>
          <span className={settingsStyles.versionValue}>
            v{__DOSSIER_VERSION__}
            {__DOSSIER_SHA__ !== "dev" && ` · ${__DOSSIER_SHA__.slice(0, 7)}`}
          </span>
          <span />

          <span className={settingsStyles.versionLabel}>API</span>
          <span className={settingsStyles.versionValue}>
            {apiVersion
              ? `v${apiVersion.version}${apiVersion.commitSha !== "dev" ? ` · ${apiVersion.commitSha.slice(0, 7)}` : ""}`
              : "unreachable"}
          </span>
          {apiVersion && (
            <span
              className={
                apiVersion.version === __DOSSIER_VERSION__ && apiVersion.commitSha === __DOSSIER_SHA__
                  ? settingsStyles.versionMatch
                  : settingsStyles.versionMismatch
              }
            >
              {apiVersion.version === __DOSSIER_VERSION__ && apiVersion.commitSha === __DOSSIER_SHA__
                ? "In sync"
                : "Mismatch"}
            </span>
          )}
        </div>
      </div>

      {/* Export Preview */}
      <div className={styles.domainGroup}>
        <h2 className={styles.domainName}>Export Preview (LLM context markdown)</h2>
        <pre className={styles.exportPreview}>
          {exportPreview}
        </pre>
      </div>
    </div>
  );
}
