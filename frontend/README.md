--> [Main Project Index](../README.md)

# Nodepad Frontend

React 19 + TypeScript frontend built with Vite 7, TanStack Router, TanStack Query, Tailwind CSS 4, Radix UI, and `dnd-kit`, managed with `bun`.

## Local Development

Install dependencies (from repo root or `frontend/`):

```bash
bun install
```

Start the Vite dev server:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

## Linting & Formatting

Uses [Biome](https://biomejs.dev/) (`frontend/biome.json`):

```bash
bun run lint
```

## OpenAPI Client Generation

The API client in `src/client/` is generated from the FastAPI OpenAPI schema using `@hey-api/openapi-ts` (`frontend/openapi-ts.config.ts`). From the repo root:

```bash
bash scripts/generate-client.sh
```

## Testing (Playwright)

End-to-end tests live in `frontend/tests/` and run against a live stack:

```bash
bun run test
# or interactive UI:
bun run test:ui
```

## Directory Structure

- `src/routes/` — File-based TanStack Router pages (`_layout/lists.tsx`, `_layout/lists_.$listId.tsx`, `login.tsx`, `signup.tsx`, etc.)
- `src/client/` — Auto-generated OpenAPI SDK and TypeScript types
- `src/components/` — UI primitives (`ui/`), layout (`Sidebar/`, `Common/`), and feature components (`Lists/`, `Admin/`, `UserSettings/`)
- `src/hooks/` — Shared React hooks (`useAuth.ts`, `useMobile.ts`, `useCustomToast.ts`, `useCopyToClipboard.ts`)

