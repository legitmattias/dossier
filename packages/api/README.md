# @dossier/api

REST API for Dossier — manage your knowledge profile, authenticate services, and expose public profiles.

## Quick Start

```bash
# Start Postgres (if not already running)
docker run -d --name dossier-pg -p 5432:5432 \
  -e POSTGRES_USER=dossier -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=dossier \
  postgres:17-alpine

# Run the API
DATABASE_URL=postgres://dossier:secret@localhost:5432/dossier \
JWT_SECRET=$(node -e "console.log(crypto.randomUUID())") \
node packages/api/dist/bin.mjs
```

Tables are created automatically on first startup.

### With Docker Compose

```bash
cd docker/
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, JWT_SECRET, DOSSIER_API_KEY

docker compose up -d
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (`postgres://user:pass@host:5432/dbname`) |
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `PORT` | No | `3200` | Server port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed origins |
| `REGISTRATION_ENABLED` | No | `true` | Set to `false` to disable new account creation |

## Authentication

Three access tiers:

| Tier | Header | Access |
|---|---|---|
| **Public** | None | `GET /u/:username`, `GET /health` |
| **API Key** | `Authorization: Bearer dsk_...` | Read-only profile access |
| **JWT** | `Authorization: Bearer eyJ...` | Full CRUD |

### Get a JWT token

```bash
# Register
curl -X POST http://localhost:3200/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"mattias","email":"m@example.com","password":"securepass"}'

# Login
curl -X POST http://localhost:3200/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"m@example.com","password":"securepass"}'
```

### Generate an API key

```bash
curl -X POST http://localhost:3200/auth/api-keys \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"jobhaul-integration"}'
# Returns: { "key": "dsk_abc123..." } — save this, it won't be shown again
```

API keys use the `dsk_` prefix and are compared using timing-safe equality checks.

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create account (seeds built-in domains) |
| `POST` | `/auth/login` | None | Get JWT token |
| `GET` | `/auth/me` | JWT | Current user info |
| `POST` | `/auth/api-keys` | JWT | Generate API key |

### Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile` | JWT/Key | Full profile as JSON |
| `PATCH` | `/profile` | JWT | Update profile fields (bio, preferred language, custom instructions) |
| `GET` | `/profile/export?format=` | JWT/Key | Export (json, markdown, text, claude) |
| `GET` | `/profile/domains` | JWT | List domains + categories |

### Skills

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/skills` | JWT | List skills (filter: `?domainId=&proficiency=`) |
| `POST` | `/profile/skills` | JWT | Add skill |
| `PUT` | `/profile/skills/:id` | JWT | Update skill |
| `DELETE` | `/profile/skills/:id` | JWT | Remove skill |
| `POST` | `/profile/skills/:id/mark-used` | JWT | Record recent skill usage |

### Goals

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/goals` | JWT | List goals (filter: `?status=active`) |
| `POST` | `/profile/goals` | JWT | Add goal |
| `PUT` | `/profile/goals/:id` | JWT | Update goal |
| `DELETE` | `/profile/goals/:id` | JWT | Remove goal |
| `PUT` | `/profile/goals/:id/progress` | JWT | Update progress |
| `POST` | `/profile/goals/:id/complete` | JWT | Complete goal and create skill |

### Interests

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/interests` | JWT | List interests |
| `POST` | `/profile/interests` | JWT | Add interest |
| `PUT` | `/profile/interests/:id` | JWT | Update interest |
| `DELETE` | `/profile/interests/:id` | JWT | Remove interest |
| `POST` | `/profile/interests/:id/promote` | JWT | Promote interest to learning goal |

### Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/projects` | JWT | List projects (filter: `?status=&featured=`) |
| `POST` | `/profile/projects` | JWT | Add project |
| `PUT` | `/profile/projects/:id` | JWT | Update project |
| `DELETE` | `/profile/projects/:id` | JWT | Remove project |

### Domains

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/domains` | JWT | List domains + categories |
| `DELETE` | `/profile/domains/:domainId` | JWT | Remove a custom domain |
| `DELETE` | `/profile/domains/:domainId/categories/:categoryId` | JWT | Remove a category from a domain |

### Public

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/u/:username` | None | Public profile (json default, `?format=claude`) |
| `GET` | `/health` | None | Health check |

## Database

PostgreSQL is the only supported database. Set the connection string via `DATABASE_URL`:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

Tables are created on startup if they don't exist. Use the Docker Compose setup for a pre-configured PostgreSQL instance.

## Security

- **Rate limiting** on auth endpoints to prevent brute-force attacks
- **Timing-safe comparison** for API key validation
- **Scoped API keys** with read-only access (prefixed `dsk_`)
- **JWT tokens** include `iss` and `aud` claims for validation
