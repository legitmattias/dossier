import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, NavLink, Outlet, useLoaderData, useLocation } from "@remix-run/react";

import { api } from "~/lib/api.server";
import { requireToken } from "~/lib/session.server";
import styles from "~/styles/dashboard.module.css";

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const { user } = await api<{ user: { username: string; isAdmin?: boolean } }>("/auth/me", { token });
  return json({ username: user.username, isAdmin: user.isAdmin === true });
}

export default function DashboardLayout() {
  const { username, isAdmin } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (navOpen) document.body.classList.add("nav-locked");
    else document.body.classList.remove("nav-locked");
    return () => document.body.classList.remove("nav-locked");
  }, [navOpen]);

  // Close drawer on Escape
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className={styles.layout}>
      {/* Mobile header — hidden on desktop via CSS */}
      <header className={styles.mobileHeader}>
        <button
          type="button"
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
          aria-controls="dossier-sidebar"
          className={styles.hamburger}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span className={navOpen ? styles.hamburgerBarsOpen : styles.hamburgerBars} />
        </button>
        <NavLink to="/dashboard" className={styles.mobileLogo}>Dossier</NavLink>
        <span className={styles.mobileUsername}>@{username}</span>
      </header>

      {/* Backdrop — only visible while drawer is open on mobile */}
      <div
        className={navOpen ? styles.backdropOpen : styles.backdrop}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="dossier-sidebar"
        className={navOpen ? styles.sidebarOpen : styles.sidebar}
      >
        <NavLink to="/dashboard" className={styles.logo}>Dossier</NavLink>
        <p className={styles.username}>@{username}</p>

        <nav className={styles.nav}>
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="Dashboard overview with stats and highlights"
          >
            Overview
          </NavLink>

          <span className={styles.navSection}>Profile</span>
          <NavLink
            to="/dashboard/skills"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="What you know — proficiency levels, usage tracking"
          >
            Skills
          </NavLink>
          <NavLink
            to="/dashboard/goals"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="What you're actively learning — progress tracking"
          >
            Learning Goals
          </NavLink>
          <NavLink
            to="/dashboard/interests"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="Topics on your radar for future exploration"
          >
            Interests
          </NavLink>
          <NavLink
            to="/dashboard/projects"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="Work you're doing or have done — active and completed"
          >
            Projects
          </NavLink>

          <span className={styles.navSection}>System</span>
          <NavLink
            to="/dashboard/domains"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="Knowledge domains and categories — organize your profile"
          >
            Domains
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/dashboard/feedback"
              className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
              title="AI-submitted feedback and triage (admin only)"
            >
              Feedback
            </NavLink>
          )}
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => isActive ? styles.navLinkActive : styles.navLink}
            title="Profile info, API keys, and export preview"
          >
            Settings
          </NavLink>
        </nav>

        <Form method="post" action="/auth/logout" className={styles.logoutForm}>
          <button type="submit" className={styles.logoutButton}>Log Out</button>
        </Form>

        <div className={styles.versionFooter}>
          v{__DOSSIER_VERSION__}
          {__DOSSIER_SHA__ !== "dev" && ` · ${__DOSSIER_SHA__.slice(0, 7)}`}
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
