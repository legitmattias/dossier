import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/skills.module.css";
import feedbackStyles from "~/styles/feedback.module.css";

interface FeedbackItem {
  id: string;
  category: string;
  severity: string;
  message: string;
  reproduction: string | null;
  reporterUserId: string | null;
  clientName: string | null;
  clientVersion: string | null;
  clientSha: string | null;
  status: string;
  resolvedNote: string | null;
  githubIssueUrl: string | null;
  githubIssueNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_ORDER = ["new", "triaged", "resolved", "wontfix"] as const;

export const meta: MetaFunction = () => [{ title: "Feedback — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const { feedback } = await api<{ feedback: FeedbackItem[] }>(`/feedback${query}`, { token });
  return json({ feedback, currentStatus: status });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const id = String(form.get("id"));

  try {
    if (intent === "update-status") {
      await api(`/feedback/${id}`, {
        method: "PATCH",
        token,
        body: {
          status: String(form.get("status")),
          resolvedNote: String(form.get("resolvedNote") ?? "") || undefined,
        },
      });
      return json({ ok: true });
    }
    if (intent === "forward") {
      const result = await api<{ githubIssueUrl?: string; error?: string }>(`/feedback/${id}/forward`, {
        method: "POST",
        token,
      });
      return json({ forwarded: true, githubIssueUrl: result.githubIssueUrl });
    }
    return json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}

export default function FeedbackPage() {
  const { feedback, currentStatus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [, setParams] = useSearchParams();

  const grouped = new Map<string, FeedbackItem[]>();
  for (const status of STATUS_ORDER) grouped.set(status, []);
  for (const f of feedback) {
    const list = grouped.get(f.status) ?? [];
    list.push(f);
    grouped.set(f.status, list);
  }

  return (
    <div>
      <h1 className={styles.title}>Feedback</h1>
      <p className={feedbackStyles.subtitle}>
        AI-submitted observations, friction reports, and suggestions. Triage here, or forward concrete issues to GitHub.
      </p>

      <div className={feedbackStyles.filterBar}>
        <button
          className={currentStatus === "" ? feedbackStyles.filterActive : feedbackStyles.filter}
          onClick={() => setParams({})}
        >
          All ({feedback.length})
        </button>
        {STATUS_ORDER.map((status) => {
          const count = grouped.get(status)?.length ?? 0;
          return (
            <button
              key={status}
              className={currentStatus === status ? feedbackStyles.filterActive : feedbackStyles.filter}
              onClick={() => setParams({ status })}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {actionData && "error" in actionData && (
        <div className={styles.error}>{actionData.error}</div>
      )}
      {actionData && "forwarded" in actionData && actionData.githubIssueUrl && (
        <div className={styles.successBanner}>
          Forwarded to GitHub: <a href={actionData.githubIssueUrl} target="_blank" rel="noreferrer">{actionData.githubIssueUrl}</a>
        </div>
      )}

      {feedback.length === 0 ? (
        <p className={styles.emptyState}>No feedback yet.</p>
      ) : (
        <div className={feedbackStyles.list}>
          {feedback.map((item) => (
            <FeedbackCard key={item.id} item={item} isSubmitting={isSubmitting} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ item, isSubmitting }: { item: FeedbackItem; isSubmitting: boolean }) {
  const date = new Date(item.createdAt).toLocaleDateString();
  const clientLabel = [item.clientName, item.clientVersion, item.clientSha ? item.clientSha.slice(0, 7) : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={feedbackStyles.card}>
      <div className={feedbackStyles.cardHeader}>
        <span className={feedbackStyles.badge} data-category={item.category}>{item.category}</span>
        <span className={feedbackStyles.badge} data-severity={item.severity}>{item.severity}</span>
        <span className={feedbackStyles.badge} data-status={item.status}>{item.status}</span>
        <span className={feedbackStyles.meta}>{date}</span>
        {item.githubIssueUrl && (
          <a className={feedbackStyles.githubLink} href={item.githubIssueUrl} target="_blank" rel="noreferrer">
            #{item.githubIssueNumber}
          </a>
        )}
      </div>

      <p className={feedbackStyles.message}>{item.message}</p>

      {item.reproduction && (
        <details className={feedbackStyles.reproduction}>
          <summary>Reproduction</summary>
          <pre>{item.reproduction}</pre>
        </details>
      )}

      <div className={feedbackStyles.cardMeta}>
        <span>Reporter: {item.reporterUserId ?? "anonymous"}</span>
        {clientLabel && <span>Client: {clientLabel}</span>}
      </div>

      {item.resolvedNote && (
        <div className={feedbackStyles.resolvedNote}>
          <strong>Note:</strong> {item.resolvedNote}
        </div>
      )}

      <div className={feedbackStyles.actions}>
        <Form method="post" className={feedbackStyles.statusForm}>
          <input type="hidden" name="intent" value="update-status" />
          <input type="hidden" name="id" value={item.id} />
          <select name="status" defaultValue={item.status} className={styles.select}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            name="resolvedNote"
            placeholder="Resolution note (optional)"
            defaultValue={item.resolvedNote ?? ""}
            className={styles.input}
          />
          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            Update
          </button>
        </Form>

        {!item.githubIssueUrl && (
          <Form method="post">
            <input type="hidden" name="intent" value="forward" />
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" disabled={isSubmitting} className={feedbackStyles.githubButton}>
              Forward to GitHub
            </button>
          </Form>
        )}
      </div>
    </div>
  );
}
