# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

## Repository Overview

**Project:** Best-Practice-ai-
**Repository:** totti0770-beep/Best-Practice-ai-
**Purpose:** Clinical decision-support tooling for nursing staff — AI answers drawn exclusively from approved reference documents, with anti-hallucination guarantees.

## Current State

The repository contains two projects at different maturity levels, plus reference documents:

### `NursingAiAssistant/` — primary project (tested, CI-gated)

An **offline, air-gapped** React Native 0.73 Android app: a clinical reference assistant for nurses. No network access by design.

- **AI:** on-device inference via `llama.rn` (GGUF model, distributed separately — not in the repo)
- **Knowledge base:** admin-uploaded PDFs, extracted natively via Apache PDFBox (`PdfExtractorModule.kt`), chunked into an encrypted SQLite database (`react-native-sqlite-storage`, key held in Android Keystore)
- **Retrieval:** LIKE-based search over `KnowledgeBase` chunks; answers cite source document + page; no relevant chunk → explicit "no context" refusal, never a guess
- **i18n:** Arabic (RTL) and English via i18next; layout direction resolved at runtime (`I18nManager.isRTL`)
- **Safety gate:** a blocking, scroll-gated clinical disclaimer (`src/screens/DisclaimerScreen.js`) is the initial route until acknowledged; acceptance persists in the `AppSettings` table under `disclaimer_accepted_v1` and is written to the audit log as `DISCLAIMER_ACCEPTED`. Bumping the key suffix re-prompts all users. Route resolution fails closed.
- **Audit:** every significant action (PDF upload, AI query, disclaimer acceptance) is logged to the `AuditLogs` table; viewable in-app (Admin → Audit Logs)
- Screens: `Home`, `Chat`, `Admin`, `Audit`, `Disclaimer` (stack navigation, dark theme, `src/styles/colors.js` palette)

### `cnpv-platform/` — untested scaffold

A server-based monorepo (NestJS backend, Next.js 14 web, Expo mobile, PostgreSQL + pgvector, MinIO, Docker Compose) for a hospital knowledge-governance platform. **It has no lockfiles, has never been built or tested in CI, and is not covered by any pipeline.** Do not assume parity with `NursingAiAssistant` — treat it as a design artifact until it gains its own CI.

### Reference documents

- `CTO_AUDIT_REPORT.md` — audit of `NursingAiAssistant` (scorecard, prioritized gap list)
- `docs/test-coverage-analysis.md` — coverage analysis and priority areas

### Milestones (merged PRs)

| PR | What landed |
|----|-------------|
| #1–#2 | CLAUDE.md added, then updated |
| #3 | `NursingAiAssistant` React Native app (scaffold + screens) |
| #4 | Test coverage analysis |
| #6 | Security hardening: LLM timeout, SAST in CI config, @noble/hashes |
| #7 | Blocking clinical safety disclaimer + `cnpv-platform` scaffold |
| #8 | CI actually enabled (workflow moved to repo root), ESLint config, PDF/base64 fixes, logic-layer coverage gates |

## Development Branch

Always develop on `claude/add-claude-documentation-WBtd1` unless explicitly instructed otherwise. Never push directly to `main`.

```bash
git checkout claude/add-claude-documentation-WBtd1
# make changes
git push -u origin claude/add-claude-documentation-WBtd1
```

## Git Conventions

### Commit Messages

- Use the imperative mood: "Add feature", not "Added feature"
- Keep the subject line under 72 characters
- Reference issue numbers when applicable: `Fix login bug (#42)`
- Do not use `--no-verify` to skip hooks unless explicitly instructed

### Branch Naming

- Features: `feature/<short-description>`
- Bug fixes: `fix/<short-description>`
- Documentation: `docs/<short-description>`
- AI-generated work: `claude/<task-description>`

### Never Do

- Force-push to `main` or `master`
- Amend published commits
- Commit secrets, credentials, or `.env` files
- Skip pre-commit hooks without explicit user permission

## Code Conventions

### General

