# Nodepad

Nodepad is a hierarchical outliner application designed for creating and managing nested lists with a keyboard-first workflow. It is inspired by modern outliner apps like Dynalist, Workflowy, and Checkvist.

**Current Version:** v0.4 beta  
**Status:** Active development — transitioning from prototype/pet project to a production-grade outliner (see [ROADMAP.md](ROADMAP.md)).

---

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PostgreSQL 18 (`ltree` extension + UUID v7), Sentry, `uv`
- **Frontend**: React 19, TypeScript, Vite 7, TanStack Router, TanStack Query, Tailwind CSS 4, Radix UI, `@dnd-kit`, Biome, `bun`
- **Infrastructure & Testing**: Docker Compose (with `watch`), Traefik / Coolify configs, `pytest` + coverage, Playwright E2E

---

## Documentation Index

- [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) — AI-first coding rules, boundaries, and commands
- [ARCHITECTURE.md](ARCHITECTURE.md) — High-level architecture, code map, and invariants
- [TECH_STACK.md](TECH_STACK.md) — Exact dependencies, versions, and architectural decisions
- [DATA_MODEL.md](DATA_MODEL.md) — Database schemas, indexes, and tree/ordering mechanics
- [API_CONTRACTS.md](API_CONTRACTS.md) — REST endpoints, request/response schemas, and errors
- [ROADMAP.md](ROADMAP.md) — Planned evolution toward production-grade PWA, typed nodes, and notifications
- [LOG.md](LOG.md) — Development notes, UX/UI ideas, and change history
- [backend/README.md](backend/README.md) — Backend setup, migrations, and data structures
- [backend/specs.md](backend/specs.md) — Backend engineering rules and coding standards
- [frontend/README.md](frontend/README.md) — Frontend setup, Biome linting, client generation, and Playwright tests

---

## Project Links (Local Development)

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Adminer (Database Tool):** [http://localhost:8080](http://localhost:8080)
- **Mailcatcher:** [http://localhost:1080](http://localhost:1080)

---

## Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env` and adjust secrets/settings as needed:

```bash
cp .env.example .env
```

> **Note:** In `staging` or `production` (`ENVIRONMENT` != `local`), `backend/app/core/config.py` rejects default `"changethis"` values for `SECRET_KEY`, `POSTGRES_PASSWORD`, and `FIRST_SUPERUSER_PASSWORD`.

### 2. Run with Docker Compose

This project uses Docker Compose's native `watch` feature for development:

```bash
docker compose watch
```

Alternatively:

```bash
docker compose up --build
```

For production/deployment configurations, see `compose.yml`, `compose.traefik.yml`, and `compose.coolify.yml`.

---

## Testing, Linting & Code Generation

### Full Test Suite (Docker)

```bash
bash scripts/test.sh
```

Or against an already-running local stack:

```bash
bash scripts/test-local.sh
```

### Backend Checks (from `backend/`)

```bash
bash scripts/lint.sh       # mypy + ruff check
bash scripts/format.sh     # ruff format
bash scripts/tests-start.sh
```

### Frontend Checks (from `frontend/`)

```bash
bun run lint               # Biome check
bun run build              # tsc + Vite build
bun run test               # Playwright E2E tests
```

### Regenerate Frontend API Client

Whenever FastAPI routes or Pydantic schemas change, regenerate `frontend/src/client/` from the repo root:

```bash
bash scripts/generate-client.sh
```

---

## Keyboard Shortcuts

Nodepad is designed to be keyboard-first. Use these shortcuts in the list editing screen:

| Shortcut | Action |
| :--- | :--- |
| **Enter** | Save and finish editing |
| **Shift + Enter** | Create a new child node |
| **Tab** | Indent node (move right) |
| **Shift + Tab** | Outdent node (move left) |
| **↑ / ↓ Arrows** | Navigate between nodes |
| **Backspace** | Delete empty node (when empty) |
| **Ctrl + Z** | Undo last node edit/delete |
| **Escape** | Cancel editing |

---

## Disclaimer

This project started as a practice application and is **not an official product**. All design elements and content are original or freely available for use.
