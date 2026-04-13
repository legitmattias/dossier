import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import { api } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/dashboard.module.css";

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const { user } = await api<{ user: { username: string } }>("/auth/me", { token });
  return json({ username: user.username });
}

export default function DashboardLayout() {
  const { username } = useLoaderData<typeof loader>();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <NavLink to="/dashboard" className={styles.logo}>Dossier</NavLink>
        <p className={styles.username}>@{username}</p>

        <nav className={styles.nav}>
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Overview
          </NavLink>
          <NavLink
            to="/dashboard/skills"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Skills
          </NavLink>
          <NavLink
            to="/dashboard/goals"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Learning Goals
          </NavLink>
          <NavLink
            to="/dashboard/interests"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Interests
          </NavLink>
          <NavLink
            to="/dashboard/projects"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Projects
          </NavLink>
          <NavLink
            to="/dashboard/domains"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Domains
          </NavLink>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
          >
            Settings
          </NavLink>
        </nav>

        <Form method="post" action="/auth/logout" className={styles.logoutForm}>
          <button type="submit" className={styles.logoutButton}>Log Out</button>
        </Form>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
