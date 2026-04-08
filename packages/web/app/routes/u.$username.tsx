import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { api, ApiError } from "~/lib/api.server";
import styles from "~/styles/public-profile.module.css";

interface PublicProfile {
  name: string;
  skills: Array<{ name: string; proficiency: string; domainId: string; categoryId: string }>;
  goals: Array<{ name: string; status: string; priority: string }>;
  interests: Array<{ name: string }>;
  domains: Array<{ id: string; name: string; categories: Array<{ id: string; name: string }> }>;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.profile) return [{ title: "Profile Not Found — Dossier" }];
  return [
    { title: `${data.profile.name} — Dossier` },
    { name: "description", content: `${data.profile.name}'s knowledge profile on Dossier` },
    { property: "og:title", content: `${data.profile.name} — Dossier` },
    { property: "og:description", content: `${data.profile.name}'s skills, learning goals, and interests` },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const username = params["username"];
  try {
    const profile = await api<PublicProfile>(`/u/${username}`);
    return json({ profile, username, notFound: false });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404)) {
      return json({ profile: null, username, notFound: true }, { status: 404 });
    }
    throw error;
  }
}

export default function PublicProfile() {
  const { profile, username, notFound } = useLoaderData<typeof loader>();

  if (notFound || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h1>Profile not found</h1>
          <p>The user @{username} doesn't have a public profile.</p>
          <Link to="/">Back to Dossier</Link>
        </div>
      </div>
    );
  }

  const domainMap = new Map(profile.domains.map((d) => [d.id, d]));
  const activeGoals = profile.goals.filter((g) => g.status === "active");

  // Group skills by domain
  const skillsByDomain = new Map<string, typeof profile.skills>();
  for (const skill of profile.skills) {
    const list = skillsByDomain.get(skill.domainId) ?? [];
    list.push(skill);
    skillsByDomain.set(skill.domainId, list);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.name}>{profile.name}</h1>
        <span className={styles.badge}>@{username}</span>
      </header>

      {profile.skills.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Skills</h2>
          {[...skillsByDomain.entries()].map(([domainId, skills]) => {
            const domain = domainMap.get(domainId);
            return (
              <div key={domainId} className={styles.domainBlock}>
                <h3 className={styles.domainName}>{domain?.name ?? domainId}</h3>
                <div className={styles.skillGrid}>
                  {skills.map((skill) => (
                    <span key={skill.name} className={styles.skillChip}>
                      {skill.name}
                      <span className={styles.skillLevel}>{skill.proficiency}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {activeGoals.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Currently Learning</h2>
          {activeGoals.map((goal) => (
            <div key={goal.name} className={styles.goalItem}>
              <span>{goal.name}</span>
              <span className={styles.goalMeta}>{goal.priority} priority</span>
            </div>
          ))}
        </section>
      )}

      {profile.interests.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Interests</h2>
          <div className={styles.skillGrid}>
            {profile.interests.map((interest) => (
              <span key={interest.name} className={styles.interestChip}>
                {interest.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        Powered by <Link to="/">Dossier</Link>
      </footer>
    </div>
  );
}
