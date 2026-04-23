# @dossier/mcp

MCP (Model Context Protocol) server for Dossier — exposes your knowledge profile to AI tools.

## Quick Start (Claude Code)

Add to `~/.claude.json`:

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

Restart Claude Code. The server reads your profile from `~/.config/dossier/profile.json` (or set `DOSSIER_PROFILE`).

## Docker (HTTP mode)

```bash
cd docker/
cp .env.example .env
# Edit .env and set DOSSIER_API_KEY
docker compose up -d
```

The MCP server listens on `http://localhost:3100/mcp` with API key authentication.

## Cloud Mode

Connect the MCP server to a Dossier API instance instead of reading from a local file:

```json
{
  "mcpServers": {
    "dossier": {
      "command": "node",
      "args": ["/path/to/dossier/packages/mcp/dist/bin.mjs"],
      "env": {
        "DOSSIER_STORAGE": "api",
        "DOSSIER_API_URL": "https://dossier.example.com",
        "DOSSIER_API_KEY": "dsk_your_api_key_here"
      }
    }
  }
}
```

All tools and resources work identically in both modes. Cloud mode enables multi-device access and sharing via the API's authentication layer.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DOSSIER_TRANSPORT` | `stdio` | Transport mode: `stdio` or `http` |
| `DOSSIER_STORAGE` | `file` | Storage backend: `file` (local JSON) or `api` (Dossier API) |
| `DOSSIER_PROFILE` | `~/.config/dossier/profile.json` | Path to profile JSON file (file mode only) |
| `DOSSIER_API_URL` | — | Dossier API base URL (required for api mode) |
| `DOSSIER_API_KEY` | — | API key for Dossier API authentication (required for api mode) |
| `DOSSIER_PORT` | `3100` | HTTP port (http mode only) |
| `DOSSIER_HOST` | `0.0.0.0` | HTTP bind address (http mode only) |
| `DOSSIER_API_KEY` | — | API key for HTTP transport authentication (required for http transport) |

## Resources

Read-only data accessible to MCP clients.

| URI | Description |
|---|---|
| `dossier://profile` | Full profile as JSON |
| `dossier://profile/summary` | Profile summary as markdown structured for LLM context |
| `dossier://skills` | All skills |
| `dossier://skills/{domainSlug}` | Skills filtered by domain |
| `dossier://goals` | All learning goals |
| `dossier://goals/active` | Active goals only |
| `dossier://interests` | All interests |
| `dossier://domains` | Domains and categories (taxonomy discovery) |

## Tools

Actions the AI can perform on your profile. All tools accept domain/category by ID, slug, or name.

| Tool | Description |
|---|---|
| `dossier_add_skill` | Add a skill with domain, category, proficiency |
| `dossier_list_skills` | List skills with optional filters |
| `dossier_update_skill` | Update proficiency, notes, or name |
| `dossier_remove_skill` | Remove a skill |
| `dossier_add_goal` | Add a learning goal |
| `dossier_list_goals` | List goals with optional status filter |
| `dossier_update_goal` | Update goal progress (0-100%) |
| `dossier_complete_goal` | Complete a goal and create a corresponding skill |
| `dossier_add_interest` | Add a topic of interest |
| `dossier_add_project` | Add a project to your profile |
| `dossier_list_projects` | List projects with optional filters |
| `dossier_update_project` | Update project details |
| `dossier_remove_project` | Remove a project |
| `dossier_add_domain` | Create a custom knowledge domain |
| `dossier_add_category` | Add a category to a domain |
| `dossier_export` | Export profile (json, markdown, text, claude) |

## Prompts

Pre-built prompt templates that include your profile context.

| Prompt | Description |
|---|---|
| `suggest-learning` | What to learn next based on skills and goals |
| `recommend-stack` | Tech stack for a project based on your skills |
| `explain-for-level` | Explain a topic adapted to your proficiency |
| `review-stale-skills` | Identify skills to refresh or deprecate |
| `plan-learning-path` | Step-by-step plan for a learning goal |

## Proficiency Levels

`novice` → `familiar` → `proficient` → `advanced` → `expert`
