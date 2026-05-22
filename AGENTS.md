# Runtime and Tooling

- Use Bun as the runtime and package manager for this project.
- Use `bun add`, `bun remove`, and `bun install` for dependency changes. Do not use `npm`, `yarn`, or `pnpm` unless the user explicitly asks.
- This repo uses the native VitePlus toolchain.
- Development, build, lint, format, check, and test flows must use direct `vp`/VitePlus commands.
- Prefer direct `vp` commands over package script wrappers for VitePlus workflows.
- Do not call raw `vite` or `vitest` directly unless the user explicitly asks for it.
- Do not call raw `tsc` directly for normal validation unless the user explicitly asks for it.
- Prefer focused commands over broad validation while iterating. Run the smallest command that gives useful signal for the change.

# Canonical Commands

- Install dependencies: `bun install`
- Start local development: `vp dev`
- Production build: `vp build`
- Preview production build: `vp preview`
- Project check: `vp check src`
- Lint: `vp lint <edited files>`
- Format: `vp fmt --write <edited files>`
- Unit tests: `vp test run`
- Unit test watch mode: `vp test`

# Discipline

- Read the relevant code before running broad commands.
- Do not run validation commands repeatedly after every small patch. Make a coherent batch of edits first, then validate.
- Use `vp check` without path arguments for a full codebase scan.
- Use `vp check [paths]` only for intentionally targeted checks during iteration.
- Run `vp check` after coherent code changes that affect TypeScript types, imports/exports, hooks, component logic, config, or cross-file contracts.
- Run `vp test run` after changes that affect component state, data flow, model logic, user interactions, tests, or behavior covered by tests.
- Run `vp fmt --write [changed files]` after editing multiple files or when formatting churn is expected. Do not run it just to mask unclear code changes.
- Skip validation for documentation-only edits, comments, whitespace-only changes, copy tweaks, and small Tailwind class value changes that do not touch component logic.
- If validation is intentionally skipped, say why in the final response.

# Local Servers

- Before starting a local server, check whether the needed port is already active.
- Do not start duplicate dev or preview servers on the same port.
- If a server is already active, reuse it for browser checks.
- If you start a dev or preview server, report the URL to the user and stop the server when it is no longer needed for the task.
- Default dev URL is `http://127.0.0.1:5317/`; VitePlus may choose another port if that port is busy.
- Default preview URL is `http://127.0.0.1:4317/`.

# Code Exploration

- Read and understand relevant files before proposing or making edits.
- Do not speculate about code that has not been inspected.
- Follow existing project patterns before adding abstractions.
- Keep changes scoped to the user request.

# Visual Design

- The project theme is white, neutral, emerald, and sky.
- Use white as the main background, neutral for text/surfaces/borders, emerald for success/progress/positive learning states, and sky for informational/interactive data states.
- Avoid introducing new dominant color families unless the user explicitly approves the palette change.
- The app uses Heroicons as its icon system for all new UI surfaces.
- Use Heroicons through `@heroicons/react`, defaulting to `@heroicons/react/24/outline`.
- Use `currentColor` sizing via Tailwind classes such as `size-5` or `size-[18px]`; avoid custom SVG icons when a Heroicons icon fits.
- Do not mix Heroicons with Lucide, Tabler, or Hugeicons inside new UI surfaces. Existing non-Heroicons usage should be migrated when touched.
- `components.json` may still reference Lucide for shadcn compatibility; replace generated Lucide imports with Heroicons before using the component in the app.

# Testing Quality

- Tests should protect meaningful behavior, not implementation details.
- Prefer user-observable outcomes such as selected state, submitted data, interaction results, or rendered behavior that matters.
- Avoid tests that only verify static markup, Tailwind classes, layout values, animation props, or that a component mounted.
- Do not add a new test for a low-risk visual-only tweak unless it guards a real regression.
- Do not initiate end-to-end testing with Playwright MCP or the Playwright CLI unless the user explicitly asks for E2E, browser, or Playwright verification.

# Git

- When creating commits, use the `git-commit` skill.
