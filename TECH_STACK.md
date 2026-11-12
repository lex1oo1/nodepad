# Tech Stack & Architectural Decisions

Exact dependencies observed in `backend/pyproject.toml`, `frontend/package.json`, and `compose.yml`.

## 1. Backend Stack (`backend/pyproject.toml`)

| Category | Package | Version Constraint |
| :--- | :--- | :--- |
| Runtime | Python | `>=3.12,<4.0` |
| Web Framework | `fastapi[standard]` | `>=0.135.1,<1.0.0` |
| ORM & Migrations | `sqlalchemy`, `alembic` | `>=2.0.48`, `>=1.12.1,<2.0.0` |
| PostgreSQL Driver | `psycopg[binary]` | `>=3.1.13,<4.0.0` |
| Tree & IDs | `sqlalchemy-utils` (`LtreeType`), `edwh-uuid7` | unpinned, `>=0.2.3` |
| Validation & Config | `pydantic`, `pydantic-settings` | `>2.0`, `>=2.2.1,<3.0.0` |
| Auth & Crypto | `pyjwt`, `pwdlib[argon2,bcrypt]` | `>=2.8.0,<3.0.0`, `>=0.3.0` |
| Email | `emails`, `jinja2`, `email-validator` | `>=0.6,<1.0`, `>=3.1.4,<4.0.0`, `>=2.1.0.post1,<3.0.0.0` |
| Monitoring | `sentry-sdk[fastapi]` | `>=2.0.0,<3.0.0` |
| Resilience | `tenacity`, `httpx` | `>=8.2.3,<9.0.0`, `>=0.25.1,<1.0.0` |
| Dev / QA | `pytest`, `coverage`, `mypy`, `ruff`, `prek` | `>=7.4.3,<8.0.0`, `>=7.4.3,<8.0.0`, `>=1.8.0,<2.0.0`, `>=0.2.24,<1.0.0`, `>=0.2.24,<1.0.0` |

## 2. Frontend Stack (`frontend/package.json`)

| Category | Package | Version |
| :--- | :--- | :--- |
| UI Library | `react`, `react-dom` | `^19.1.1`, `^19.2.3` |
| Build & Language | `vite`, `typescript`, `@vitejs/plugin-react-swc` | `^7.3.0`, `^5.9.3`, `^4.2.2` |
| Routing | `@tanstack/react-router`, `@tanstack/router-plugin` | `^1.157.3`, `^1.140.0` |
| Data Fetching | `@tanstack/react-query`, `axios` | `^5.90.20`, `1.13.4` |
| API Codegen | `@hey-api/openapi-ts` | `0.73.0` |
| Styling & Primitives | `tailwindcss`, `@tailwindcss/vite`, `@radix-ui/react-*`, `lucide-react`, `sonner` | `^4.1.17`, `^4.1.18`, Radix v1/v2, `^0.563.0`, `^2.0.7` |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | `^6.3.1`, `^10.0.0`, `^3.2.2` |
| Forms & Validation | `react-hook-form`, `@hookform/resolvers`, `zod` | `^7.68.0`, `^5.2.2`, `^4.3.6` |
| Linting & Testing | `@biomejs/biome`, `@playwright/test` | `^2.3.14`, `1.58.2` |

## 3. Infrastructure (`compose.yml`)

- **Database**: `postgres:18`
- **DB Admin**: `adminer`
- **Reverse Proxy**: Traefik (`traefik-public` network, Let's Encrypt `le` resolver) and Coolify variant (`compose.coolify.yml`)

## 4. Key Architectural Decisions

1. **Hybrid Tree Representation (`parent_id` + PostgreSQL `ltree`)**:
   - `parent_id` maintains direct adjacency and `ON DELETE CASCADE` integrity; `path` (`LtreeType` with GiST index) and `level` enable fast subtree queries and ordered tree retrieval (`order_by="cast(Node.path, String), Node.position"`).
2. **Fractional Indexing (`Numeric(30, 15)`)**:
   - Sibling order uses decimal midpoints (`(left + right) / 2`) in `backend/app/crud/nodes.py` to avoid renumbering all siblings on insert/reorder, with `reindex_nodes` resetting positions to multiples of `1000` when needed.
3. **LIS-Based Bulk Reordering (`backend/app/services/lists.py`)**:
   - Uses Longest Increasing Subsequence (`O(N log N)` via `bisect_left`) to identify nodes already in valid relative order and minimize database writes during bulk list updates.
4. **UUID v7 Primary Keys**:
   - Generated via `edwh_uuid7.uuid7` so primary keys are globally unique and roughly time-ordered.
5. **OpenAPI-Driven Frontend Client**:
   - Backend OpenAPI JSON is exported and compiled into `frontend/src/client/` via `@hey-api/openapi-ts`, keeping TypeScript types and SDK calls synchronized with Pydantic schemas.
6. **Stateless JWT Auth**:
   - HS256 JWTs (`pyjwt`) with 8-day default expiration (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 8`) and Argon2/Bcrypt password hashing (`pwdlib`).

