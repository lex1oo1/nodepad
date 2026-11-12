# Nodepad Roadmap

This document tracks the planned evolution of Nodepad from its current **v0.4 beta** state (a keyboard-first hierarchical outliner) into a **production-grade outliner application** with mobile PWA support, typed nodes (including calendar entries), and due-date notifications.

---

## Current Baseline (v0.4 beta)

- **Auth & Users**: JWT-based auth (OAuth2 password flow), signup, password recovery/reset emails, superuser/admin management.
- **Core Outliner**: `NodeList` and `Node` hierarchy using PostgreSQL `ltree` + fractional indexing (`Numeric(30, 15)`), LIS-based bulk reordering, drag-and-drop (`@dnd-kit`), keyboard navigation, and client-side undo.
- **Ops & Tooling**: Docker Compose (`watch`, Traefik, Coolify), Alembic migrations, request-context logging, Sentry integration, OpenAPI TypeScript client generation, `pytest` + Playwright E2E tests.

---

## Phase 1: Production Hardening & Reliability

- **CI/CD Pipeline**: Automated GitHub Actions (or equivalent) running `ruff`, `mypy`, `pytest`, `biome`, `tsc`, and Playwright E2E on every PR.
- **Testing & Observability**:
  - Expand backend test coverage for `nodes` routes/CRUD edge cases (concurrent reorders, `reindex_nodes`, deep subtrees).
  - Fix/stabilize Playwright E2E tests (e.g., `node-tree-interactions.spec.ts`) and run them reliably in CI.
  - Structured JSON logging in production, health/readiness probes, and database backup/restore procedures.
- **Security & Auth Hardening**:
  - Refresh tokens / token rotation strategy for long-lived mobile PWA sessions.
  - Rate limiting on auth endpoints and strict production CORS/TLS defaults.
- **Deployment Cleanup**:
  - Consolidate/document `compose.yml`, `compose.traefik.yml`, and `compose.coolify.yml` (avoid hardcoded domains like in `compose.coolify.yml`).

---

## Phase 2: Smartphone PWA & Mobile UX

- **PWA Foundation**:
  - Web App Manifest (`manifest.webmanifest`), app icons, and theme metadata.
  - Service Worker (e.g. `vite-plugin-pwa` / Workbox) for installability and asset caching.
- **Offline-First & Sync**:
  - Local persistence (IndexedDB via TanStack Query persister or dedicated local store) for offline reading and queued mutations.
  - Conflict resolution / idempotent mutation replay when reconnecting.
- **Touch & Mobile Ergonomics**:
  - Mobile-friendly action bar / floating toolbar for indent, outdent, reorder, add child, and delete (since mobile keyboards lack `Tab` / `Shift+Enter` / `Ctrl+Z`).
  - Swipe gestures and touch-optimized drag handles.
  - Responsive layout audit across mobile viewports.

---

## Phase 3: Typed Nodes & Calendar Entries

- **Extensible Node Model**:
  - Introduce `node_type` (e.g. `note`, `task`, `calendar_event`) and structured metadata (either dedicated nullable columns for indexed fields + `JSONB` `meta`/`properties` for type-specific attributes).
  - Update Pydantic schemas, Alembic migrations, and regenerate the OpenAPI client.
- **Task & Due-Date Fields**:
  - `due_at` (timezone-aware `DateTime`), `completed_at`, priority/status, and tags.
- **Calendar Entries**:
  - `start_at`, `end_at`, `all_day`, and optional recurrence rule (`RRULE` or structured JSON) for calendar-type nodes.
  - Dedicated **Agenda / Calendar View** querying nodes across lists by date range.
  - Optional `.ics` (iCalendar) export/feed for external calendar integration.

---

## Phase 4: Due-Date Notifications & Scheduling

- **Notification Channels**:
  - **Web Push API (VAPID)**: Browser/PWA push subscriptions stored per user/device (`push_subscription` table) so smartphones receive notifications even when the app is closed.
  - **Email Reminders** (optional fallback using existing SMTP/email template infrastructure).
- **Scheduling & Worker Architecture**:
  - Background worker/scheduler (e.g. scheduled job / queue worker polling upcoming `due_at` / reminder timestamps in UTC, respecting user timezone).
  - Delivery tracking (`reminder_sent_at` / notification log) to guarantee idempotency and prevent duplicate alerts.
- **User Preferences**:
  - Per-user timezone setting, default reminder lead time (e.g. 15 min, 1 hour, 1 day before), and per-channel opt-in/opt-out.