- Prefer editing existing files over creating new ones
- Do not add features beyond what was explicitly requested
- Do not add docstrings, comments, or type annotations to code you did not change
- Three similar lines of code is better than a premature abstraction
- Only validate at system boundaries (user input, external APIs)

### ESLint (NursingAiAssistant) — deliberate decisions, do not "fix"

Config: `NursingAiAssistant/.eslintrc.js` (extends `@react-native`). Three rules are intentionally adjusted, each with an explanatory comment in the file:

- `prettier/prettier: off` — eslint-plugin-prettier@4 crashes against Prettier 3 (`resolveConfig.sync` removed). Re-enable only together with a prettier pin/upgrade.
- `react-native/no-inline-styles: off` — RTL/LTR layout direction is resolved at runtime per locale, so `textAlign`/margins cannot live in static StyleSheets.
- `curly: ['error', 'multi-line']` — braces required for multi-line branches; single-line guards stay bare.

Lint is **blocking** in CI at `--max-warnings 0`.

### Security

- Never introduce command injection, XSS, SQL injection, or other OWASP Top 10 vulnerabilities
- Never hardcode credentials or secrets
- Validate and sanitize all user-supplied input at entry points
- Keep `NursingAiAssistant` air-gapped: no networking dependencies or telemetry

## Testing

All automated tests live in `NursingAiAssistant/__tests__/` (Jest, `react-native` preset). `cnpv-platform` has no tests.

```bash
cd NursingAiAssistant
npm test          # full suite
npm run lint      # ESLint (same gate as CI)
```

### Coverage

Coverage is measured on the **clinical logic layer only** — `src/services/` and `src/database/` — with UI (`screens/`, `components/`, `styles/`), `i18n/`, `assets/`, and `errorReporting.js` excluded (see `collectCoverageFrom` in `package.json`). Thresholds, enforced by Jest:

| Metric | Minimum |
|--------|---------|
| Branches | 75% |
| Functions | 95% |
| Lines | 90% |
| Statements | 90% |

New logic-layer code must ship with tests that keep these gates green. UI/component tests are welcome but not gated.

## CI/CD

Workflow: `.github/workflows/ci.yml` — **must stay at the repository root**. It previously sat nested under `NursingAiAssistant/.github/`, where GitHub Actions never discovered it; do not move it back (the file carries the same warning).

Triggers: pushes to `main`, `claude/**`, `feature/**`, `fix/**`; all PRs targeting `main`.

| Job | Blocking? | Steps |
|-----|-----------|-------|
| JS Lint & Unit Tests | **Yes** | `npm ci` → `npm audit --audit-level=critical` → full audit report (informational) → `eslint src/ --max-warnings 0` → `jest --ci --coverage` |
| Android Debug Build | No (`continue-on-error`) | Java 17 + Android SDK + committed debug keystore → Gradle debug build. TODO in the workflow: flip to blocking once it has gone green once. |

The remaining moderate npm-audit advisories are transitive build-time dependencies of react-native 0.73; they clear only with an RN upgrade (noted in the workflow).

## Working With This Repository

### Before Making Changes

1. Read relevant existing files before modifying them
2. Understand the existing patterns before introducing new ones
3. Check `CTO_AUDIT_REPORT.md` and open issues for known gaps before starting related work

### Making Changes

1. Keep changes focused — one logical change per commit
2. Do not refactor unrelated code while implementing a feature
3. Do not add speculative abstractions or "future-proof" code

### After Making Changes

1. Run `npm test` and `npm run lint` in `NursingAiAssistant` — CI enforces both
2. Verify the change does what was requested and nothing more
3. Commit with a clear, descriptive message and push to the designated branch

## Updating This File

This file should be updated whenever:

- A new language, framework, or major dependency is added
- `cnpv-platform` gains lockfiles, tests, or CI (its "untested scaffold" status above becomes wrong)
- CI/CD pipelines change (jobs, gates, thresholds)
- New coding conventions are established or an ESLint decision above is revisited
- The project directory structure changes

Keep it accurate and concise. Remove placeholder sections once real content replaces them.
