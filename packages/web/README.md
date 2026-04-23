# @dossier/web

Web dashboard for Dossier — manage your knowledge profile through a browser UI.

## Features

- **Dashboard overview** — skill count, active goals, interests, projects at a glance
- **Skills management** — add, edit, delete skills with proficiency levels and visibility
- **Learning goals** — track progress, manage priorities and status
- **Projects** — CRUD with featured flag, status, priority, visibility
- **Interests** — add, remove, promote to learning goals
- **Profile settings** — edit bio, preferred language, custom instructions
- **API key management** — generate and revoke API keys
- **Export preview** — view your LLM context markdown export
- **Public profiles** — shareable profile pages at `/u/:username`

## Tech Stack

- **Remix** — server-rendered React with loaders/actions
- **CSS Modules** — scoped styling with CSS custom properties
- No client-side state management — Remix handles data flow

## Development

```bash
# From monorepo root
pnpm build
cd packages/web
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOSSIER_API_URL` | No | `http://localhost:3200` | Backend API URL |
| `SESSION_SECRET` | Yes | — | Cookie session signing secret |
| `PORT` | No | `3000` | Server port |
