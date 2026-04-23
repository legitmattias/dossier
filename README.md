# Dossier

A personal knowledge profile tool for LLM personalization. Structured, portable profiles of skills, learning goals, interests, and projects — designed to be machine-readable so AI tools can adapt to your knowledge level.

## Why Dossier?

Every LLM session starts cold. Dossier provides persistent context about what you know, what you're learning, and what you're working on — so AI tools can personalize their responses from the first interaction.

**Not a resume. Not a portfolio.** A living knowledge profile designed for machine consumption.

## Features

- **Skills tracking** — proficiency levels, domain-specific labels, notes
- **Learning goals** — priorities, progress tracking, motivation
- **Projects** — active work with featured highlights, linked skills
- **Interests** — topics on your radar for future exploration
- **Domain-agnostic** — software, languages, music, business — any knowledge domain
- **Per-entity visibility** — public/private control on every item
- **Multiple export formats** — JSON, Markdown, LLM context markdown, plain text
- **MCP integration** — native Model Context Protocol server for AI tools
- **REST API** — JWT + API key auth, PostgreSQL-backed
- **Web dashboard** — manage your profile with a Remix web UI
- **CLI** — fast, scriptable, works offline with local file storage
- **Self-hostable** — run locally or deploy your own cloud instance

## Architecture

Clean architecture with SOLID principles. Monorepo with five packages:

| Package | Description | Tech |
|---------|-------------|------|
| [`core`](packages/core/) | Domain model, use cases, validation, export | TypeScript, Zod |
| [`cli`](packages/cli/) | Command-line interface | Commander.js |
| [`mcp`](packages/mcp/) | MCP server (stdio + HTTP) | @modelcontextprotocol/sdk |
| [`api`](packages/api/) | REST API with auth | Hono, Drizzle, PostgreSQL |
| [`web`](packages/web/) | Web dashboard | Remix, CSS Modules |

## Quick Start

### MCP Server (recommended for AI tool users)

Add to your Claude Code config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "dossier": {
      "command": "node",
      "args": ["/path/to/dossier/packages/mcp/dist/bin.mjs"]
    }
  }
}
```

This runs in local file mode — your profile is stored at `~/.config/dossier/profile.json`.

For cloud mode (API-backed), see the [MCP package docs](packages/mcp/).

### CLI

```bash
pnpm install && pnpm build

# Initialize a profile
npx dossier init "Your Name"

# Add a skill
npx dossier add TypeScript -d software-development -c languages --proficiency proficient

# Export for LLM consumption
npx dossier export --format claude
```

### Full Stack (Docker)

```bash
cd docker/
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, JWT_SECRET

docker compose up -d
# API: http://localhost:3200
# MCP: http://localhost:3100
```

See [API docs](packages/api/) and [Web docs](packages/web/) for details.

## Development

```bash
# Prerequisites: Node.js >= 22, pnpm

pnpm install
pnpm build
pnpm test

# Local dev database for API tests
docker compose -f docker/docker-compose.dev.yml up -d
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (ES2024, Node 22) |
| Monorepo | pnpm workspaces |
| Bundler | tsdown (Rolldown) |
| Testing | Vitest |
| Validation | Zod |
| CLI | Commander.js |
| MCP | @modelcontextprotocol/sdk |
| API | Hono |
| ORM | Drizzle |
| Database | PostgreSQL |
| Web | Remix |
| CSS | CSS Modules |
| CI/CD | GitHub Actions |
| Containers | Docker, GitHub Container Registry |

## License

MIT
