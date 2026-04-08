import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import { createUserSession, getToken } from "~/lib/session.server";
import styles from "~/styles/auth.module.css";

export const meta: MetaFunction = () => [{ title: "Register — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getToken(request);
  if (token) return redirect("/dashboard");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "") || undefined;

  if (!username || !email || !password) {
    return json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const data = await api<{ token: string }>("/auth/register", {
      method: "POST",
      body: { username, email, password, name },
    });
    return createUserSession(data.token, "/dashboard");
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Something went wrong" }, { status: 500 });
  }
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>

        <Form method="post" className={styles.form}>
          {actionData?.error && (
            <div className={styles.error}>{actionData.error}</div>
          )}

          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>Username</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Display Name (optional)</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className={styles.input}
            />
          </div>

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
              minLength={8}
              autoComplete="new-password"
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </Form>

        <p className={styles.footer}>
          Already have an account? <Link to="/auth/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
