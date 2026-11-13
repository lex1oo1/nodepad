```
---
name: repo-doc-audit
description: Scans the repository, auto-detects the tech stack (Python, JS, Elixir, Go, etc.), audits documentation gaps against AI-first standards, and generates or updates structured markdown docs (Architecture, Tech Stack, Data Model, API Contracts).
---

# Agent Skill: AI-First Repository Documentation & Audit

## 1. Execution Objective
Perform an autonomous audit of the codebase to evaluate documentation health, identify architectural drift, and ensure the repository is fully transparent for future AI agent sessions and human developers.

## 2. Discovery & Auto-Detection Phase (Stack-Agnostic)
Scan the repository root to detect the technology stack and framework by locating manifest files:
- **Python:** `pyproject.toml`, `requirements.txt`, `poetry.lock`
- **JavaScript/TypeScript:** `package.json`, `pnpm-lock.yaml`, `tsconfig.json`
- **Elixir:** `mix.exs`, `mix.lock`
- **Go:** `go.mod`, `go.sum`

## 3. Standards & Gap Analysis
Compare the current state against the required AI-first documentation standard. Identify missing, outdated, or superficial files:
1. **`AI_INSTRUCTIONS.md`** (or `.cursorrules` / `CLAUDE.md`) — Coding rules, linting, build/test commands.
2. **`ARCHITECTURE.md`** — System design, component boundaries, and data flow.
3. **`TECH_STACK.md` / ADRs** — Exact libraries, runtime versions, and key architectural decisions.
4. **`DATA_MODEL.md`** — Schemas, database entities, and migrations.
5. **`API_CONTRACTS.md`** — Endpoints, message schemas, and integration points.

## 4. Execution Guardrails (Context Engineering)
- **Zero Hallucination:** Base all generated or updated documentation strictly on the actual code implementation found in the repository. Do not invent mock features.
- **Token Efficiency:** Keep markdown files concise, structured, and optimized for AI token parsing using tables and bullet points.
- **Incremental Updates:** Modify only what is outdated or create missing files. Do not rewrite stable historical records.

## 5. Output Report
Provide a clean summary table outlining:
- **File Name** (Created / Updated)
- **Detected Stack Element** (e.g., Go/Gin, Elixir/Phoenix, Python/FastAPI, JS/React)
- **Brief Action Summary** (e.g., "Generated missing DATA_MODEL.md based on Prisma/Ecto schemas").
```