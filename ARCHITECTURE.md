# Architecture

This document describes the high-level architecture of Nodepad.
If you want to familiarize yourself with the codebase, you are in the right place!

## Bird's Eye View

Nodepad is a hierarchical outliner application designed for creating and managing deeply nested lists.
It consists of a **FastAPI** backend and a **React** frontend, coordinated via a REST API.

The core data structure is a **NodeList**, which contains a tree of **Nodes**.
- **Hierarchy**: Represented using both `parent_id` pointers and a materialized `path` (using PostgreSQL `ltree`). Path calculations reside in `backend/app/services/nodes.py`.
- **Ordering**: Handled via **fractional indexing** (decimal positions). Logic for calculating new positions resides in `backend/app/crud/nodes.py`.
- **Consistency**: The backend uses a **Longest Increasing Subsequence (LIS)** algorithm (`backend/app/services/lists.py`) to handle complex subtree movements while maintaining a stable order with minimal DB writes.

The analyzer (and this documentation) keeps everything in memory; we never do direct IO in the business logic layer.

## Code Map

This section provides a "bird's eye" map of the codebase.

### `backend/app/api/`
FastAPI routes. This is the **API Boundary**. It handles HTTP requests, validates input using Pydantic schemas, and delegates to services.

### `backend/app/services/`
The "brain" of the application. Contains domain logic that is independent of HTTP or Database implementation details.
- `lists.py`: Implements the **Longest Increasing Subsequence (LIS)** algorithm to minimize database writes during bulk reordering.
- `nodes.py`: Contains pure logic for calculating hierarchical `path` and `level` strings.

**Architecture Invariant**: Services never handle raw HTTP objects (like `Request` or `BackgroundTasks`) directly. They receive and return pure data.

### `backend/app/crud/`
Database-specific implementation of domain logic.
- `nodes.py`: Implements **Fractional Indexing** logic (`get_position_between`, `get_position_start/end`) and handles **Cascading Updates** for hierarchical paths using raw SQL for performance.
- `reindex_nodes`: A utility to reset positions to integers (multiples of 1000) to prevent floating-point precision issues over time.

### `backend/app/models/`
SQLAlchemy models.
- `lists.py`: Defines the `Node` and `NodeList` tables.
- **Invariant**: We use `ltree` for hierarchical queries and `Numeric(30, 15)` for fractional positions to prevent precision loss.

### `backend/app/schemas/`
Pydantic v2 request/response schemas (`lists.py`, `users.py`).

### `backend/app/main.py`
FastAPI application entrypoint, CORS configuration, request-context logging middleware (`client_ip`, `request_id`, `user_agent`), and optional Sentry initialization (`SENTRY_DSN`, disabled when `ENVIRONMENT=local`).

### `frontend/src/routes/`
TanStack Router file-based route definitions (`_layout/lists.tsx`, `_layout/lists_.$listId.tsx`, `login.tsx`, `signup.tsx`, etc.). This defines the page structure and hosts route-level state and TanStack Query hooks.

### `frontend/src/client/`
Auto-generated OpenAPI TypeScript client (`@hey-api/openapi-ts`) synchronized from the FastAPI schema via `scripts/generate-client.sh`.

### `frontend/src/hooks/` & State Management
Server state and caching are managed via **TanStack Query** (`@tanstack/react-query`), paired with local React state (`useState`, `useRef`) for editing, focus, drag-and-drop (`@dnd-kit`), and undo history, plus shared hooks (`useAuth.ts`, `useMobile.ts`, etc.).

### `frontend/src/components/`
UI components built with **Tailwind CSS 4** and **Radix UI**.
- **Invariant**: Atomic components in `ui/` (buttons, inputs, dialogs) are decoupled from application logic.

## Architecture Invariants

- **Unidirectional Data Flow**: Frontend state is updated via user actions that trigger TanStack Query mutations, which in turn invalidate or optimistically update the query cache.
- **Optimistic UI**: The frontend predicts the outcome of reordering actions to ensure a "snappy" keyboard-first experience.
- **PostgreSQL Dependency**: The use of `ltree` means the backend specifically targets PostgreSQL. We do not aim for database-agnosticism.
- **Stateless Backend**: The backend does not maintain server-side sessions. All authentication and authorization are handled via JWTs provided in the `Authorization` header.

## Cross-Cutting Concerns

### Development Workflow
We use **Docker Compose** with a native `watch` feature or local environments.

- **Backend**: Managed with `uv`.
- **Frontend**: Managed with `bun`.

### Testing
- **Backend**: Unit tests using `pytest`.
- **Frontend**: E2E tests using **Playwright**.

### Authentication
We use **OAuth2 with Password Flow** and **JWT** (JSON Web Tokens).
- Tokens are short-lived.
- The `app.core.security` module handles token generation and validation.
- **Invariant**: The backend never stores passwords in plain text; it uses `argon2` or `bcrypt` (via `pwdlib`).
