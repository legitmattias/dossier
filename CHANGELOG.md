# Changelog

All notable changes to Dossier are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — 0.3: learning resources end-to-end

- **Resources on learning goals**: articles, videos, courses, books, documentation, or other materials can now be attached to a goal. Each resource carries a stable `id`, a title, optional URL, type, and a `completed` flag. Surfaced across:
  - **Domain layer**: `Resource` type + `addResourceToGoal` / `updateResourceInGoal` / `removeResourceFromGoal` mutation functions, plus `RESOURCE_TYPES` constant and `ResourceId` branded type.
  - **REST API**: `POST /profile/goals/:id/resources`, `PATCH /profile/goals/:id/resources/:resourceId`, `DELETE /profile/goals/:id/resources/:resourceId`. Auth + scope checks identical to other write routes.
  - **MCP tools**: `dossier_add_resource`, `dossier_update_resource`, `dossier_remove_resource`. AI agents can attach materials, toggle completion, and remove resources without needing to read or rewrite the whole goal.
  - **Web UI**: a Resources section in the goal edit modal lists existing resources with type icons, completion checkboxes, and remove buttons. An inline Add form supports title/URL/type/completed. Goal row meta shows a resource count.
  - **CLI**: `dossier resource <goal-name> add|list|remove|complete [identifier]` with `--title`, `--url`, `--type`, `--completed` flags. Resources can be addressed by id or exact-match title.
- Legacy resource rows without ids are backfilled on profile load (the schema's resource validator accepts missing `id` and synthesizes a stable replacement). No migration required for existing data.

### Changed — 0.3

- `serializeGoal` (the public serializer) now omits `progress`, `resources`, and `privateFields` keys entirely when they're missing on the entity, rather than crashing on `.map`. This makes the public route tolerant of the visibility filter stripping fields from a goal (e.g. `privateFields: ["resources"]` no longer 500s).
- The goal edit modal's "More privacy controls" section now references the Resources section below it explicitly: the `resources` toggle hides the section from public output, the section itself is the place to add/remove materials.

### Added — 0.2: multi-consumer access control

- **Per-field private overrides (`privateFields`)**: on Skill, Goal, Interest, and Project, the owner can mark specific eligible fields as hidden from public output even when the entity itself is public. Public surfaces (REST `/u/:username`, exporters, MCP via maxVisibility-capped keys) strip the marked fields; authenticated owner reads see everything. Eligible sets per entity:
  - Skill — `proficiency`, `proficiencyLabel`
  - Goal — `motivation`, `priority`, `status`, `targetDate`, `progress`, `resources` (with `progress` defaulting to private)
  - Project — `url`, `role`, `startDate`, `endDate`, `highlights`, `status`
  - Interest — none (entity-level visibility is sufficient)
  Drives the canonical use case: a public Bachelor thesis project that links to a private GitHub repo URL.
- **Per-client MCP HTTP authentication**: the MCP HTTP transport now authenticates each inbound client with their own personal `dsk_` API key, validated against `GET /auth/me` at session-init. Sessions are bound to the validated bearer; the MCP forwards that bearer onward to the API, so each client operates as their own user end-to-end. Replaces the previous shared `MCP_API_KEY` / `STORAGE_API_KEY` env vars. **Breaking** — see migration notes.
- **API key `maxVisibility` cap**: optional `maxVisibility: "public"` flag on a `dsk_` key. When set, reads through that key are filtered as if the request were anonymous (private entities removed, domain-private cascade applied, `notes` stripped, `privateFields` overrides applied). Lets a single user issue keys that project different curated views — e.g. a portfolio chatbot gets only the public slice, a personal AI assistant gets full access. Settable via `POST /auth/api-keys` body (`maxVisibility: "public"`). Web UI for managing the cap is a follow-up.
- **`ExpandableTextEditor` web component**: long-text fields (description, motivation, notes) render as a 3–4 row textarea with an inline expand icon that opens a focused full-screen modal (bottom-anchored sheet on mobile) with Cancel/Save, so paragraph-length content gets a real editing surface.
- **Per-field private-toggle UI** and **list-row padlock badges** on Skills, Goals, and Projects edit modals: inline "🔒 Private" checkbox next to each eligible field with mobile-friendly touch targets; list rows show a small padlock with a count when any field on the entity is hidden from public view.
- **Field-purpose tooltips**: every form field label on the edit modals now carries a short tooltip explaining its intended purpose, surfaced via the native `title` attribute.
- **maxVisibility cap in web UI**: the API key generation form on `/dashboard/settings` now exposes the `maxVisibility` cap (no cap / public only) with explanatory copy. Listed keys show a `🔒 public-only` badge when capped.
- **Goal `targetDate` input + extended privacy controls**: the goal add/edit modal now includes a `targetDate` date input with its own private toggle, plus a "More privacy controls" subsection with toggles for `progress` (default private) and `resources` — the eligible fields that don't have inline editing in the modal.
- **CLI `--private-field` flag**: `dossier add`, `dossier edit`, `dossier learn`, and `dossier project [--update]` accept repeatable `--private-field <name>` flags, e.g. `dossier project "Thesis" --url https://github.com/foo/bar --private-field url` to add a public project with a private URL.

### Changed — 0.2

- **Breaking — MCP HTTP env vars removed.** `DOSSIER_MCP_API_KEY` and `DOSSIER_STORAGE_API_KEY` no longer exist. HTTP transport now requires `DOSSIER_STORAGE=api` plus `DOSSIER_API_URL`; auth comes from the inbound client's `dsk_` key. stdio + file storage is unchanged. See the migration prompt for downstream services below.
- `notes` is now hard-stripped from `/u/:username` output (was leaking via the JSON serializer despite MCP/exporter contracts treating it as internal).

### Migration notes (0.2)

**For Dossier operators**: pull the new image; the existing per-user `dsk_` API keys in your database continue to work for both REST and MCP HTTP. Remove `MCP_API_KEY` and `STORAGE_API_KEY` from your `.env` — they're no longer read.

**For downstream services consuming Dossier** (e.g. portfolio agents, integrations): the MCP HTTP transport no longer accepts a single shared secret. Issue a personal `dsk_` key in Dossier's web UI (Settings → API Keys), one per service, ideally with `maxVisibility: "public"` for read-only portfolio-style consumers. The same key works for both REST and MCP HTTP — there is no separate MCP key concept anymore.

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
