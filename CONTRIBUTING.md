# Contributing to OpenLaunchKit

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/stephenywilson/openlaunchkit
cd openlaunchkit
npm install
npm run build
npm test
```

## Project Structure

```
src/
  cli.ts          — CLI entry point, arg parsing
  types.ts        — TypeScript interfaces
  audit/          — 7 audit modules
  detectors/      — File analysis utilities
  scoring/        — Scoring logic
  reporters/      — Terminal, JSON, Markdown output
  templates/      — Launch post templates
tests/            — Jest tests
fixtures/         — Test projects
scripts/          — smoke.ts integration tests
```

## Running Tests

```bash
npm test               # Unit + integration tests
npm run smoke          # End-to-end smoke tests
npm run typecheck      # TypeScript type checking only
```

## Adding a New Audit Check

1. Find the appropriate audit module in `src/audit/`
2. Add a check that pushes a `Finding` to the `findings` array
3. Add a corresponding `passed.push()` for the happy path
4. Write a test fixture if needed
5. Add a test case in `tests/audit.test.ts`

## Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Ensure `npm test` and `npm run typecheck` pass
5. Submit a PR with a clear description of the change and why

## Code Style

- TypeScript strict mode
- No external runtime dependencies
- No chalk or other color libraries (raw ANSI codes only)
- Prefer explicit types over inference for public APIs
