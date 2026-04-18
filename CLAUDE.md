# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

## Repository Overview

**Project:** Best-Practice-ai-
**Repository:** totti0770-beep/Best-Practice-ai-
**Purpose:** A repository focused on AI best practices.

This repository is in its initial stage. As the project grows, update this file to reflect the actual structure, conventions, and workflows.

## Current State

The repository currently contains:
- `README.md` — project title placeholder
- `CLAUDE.md` — this file

No source code, dependencies, tests, or CI/CD configuration exist yet.

## Development Branch

Always develop on `claude/add-claude-documentation-3dlx4` unless explicitly instructed otherwise. Never push directly to `main`.

```bash
git checkout claude/add-claude-documentation-3dlx4
# make changes
git push -u origin claude/add-claude-documentation-3dlx4
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

## Code Conventions (Apply When Code Is Added)

### General

- Prefer editing existing files over creating new ones
- Do not add features beyond what was explicitly requested
- Do not add docstrings, comments, or type annotations to code you did not change
- Three similar lines of code is better than a premature abstraction
- Only validate at system boundaries (user input, external APIs)

### Security

- Never introduce command injection, XSS, SQL injection, or other OWASP Top 10 vulnerabilities
- Never hardcode credentials or secrets
- Validate and sanitize all user-supplied input at entry points

### File and Directory Layout (To Be Established)

As the project takes shape, document the intended structure here. For example:

```
src/          # Source code
tests/        # Test files
docs/         # Documentation
scripts/      # Utility scripts
.github/      # GitHub Actions workflows
```

## Testing

See `docs/test-coverage-analysis.md` for the full coverage analysis and priority areas.

### Conventions (apply when a framework is chosen)

- Place all tests under `tests/`, mirroring the `src/` structure
- Name test files `test_<module>.py` (Python) or `<module>.test.ts` (TypeScript)
- Each public function must have at least one unit test
- Security boundary inputs must have explicit tests

### Running Tests (update when framework is confirmed)

```bash
# Python / pytest
pytest --cov=src --cov-fail-under=80

# TypeScript / jest
npx jest --coverage
```

### Coverage Requirements

- Minimum **80% line coverage** enforced in CI
- All public API entry points must be covered
- Every error/exception branch must have a test

## CI/CD (To Be Established)

When GitHub Actions or another CI system is configured, document:
- Workflow files location: `.github/workflows/`
- Required checks before merging
- Deployment process

## Working With This Repository

### Before Making Changes

1. Read relevant existing files before modifying them
2. Understand the existing patterns before introducing new ones
3. Check if a `TODO` or open issue describes the work

### Making Changes

1. Keep changes focused — one logical change per commit
2. Do not refactor unrelated code while implementing a feature
3. Do not add speculative abstractions or "future-proof" code

### After Making Changes

1. Verify the change does what was requested and nothing more
2. Commit with a clear, descriptive message
3. Push to the designated branch

## Updating This File

This file should be updated whenever:
- A new language, framework, or major dependency is added
- Test infrastructure is set up
- CI/CD pipelines are configured
- New coding conventions are established
- The project directory structure is defined

Keep it accurate and concise. Remove placeholder sections once real content replaces them.
