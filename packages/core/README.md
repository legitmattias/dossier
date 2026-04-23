# @dossier/core

Shared domain model, application use cases, and infrastructure for Dossier.

## Architecture

Clean architecture with three layers:

- **Domain** — entities (Skill, Goal, Interest, Project, Profile), value objects (Proficiency, Slug, branded IDs), domain errors
- **Application** — use cases, DTOs, ports (repository/exporter interfaces), validation helpers
- **Infrastructure** — Zod validation, file repository, export formatters (JSON, Markdown, LLM context markdown, plain text)

## Key Patterns

- Functional entities with factory functions and pure mutation (no classes)
- Branded types for type-safe IDs (`SkillId`, `DomainId`, etc.)
- Profile as aggregate root — all entity CRUD goes through profile operations
- Domain-agnostic data model (domains + categories work for any knowledge area)

## Proficiency Scale

`novice` -> `familiar` -> `proficient` -> `advanced` -> `expert`

## Entities

| Entity | Description |
|--------|-------------|
| **Profile** | Aggregate root — name, bio, settings, all child entities |
| **Skill** | Knowledge with proficiency, usage tracking, freshness decay |
| **LearningGoal** | Active learning with progress, priority, resources |
| **Interest** | Casual curiosity — lightweight, promotable to a goal |
| **Project** | Work with status, priority, featured flag, linked skills |
| **Domain** | Knowledge area (e.g. Software Development, Music, Languages) |
| **Category** | Subdivision within a domain (e.g. Frameworks, Instruments) |

All entities support `visibility: "public" | "private"` for export filtering.
