---
name: git-commit
description: Create clean conventional commits without pushing. Use when asked to commit, generate a commit message, stage changes, or split commits from a diff.
---

# Git Commit

Inspect the working tree, stage coherent changes, run required validation, and create
conventional commits. Do not push.

## Quick Workflow

1. Inspect repository state before staging:

```bash
git status --porcelain
git diff --stat
git diff
```

Optional summary helper:

```bash
.agents/skills/git-commit/scripts/diff-summary.sh
```

2. Choose a staging strategy from the diff. Keep each commit to one intent.

- Use `git add -A` when everything is one coherent concern.
- Use `git add <paths>` when concerns are separated by file or folder.
- Use `git add -p` when concerns are mixed inside the same file.

Stage and verify:

```bash
git add -A
# or: git add <paths>
# or: git add -p
git diff --cached
```

If staged too much:

```bash
git restore --staged <paths>
```

3. Run validation before each commit.

- Follow repository-level instructions first, especially `AGENTS.md`.
- Prefer the repo's canonical tooling over package scripts or raw upstream tools.
- For VitePlus repos, use direct `vp` commands such as `vp check`, `vp lint <files>`,
  and `vp test run` when relevant.
- If repo docs and scripts conflict, treat scripts as stale until the canonical entrypoint
  is verified.
- Use staged paths where practical; broaden validation when staged changes cross contracts.
- Skip validation for docs-only, comments-only, whitespace-only, and low-risk visual-only
  tweaks, then say why in the final response.

Default when the repo has no validation guidance:

```bash
npx oxlint <paths> --fix && npx tsc -b --noEmit
```

4. Commit with a conventional message:

```bash
git commit -m "type(scope): subject"
```

For non-trivial diffs, migrations, flags, or follow-ups, use a compact body:

```bash
git commit -F - <<'EOF'
type(scope): subject

Why: intent or constraint.
What: high-level change.
Notes: migrations, flags, or follow-ups if any.
EOF
```

If the body hits commitlint line-length limits, wrap it into multiple short `Why:`,
`What:`, or `Notes:` lines.

## Commit Strategy

Prefer the smallest number of commits that preserves clarity.

Split when:

- Multiple top-level areas changed with different intent.
- Mixed change types appear, such as `feat` plus `fix`.
- The message would need "and".

Common split patterns:

- By concern: feature, fix, refactor, docs, tests.
- By area: frontend, backend, module, or folder.

## Message Rules

- `feat`: new user-visible behavior
- `fix`: bug fix or behavior correction
- `refactor`: internal code change without behavior change
- `docs`: documentation only
- `test`: tests only
- `chore`: tooling, config, maintenance

Scope:

- Derive from the most relevant top-level folder or bounded module.
- Keep it short and stable, for example `auth`, `orders`, `ui`, or `api`.

Subject:

- Imperative mood, lowercase, no trailing period.
- Describe outcome rather than implementation detail.

Examples:

- `feat(auth): add session timeout enforcement`
- `fix(api): handle empty batch payload`
- `refactor(ui): simplify invoice table columns`

## Safety Rules

- Inspect diffs before staging and before committing.
- Use `git diff --cached` to verify the staged set.
- Create multiple commits when it increases clarity.
- Stop after commit. Do not push.
- Rewrite history unless explicitly asked.
- Do not use destructive commands such as `git reset --hard`.
