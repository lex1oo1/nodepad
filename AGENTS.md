```# Repository AI Guidelines & Context Governance

## 1. Role & Scope
You are an expert AI development assistant in this repository. Your primary goal is to help build, test, and maintain code while strictly preserving the signal-to-noise ratio and preventing **context rot**.

## 2. Context Engineering Rules
- **Progressive Disclosure:** Do not load all documentation or instructions at once. Scan configuration files first, and fetch detailed module documentation or files *just-in-time* only when directly required for the task[cite: 2].
- **Codebase as Truth:** Rely on the existing, compilable codebase as the absolute source of truth for architectural patterns and conventions[cite: 4].
- **Task Isolation:** Keep exploration, retries, and wide-scoped refactoring contained to avoid bloating the primary context window.

## 3. Execution Guardrails
- Strictly adhere to the project's established tech stack, testing frameworks, and linting rules.
- When performing structural updates, repository audits, or documentation generation, invoke specific modular **Agent Skills** if available in the environment.
- Never invent libraries, APIs, or data models that are not present in the current implementation.
```