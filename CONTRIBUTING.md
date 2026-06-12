# Contributing Guide

Welcome. This repository uses GitHub Flow with strict traceability and
automation.

`docs/WORKFLOW.md` is the source of truth for workflow, naming, automation,
release, BMAD back-sync, and PR requirements. This guide is the daily practical
version for contributors.

## Start Here

Before implementation, choose one track:

- **Track A - BMAD GitHub-first story work:** use an existing GitHub story issue
  created from BMAD work. GitHub is authoritative for AC, DoR, DoD, active
  status, comments, branch guidance, and PR linkage. BMAD artifacts are context
  only and back-sync happens after issue close.
- **Track B - GitHub-only work:** use a regular GitHub issue for non-BMAD
  features, bugs, docs, chores, tooling, refactors, or external contributions.
  No BMAD artifact, specs repo access, or back-sync is required.

Every human-authored PR to `main` must have a primary GitHub issue and a closing
keyword in the PR body: `Closes #N`, `Fixes #N`, or `Resolves #N`.

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the detailed rules.

For agent-assisted work, copy one of the prompt recipes from
[docs/WORKFLOW.md#13-agent-prompt-recipes](docs/WORKFLOW.md#13-agent-prompt-recipes).

## Daily Workflow

### 1. Create or Identify the Issue

Use the right issue source:

- Track A: use the existing BMAD story issue. Do not recreate it manually.
- Track B feature/change: use `.github/ISSUE_TEMPLATE/feature_request.md`.
- Track B bug/regression: use `.github/ISSUE_TEMPLATE/bug_report.md`.

For Track B, make sure the issue has clear Acceptance Criteria / Definition of
Done before implementation.

### 2. Create a Branch

Start from `main` unless an exception is justified, such as adapting a Renovate
branch.

```bash
git checkout main
git pull --rebase origin main
git checkout -b feature/DC-123-short-description
```

Branch patterns:

- `feature/DC-<issue-number>-<short-desc>`
- `fix/DC-<issue-number>-<short-desc>`
- `docs/DC-<issue-number>-<short-desc>`
- `chore/DC-<issue-number>-<short-desc>`

For BMAD story issues, prefer the `Suggested Branch` from the GitHub issue when
present.

### 3. Commit Clearly

Use Conventional Commits with scopes allowed by `commitlint.config.cjs`.

```bash
git add .
git commit -m "feat(auth): implement login use case"
```

Do not put `Closes #N`, `Fixes #N`, or `Resolves #N` in commits. Closing
keywords belong in the PR body.

### 4. Run Local Checks

Recommended before PR readiness:

```bash
npm run check
```

This runs lint, unit tests, and build. Add targeted checks when relevant, for
example:

```bash
npm run test:e2e
```

### 5. Push and Open a PR

```bash
git push -u origin feature/DC-123-short-description
```

Open the PR on GitHub and fill `.github/PULL_REQUEST_TEMPLATE.md`.

Required PR points:

- Use a Conventional Commit style PR title.
- Fill `Related Work`.
- Include `Closing Issue (required): Closes #<primary-issue>`.
- List AC/tasks actually addressed.
- Complete DoR/DoD checklists honestly.
- Add at least one valid repository label.
- Add reviewers when appropriate.

For GitHub-only work, fill BMAD-only PR fields with `N/A - GitHub-only work`.

### 6. Review, Fix, Merge

Before merge:

- PR has at least one valid label.
- PR body contains the closing keyword for the primary issue.
- CI is green.
- Review feedback is addressed.
- Squash commit title follows Conventional Commits.

Use **Squash and merge** only.

After merge:

```bash
git checkout main
git pull --rebase origin main
git branch -d feature/DC-123-short-description
```

## Hooks and Automation

Husky hooks:

- `.husky/pre-commit` runs `npx lint-staged`.
- `.husky/commit-msg` runs commitlint.
- `.husky/pre-push` runs `.husky/check-pr-labels.js`.

The pre-push label check skips validation when no PR exists yet. Once a PR
exists for the current branch, it blocks pushes if the PR has no label or an
unauthorized label.

PR traceability is enforced by `.github/workflows/pr-traceability-guard.yml`.
`Related to #N` is useful for secondary context, but it does not satisfy the
primary closing keyword requirement.

## CI/CD Summary

Pull requests to `main` run `.github/workflows/ci.yml`:

- `lint`
- `test-unit`
- `test-integration`
- `test-e2e`
- `security`

The `release` job runs only after a push to `main` and after required CI jobs
pass. Deployment is handled by `.github/workflows/deploy.yml` after successful
CI on `main`.

## Renovate Breaking Changes

Renovate bot PRs from `renovate/*` branches are exempt from the closing keyword
guard. Human adaptation PRs are not exempt.

If a Renovate PR introduces a breaking change:

1. Leave the failing Renovate PR open.
2. Create a dedicated GitHub issue for the adaptation.
3. Branch from the Renovate branch with an issue-numbered branch, for example
   `chore/DC-123-renovate-major-backend-dependencies`.
4. Open a human PR to `main` with `Closes #123`.
5. Close the original Renovate PR after the adaptation PR merges if it is
   obsolete.

## Working in Parallel

Keep changes isolated by issue and branch. Multiple contributors can work in
parallel as long as every branch starts from a reasonable base and each PR stays
focused.

When another PR merges before yours:

```bash
git fetch origin
git rebase origin/main
```

Resolve conflicts locally, rerun relevant checks, and push again.

## Common Commands

```bash
# Start from main
git checkout main
git pull --rebase origin main

# Create a branch for issue #123
git checkout -b feature/DC-123-short-description

# Commit
git add .
git commit -m "feat(documents): add export filter"

# Local checks
npm run check

# Push
git push -u origin feature/DC-123-short-description

# Keep branch updated
git fetch origin
git rebase origin/main

# Cleanup after merge
git checkout main
git pull --rebase origin main
git branch -d feature/DC-123-short-description
```

## Useful Links

- [docs/WORKFLOW.md](docs/WORKFLOW.md)
- [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
- [.github/ISSUE_TEMPLATE/story.md](.github/ISSUE_TEMPLATE/story.md)
- [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)
- [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Repository branch protection settings](https://github.com/m4rise/doc-classifier-app/settings/branches)

## Need Help?

Open an issue or comment on the relevant PR. Clear communication beats hidden
assumptions.
