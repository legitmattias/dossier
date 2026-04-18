# Changelog

All notable changes to Dossier are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
(CuriOS, Jobhaul) should treat the current surface as unstable until then.
