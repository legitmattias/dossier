# Changelog

All notable changes to Dossier are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Feedback channel**: new `dossier_submit_feedback` MCP tool lets AI agents
  report concrete friction and bugs with explicit user confirmation. Backed by a
  new `feedback` table, `POST/GET/PATCH /feedback` API routes, and a
  `/dashboard/feedback` triage page with per-item "Forward to GitHub Issues"
  action. Configurable via `GITHUB_TOKEN` + `GITHUB_FEEDBACK_REPO` env vars.
  **Three-layer consent model for multi-tenant deployments**:
  1. **Instance-level**: submissions disabled unless the operator sets
     `DOSSIER_FEEDBACK_ENABLED=true`. `GET /feedback/status` exposes the flag
     so clients can detect availability. Submissions return `503` when off.
  2. **Per-user opt-in**: users must enable feedback in their Dossier settings
     (new `feedback_opt_in` column on `users`). Anonymous submissions are
     rejected — auth is required so opt-in can be enforced. Returns `403` when
     the user has not opted in.
  3. **Admin-only viewing**: `GET /feedback`, `PATCH /feedback/:id`, and
     `POST /feedback/:id/forward` now require `is_admin=true` on the user row.
     Non-admins are redirected away from `/dashboard/feedback` and the
     sidebar link is hidden for them.
- **Admin bootstrap**: new `is_admin` column on `users`. On registration, the
  first user to sign up is promoted to admin automatically. Operators who
  want race-proof control can set `DOSSIER_ADMIN_USERNAME` — only a user
  registering with that exact username becomes admin, and no one else does.
- **Profile-wide name uniqueness**: skills, goals, interests, and projects
  must now have unique names within a profile (case-insensitive, cross-domain).
  The domain layer raises `DuplicateEntityNameError` on both add and update.
- **Web: editable Interest domain**: the interest edit modal now exposes a
  Domain `<select>` (with "— None —"), matching the web parity already in
  place for skills, goals, and projects.
- **CLI: link skills to projects**: `dossier project add` and a new
  `dossier project update` accept repeatable `--skill <name>` flags that
  resolve to skill IDs (case-insensitive exact match, errors on unresolved or
  ambiguous names). `dossier project list` now shows a Skills count column.
- **Goal schema parity**: `add_goal` now accepts `motivation` and `status`;
  `edit_goal` now accepts `targetDate`. Eliminates the previous add-then-edit
  double-call pattern for creating a goal with a motivation.
- **Project schema completeness**: `add_project` / `update_project` now expose
  `startDate`, `endDate`, and a `skillNames[]` parameter that auto-resolves to
  skill IDs by exact-match name (errors on unresolved or ambiguous names).
  Eliminates the N-round-trip skill-lookup workflow when bulk-linking skills.
- **Batch search**: `dossier_search` now accepts either `query` (single) or
  `queries: string[]` (batch); single-call resolution of many skill names.
- **List tool IDs**: `dossier_list_skills`, `dossier_list_goals`, and
  `dossier_list_projects` now include `[id: ...]` on every line so agents can
  drive follow-up calls without a second search round-trip.
- **Exporter timestamps**: Markdown export gains an `Updated` column on skill
  tables and a profile-level "Last updated" header; Claude-md export gains
  the same header and an `updated YYYY-MM-DD` on active goals.
- **Skill `proficiencyLabel` always present** in REST output (`GET /profile`,
  `/profile/skills`, `/u/:username`, POST/PUT returns) — emitted as `null`
  when unset, the string value when set. Lets downstream integrations rely on
  the field's presence. MCP `dossier_search` now renders the custom label too,
  matching `dossier_list_skills`.

### Changed

- **Breaking**: export format key `claude` renamed to `llm-md` to avoid
  collision with Claude Code's `CLAUDE.md` project-instructions file and to
  accurately reflect that Dossier is agent/LLM-agnostic. Affects the `dossier
  export --format` flag, the MCP `dossier_export` tool's `format` enum, and
  the REST `GET /profile/export?format=` query parameter. The `claude-md`
  alias is also removed. Internal exporter class renamed
  `ClaudeMdExporter` → `LlmMdExporter`.
- `docker-compose.prod.yml` uses `${DOSSIER_IMAGE_PREFIX:-ghcr.io/your-org}`
  so forks can override the image namespace without editing the compose file.
- `.github/workflows/deploy.yml` builds against
  `ghcr.io/${{ github.repository_owner }}/*` instead of a hardcoded org.

### Fixed

- Web "Saving…" button no longer flashes briefly during post-submit
  revalidation on skills/goals/interests/projects edit forms.

## [0.1.0] — 2026-04-18

First stable release. Dossier is now production-ready for multi-user deployment,
with every surface (API, MCP, CLI, web) reporting its version and commit SHA so
operators can tell exactly which build is running.

### Core

- Full entity model: Skills, Goals, Interests, Projects, Domains and Categories.
- Domain-level proficiency labels with per-skill overrides (so the Languages domain
  can use beginner/elementary/intermediate/fluent/native while keeping the internal
  enum intact for sorting and filtering).
- Per-entity `featured`, `description`, `notes`, and `visibility` fields.
- Domain-level visibility that cascades to contained entities ("domain wins").
- `createdAt` / `updatedAt` timestamps on every entity, sortable in CLI and web.
- Built-in, extensible domain catalog covering software, design, writing, music,
  languages, business, science, and more.

### MCP server

- `@dossier/mcp` stdio and HTTP transports.
- 20+ tools covering add/edit/remove across all entity types, promote interest
  to goal, complete goal, export, and full-text search.
- `serverInfo` reports the real package version plus commit SHA and build time
  in `_meta`, so AI clients can tell when they're on an outdated session.

### API

- REST API built on Hono with JWT + API key auth (`dsk_` prefix, per-key scopes).
- Public profile routes (`/u/:username`) with domain-aware visibility filtering.
- `GET /version` endpoint returning version, commit SHA, build time, and API
  contract version.
- `GET /health` includes the same version info alongside `status: ok`.

### Web UI

- Dark-themed Remix dashboard with CSS Modules.
- Every page shows the build version and short SHA in the sidebar footer.
- Settings page surfaces both the web bundle version and the live API version,
  with an in-sync / mismatch badge so rolling deploys are visible.
- Public profile pages at `/u/:username`.

### CLI

- `dossier --version` now prints `0.1.0 (abc1234)` when built from a known commit
  and falls back to `0.1.0` in development.

### Infrastructure

- Single source of truth for the version string in `@dossier/core` (`VERSION`
  and `getVersionInfo`).
- `DOSSIER_COMMIT_SHA` and `DOSSIER_BUILT_AT` are injected at container build
  time by GitHub Actions and baked into the web bundle via Vite `define`.
- Deployment pipeline builds three images (API, MCP, web), tags them with the
  commit SHA, and ships to a Hetzner VPS behind Caddy.

### Notes on API stability

The public REST routes are not yet namespaced under `/api/v1`. Promotion to a
versioned contract is deferred to a later release — existing integrations
should treat the current surface as unstable until then.
