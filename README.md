# Dossier

A personal knowledge profile tool for LLM personalization.

## What is Dossier?

Every LLM session starts cold. Dossier fixes that by providing a structured, portable profile of your skills, learning goals, and interests that can be exported and shared with any AI tool.

**Not a resume. Not a portfolio.** A living document designed to be machine-readable and useful for personalization.

## Features (Planned)

- **Skills tracking** - What you know, at what proficiency, when last used
- **Learning goals** - What you're actively learning, with progress tracking
- **Interests** - What you're curious about (for future exploration)
- **Domain-agnostic** - Software, languages, music, business — any knowledge domain
- **Multiple export formats** - Markdown, JSON, CLAUDE.md, plain text
- **MCP integration** - Direct integration with Claude Code and MCP-compatible tools
- **CLI-first** - Fast, scriptable, works offline
- **Self-hostable** - Run your own instance, own your data

## Packages

```
packages/
├── core/     # Shared types, validation, export logic
├── cli/      # Command-line interface
├── mcp/      # MCP server for AI tool integration
├── api/      # REST API (Hono)
└── web/      # Web UI (Remix)
```

## Status

🚧 **In Development** — See [dossier-dev](https://github.com/legitmattias/dossier-dev) for planning docs.

## License

MIT
