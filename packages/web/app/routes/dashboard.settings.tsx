import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { api } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";

export const meta: MetaFunction = () => [{ title: "Settings — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const { user } = await api<{ user: { id: string; username: string; email: string } }>("/auth/me", { token });
  const exportClaude = await api<string>("/profile/export?format=claude", { token });
  return json({ user, exportPreview: exportClaude });
}

export default function SettingsPage() {
  const { user, exportPreview } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className={styles.title}>Settings</h1>

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
