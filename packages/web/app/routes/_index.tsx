import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { getToken } from "~/lib/session.server";
import styles from "~/styles/index.module.css";

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getToken(request);
  if (token) return redirect("/dashboard");
  return null;
}

export default function Index() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>Dossier</h1>
      <p className={styles.subtitle}>
        Your personal knowledge profile for AI personalization.
      </p>
      <p className={styles.description}>
        A structured, portable profile of your skills, learning goals, and interests
        — designed to be machine-readable so AI tools can adapt to your knowledge level.
      </p>
      <div className={styles.actions}>
        <Link to="/auth/register" className={styles.primaryButton}>
          Get Started
        </Link>
        <Link to="/auth/login" className={styles.secondaryButton}>
          Log In
        </Link>
      </div>
      <div className={styles.versionFooter}>
        v{__DOSSIER_VERSION__}
        {__DOSSIER_SHA__ !== "dev" && ` · ${__DOSSIER_SHA__.slice(0, 7)}`}
      </div>
    </div>
  );
}
