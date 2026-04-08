import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { createUserSession, getToken } from "~/lib/session.server";
import styles from "~/styles/auth.module.css";

export const meta: MetaFunction = () => [{ title: "Log In — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getToken(request);
  if (token) return redirect("/dashboard");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const data = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    return createUserSession(data.token, "/dashboard");
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Log In</h1>

        <Form method="post" className={styles.form}>
          {actionData?.error && (
            <div className={styles.error}>{actionData.error}</div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </Form>

        <p className={styles.footer}>
          Don't have an account? <Link to="/auth/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
