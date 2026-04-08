import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { api } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/overview.module.css";

interface Profile {
  name: string;
  skills: Array<{ name: string; proficiency: string }>;
  goals: Array<{ name: string; status: string; priority: string }>;
  interests: Array<{ name: string }>;
  domains: Array<{ name: string; categories: Array<{ name: string }> }>;
}

export const meta: MetaFunction = () => [{ title: "Dashboard — Dossier" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const profile = await api<Profile>("/profile", { token });
  return json({ profile });
}

export default function DashboardOverview() {
  const { profile } = useLoaderData<typeof loader>();

  const activeGoals = profile.goals.filter((g) => g.status === "active");

  return (
    <div>
      <h1 className={styles.title}>{profile.name}</h1>

      <div className={styles.stats}>
        <Link to="/dashboard/skills" className={styles.statCard}>
          <span className={styles.statNumber}>{profile.skills.length}</span>
          <span className={styles.statLabel}>Skills</span>
        </Link>
        <Link to="/dashboard/goals" className={styles.statCard}>
          <span className={styles.statNumber}>{activeGoals.length}</span>
          <span className={styles.statLabel}>Active Goals</span>
        </Link>
        <Link to="/dashboard/interests" className={styles.statCard}>
          <span className={styles.statNumber}>{profile.interests.length}</span>
          <span className={styles.statLabel}>Interests</span>
        </Link>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{profile.domains.length}</span>
          <span className={styles.statLabel}>Domains</span>
        </div>
      </div>

      {profile.skills.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Skills</h2>
          <div className={styles.chipList}>
            {profile.skills.slice(0, 10).map((skill) => (
              <span key={skill.name} className={styles.chip}>
                {skill.name}
                <span className={styles.chipMeta}>{skill.proficiency}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {activeGoals.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Active Goals</h2>
          <ul className={styles.goalList}>
            {activeGoals.map((goal) => (
              <li key={goal.name} className={styles.goalItem}>
                <span>{goal.name}</span>
                <span className={styles.goalPriority}>{goal.priority}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
