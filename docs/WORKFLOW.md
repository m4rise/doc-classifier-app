# GitHub Flow & Release Workflow

This document is the operational workflow reference for contributors and agents
working on the GitHub repository `doc-classifier-app`. It defines how GitHub
issues, branches, commits, pull requests, CI, release automation, and BMAD
back-sync fit together.

For the detailed release train, staging, semantic-release, tag, and production
deploy runbook, see [RELEASE_DEPLOY_FLOW.md](./RELEASE_DEPLOY_FLOW.md).

## 0. Non-Negotiable Principles

- GitHub is the operational source of truth for active implementation work.
- Every human-authored PR intended for `main` must have a primary GitHub issue
  and a PR body closing it with `Closes #N`, `Fixes #N`, or `Resolves #N`.
- BMAD artifacts provide product context, planning history, architecture
  background, and traceability. They must not override the GitHub issue contract
  during implementation.
- Back-sync is a BMAD-only hygiene mechanism after a GitHub story issue closes.
  It is not part of GitHub-only work.
- All GitHub-facing content should be written in English: issue bodies, branch
  slugs, commit messages, PR body, labels, and review notes.
- All human-authored contributions must satisfy the same quality gates: valid
  issue, dedicated branch, Conventional Commits, completed PR template, valid
  labels, passing local checks where relevant, and green CI before merge.

## 1. Choose the Right Track

Use exactly one track before starting implementation.

### Track A - BMAD GitHub-First Story Work

Use this track for product stories imported from BMAD epics/stories.

Operational source of truth:

- The GitHub story issue is authoritative for Acceptance Criteria (AC),
  Definition of Ready (DoR), Definition of Done (DoD), active status, comments,
  branch guidance, and PR linkage.
- BMAD files are supporting context only. If BMAD files disagree with the
  GitHub issue, continue from GitHub and record the mismatch as a sync or
  documentation follow-up.
- If AC, DoR, or DoD are missing or ambiguous in GitHub, clarify the GitHub
  issue before implementation. Do not silently replace missing GitHub contract
  details with local BMAD content.

Repository and local path convention:

- `doc-classifier-app` is the GitHub repository name for the application.
- `doc-classifier-specs` is the GitHub repository name for the BMAD/specs
  repository used by back-sync automation.
- By default, local clones should use the same directory names as their GitHub
  repositories and live as siblings, for example:

  ```text
  <workspace>/
    doc-classifier-app/
    doc-classifier-specs/
  ```

- The exact local workspace path and operating-system user are intentionally
  irrelevant. `C:\Users\<user>\dev\...`, `/home/<user>/dev/...`, or another
  root are all valid.
- Small local naming differences are acceptable when a contributor knows their
  layout. They should not affect GitHub Actions, because CI checks out
  repositories explicitly. For local scripts and agent work, adjust only the
  sibling path prefix when the clone directory names differ.

Relevant app repo files, relative to the `doc-classifier-app/` repository root:

- `.github/ISSUE_TEMPLATE/story.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/back-sync-specs.yml`
- `.github/skills/bmad-github-dev-story/SKILL.md`
- `.github/skills/monorepo-github-flow/SKILL.md`

Relevant BMAD/specs paths, written from the `doc-classifier-app/` repository
root when `doc-classifier-specs` is checked out as a sibling directory:

- Local BMAD/specs repository clone, when available from the default sibling
  layout:
  `../doc-classifier-specs`
- BMAD source artifacts:
  `../doc-classifier-specs/_bmad-output/doc-classifier/`
- Story files:
  `../doc-classifier-specs/_bmad-output/doc-classifier/implementation-artifacts/`
- Sprint status:
  `../doc-classifier-specs/_bmad-output/doc-classifier/DC-sprint-status.yaml`
- BMAD scripts:
  `../doc-classifier-specs/scripts/import_epics_stories.py`
  `../doc-classifier-specs/scripts/sync_status.py`
- BMAD script documentation:
  `../doc-classifier-specs/scripts/README.md`

In GitHub Actions, the back-sync workflow does not use the sibling local path.
It checks out `m4rise/doc-classifier-specs` into `specs/`, then runs:

```bash
python scripts/sync_status.py \
  --issue-number "<issue-number>" \
  --issue-title  "<issue-title>" \
  --project-key  DC \
  --project-dir  doc-classifier
```

### Track B - GitHub-Only Work

Use this track for non-BMAD work: small features, external contributions,
maintenance, tooling, CI/CD, documentation, refactors, and reproducible bugs.

Operational source of truth:

- The GitHub issue and PR are the complete operational record.
- Do not require BMAD artifacts.
- Do not inspect the specs/BMAD repo unless the user explicitly provides a real
  BMAD trace.
- Do not create fake BMAD fields.
- Do not expect or trigger BMAD back-sync.

Issue template choice:

- Use `.github/ISSUE_TEMPLATE/feature_request.md` by default for non-BMAD
  features, improvements, refactors, tooling, documentation, and small
  improvised changes.
- Use `.github/ISSUE_TEMPLATE/bug_report.md` only for reproducible bugs or
  regressions.
- Do not use `.github/ISSUE_TEMPLATE/story.md` for Track B. It contains BMAD
  story fields such as `Project Key`, `Story ID`, `Epic`, `BMAD Source`, and
  `Suggested Branch`.

For Track B feature/change issues, fill:

- `Summary`
- `Type of Request`
- `Context & Motivation`
- `Proposed Solution`
- `Scope / Impacted Areas`
- `Traceability` with `N/A - GitHub-only work` for BMAD traceability
- `Acceptance Criteria / Definition of Done`
- `Breaking change?`
- `Risks / Points to watch` when relevant
- `Additional Context` when relevant

For Track B bug issues, fill:

- `Summary`
- `Affected Area`
- `Steps to Reproduce`
- `Expected Behavior`
- `Actual Behavior`
- `Severity`
- `Security / RGPD Impact`
- logs and environment details when available

If expected behavior or AC/DoD are not precise enough to verify the fix, clarify
the issue before implementation.

## 2. Issues and Traceability

- A primary GitHub issue is required for every human-authored mergeable PR to
  `main`.
- The PR description must contain a closing keyword for the primary issue:
  `Closes #N`, `Fixes #N`, or `Resolves #N`.
- `Related to #N` is allowed only for secondary context. It does not satisfy the
  primary issue closing requirement.
- Do not put closing keywords in commits. Put them in the PR body.
- The guard `.github/workflows/pr-traceability-guard.yml` blocks PRs to `main`
  without a closing keyword.
- Renovate bot PRs from `renovate/*` branches are the only automatic exception
  currently encoded in the traceability guard.

## 3. Branching

- Always create a dedicated branch for each feature, bugfix, refactor, chore,
  documentation change, or maintenance task.
- Start from an up-to-date `main` unless a specific exception is justified, such
  as adapting a Renovate branch.
- Include the primary issue number in human-authored branch names.

Branch patterns:

- `feature/DC-<issue-number>-<short-desc>` for features and story work.
- `fix/DC-<issue-number>-<short-desc>` for bug fixes and regressions.
- `docs/DC-<issue-number>-<short-desc>` for documentation changes.
- `chore/DC-<issue-number>-<short-desc>` for tooling, dependencies, config, or
  maintenance.

Examples:

- `feature/DC-42-nestjs-backend-bootstrap`
- `fix/DC-67-auth-token-expiry`
- `docs/DC-123-update-workflow`
- `chore/DC-124-renovate-breaking-change`

For BMAD story issues, prefer the `Suggested Branch` from the GitHub issue when
present. If it is absent, derive the branch from the primary issue number.

## 4. Conventional Commits

All commits and squash merge titles must follow Conventional Commits:

```text
type(scope): short summary
```

Examples:

- `feat(frontend): improve accessibility score`
- `fix(auth): handle expired refresh tokens`
- `chore(deps): adapt backend dependency breaking change`
- `docs(docs): update workflow reference`

Commitlint is enforced by `.husky/commit-msg`.

Use scopes allowed by `commitlint.config.cjs`:

- `auth`
- `users`
- `documents`
- `ai-pipeline`
- `search`
- `admin`
- `mcp`
- `rgpd`
- `domain`
- `application`
- `shared`
- `health`
- `observability`
- `frontend`
- `backend`
- `root`
- `ci-cd`
- `infra`
- `db`
- `docker`
- `dependencies`
- `release`
- `workspace`
- `deps`
- `types`
- `docs`
- `tests`

## 5. Pull Requests

- Open a PR for every branch. Never push directly to `main`.
- Use `.github/PULL_REQUEST_TEMPLATE.md`.
- Fill every relevant section. Do not leave placeholders that apply to the
  change.
- Add at least one valid repository label.
- List the AC/tasks actually addressed.
- Complete DoR/DoD checklists honestly. Mark non-applicable items only when the
  PR body explains why they do not apply.
- When `Risks / Points to watch` records deferred architecture, config,
  security, data, or operational debt, link the follow-up issue or explain why
  no follow-up is needed.
- Add reviewers when appropriate.
- Ensure the PR body contains a closing keyword for the primary issue.

### Related Work for Track A

For BMAD GitHub-first story work, keep the PR template field names and fill:

- `Branch`: current branch.
- `User Story`: `#<issue> - [N.M] <story title>`.
- `Epic`: linked epic issue if present in the story issue.
- `BMAD Story File`: the `BMAD Source` path from the GitHub issue, for example
  `_bmad-output/doc-classifier/implementation-artifacts/DC-N-M-<slug>.md`.
- `Closing Issue (required)`: `Closes #<primary-issue>`.
- `Related Issue(s) (optional)`: real related issues only.

### Related Work for Track B

For GitHub-only work, keep the PR template field names and fill:

- `Branch`: current branch.
- `User Story`: `#<primary-issue> - GitHub-only issue - <title>`.
- `Epic`: `N/A - GitHub-only work`, unless a real GitHub epic exists.
- `BMAD Story File`: `N/A - GitHub-only work`, unless a real BMAD trace was
  explicitly provided.
- `Closing Issue (required)`: `Closes #<primary-issue>`.
- `Related Issue(s) (optional)`: real related issues only.

## 6. Local Checks and Hooks

Recommended local checks before push or PR readiness:

```bash
npm run check
```

This runs:

- `npm run lint`
- `npm run test`
- `npm run build`

Additional targeted checks:

- `npm run test:e2e`
- backend or frontend package-level tests when the change is localized.

Husky hooks:

- `.husky/pre-commit` runs `npx lint-staged`.
- `.husky/commit-msg` runs commitlint.
- `.husky/pre-push` runs `.husky/check-pr-labels.js`.

The pre-push label check:

- fetches allowed labels from GitHub with `gh label list`;
- finds a PR for the current branch with `gh pr list --head`;
- skips label validation when no PR exists yet;
- blocks the push when an existing PR has no labels or unauthorized labels.

## 7. CI/CD Pipeline

### Pull Request CI

`.github/workflows/ci.yml` runs on PRs to `main` and on application-relevant
pushes to `main`.

Current PR CI jobs:

- `lint`: backend lint and frontend lint.
- `test-unit`: backend and frontend unit tests with coverage upload.
- `test-integration`: backend integration tests with PostgreSQL service.
- `test-e2e`: backend e2e tests with PostgreSQL service.
- `security`: backend/frontend `npm audit --audit-level=critical`, backend
  Docker image build for scanning, and Trivy scan.

The CI workflow does not currently run the root `npm run build` as a standalone
PR job. The build remains required locally through `npm run check` and in the PR
template testing checklist. Deploy workflows build the frontend during
deployment, and the security job builds the backend Docker image for scanning.

Pushes to `main` skip CI when every changed file is documentation, generated
release notes, GitHub issue/PR templates, GitHub skills, or other non-runtime
metadata covered by `paths-ignore`. Pull request CI is intentionally not
path-filtered so required PR checks do not remain pending for docs-only PRs.

### Release

`.github/workflows/release.yml` is manually dispatched from `main` when a
release train is ready. This allows several merged stories or a whole epic to be
published as one semantic release instead of releasing after each merge.

The workflow:

- verifies it was dispatched from `main`;
- requires a successful `CI` workflow run for the exact current `main` SHA;
- supports a `dry_run` input for release preview;
- runs `npx semantic-release`, using `RELEASE_TOKEN` to publish release
  artifacts, changelog updates, tags, and GitHub release notes.

The current semantic-release plugin set does not include
`@semantic-release/npm`; the Git tag and GitHub Release are the authoritative
version markers unless package version bumping is added later.

If the latest `main` SHA has no successful CI run, dispatch `CI` manually on
`main`, wait for it to pass, then dispatch `Release` again.

### Staging Deploy

`.github/workflows/staging-deploy.yml` is the optional staging train. Automatic
staging deploys run after successful push-based CI on `main` only when the
repository variable `ENABLE_STAGING_DEPLOY` is set to `true`.

The workflow detects whether the merged commit changed deployable backend or
frontend files. Backend-only changes skip frontend deploy, frontend-only changes
skip backend deploy, and docs-only changes do not reach this workflow because CI
is skipped on `main`.

Manual staging deploy is also available through `workflow_dispatch` with an
explicit ref/tag/SHA and backend/frontend toggles.

### Production Deploy

`.github/workflows/deploy.yml` is the production deploy workflow. It runs when a
GitHub Release is published, or manually through `workflow_dispatch` for an
explicit ref/tag/SHA.

It deploys:

- backend to Cloud Run after dependency install, Prisma generate, migrations,
  Docker build/push, and Cloud Run deploy;
- frontend to Firebase Hosting after dependency install and `npm run build`.

Production jobs target the `production-backend` and `production-frontend`
GitHub Environments. Configure environment reviewers, wait timers, or branch/tag
rules in GitHub repository settings when production needs an approval gate.

### Release Train Flow

Use this flow when several stories or a full epic should ship together:

1. Merge each story PR to `main` after normal PR CI and review.
2. Let optional staging deploy the accumulated `main` train.
3. Validate smoke checks and epic release criteria in GitHub.
4. Dispatch `Release` from `main` with `dry_run=true` if release notes need a
   preview.
5. Dispatch `Release` from `main` with `dry_run=false` when ready.
6. Let `Deploy Production` run from the published GitHub Release, or dispatch it
   manually with the created release tag.

See [RELEASE_DEPLOY_FLOW.md](./RELEASE_DEPLOY_FLOW.md) for examples, squash
merge title rules, dry-run commands, manual deploy cases, staging setup, and
troubleshooting.

## 8. BMAD Back-Sync

Back-sync is Track A only.

`.github/workflows/back-sync-specs.yml` runs on closed issues, but proceeds only
when the issue title matches the BMAD story pattern:

```text
[N.M] Story title
```

When the title matches, the workflow:

- checks out `m4rise/doc-classifier-specs` into `specs/`;
- installs Python dependencies;
- runs `scripts/sync_status.py` from the checked-out specs repo;
- passes `--project-key DC` and `--project-dir doc-classifier`;
- commits and pushes status/frontmatter updates when the sync changes files.

Back-sync must not be used for Track B GitHub-only issues. Track B ends with the
GitHub issue, PR, merge, and release/deploy record.

## 9. Renovate and Breaking Dependency Changes

Renovate bot PRs from `renovate/*` branches are exempted from the closing
keyword guard. Human-authored adaptation PRs are not exempt.

When a Renovate PR introduces a breaking change that requires code adaptation:

1. Do not merge the failing Renovate PR.
2. Create a dedicated GitHub issue describing the required adaptation.
3. Create a human adaptation branch from the Renovate branch.
4. Use an issue-numbered branch name when possible, for example
   `chore/DC-123-renovate-major-backend-dependencies`.
5. Implement the necessary code changes so CI passes.
6. Open a PR to `main` with `Closes #<adaptation-issue>`.
7. After the adaptation PR merges, close the original Renovate PR if it is
   obsolete.

Example:

```bash
git checkout renovate/major-backend-dependencies
git checkout -b chore/DC-123-renovate-major-backend-dependencies
```

This keeps the traceability chain clean:

```text
issue -> branch -> commits -> PR -> merge
```

## 10. Merge Strategy

- Use Squash and merge only.
- Do not use merge commits or rebase merges.
- The squash commit title must follow Conventional Commits.
- Confirm the PR has a closing keyword for the primary issue before merge.
- Confirm CI is green before merge.

## 11. Quick Reference

| Step              | Required                     | Reference                                                     |
| ----------------- | ---------------------------- | ------------------------------------------------------------- |
| Track selection   | Always                       | Track A BMAD GitHub-first or Track B GitHub-only              |
| Issue             | Always for human PRs         | `story.md`, `feature_request.md`, or `bug_report.md`          |
| Branch            | Always                       | `feature/DC-N-*`, `fix/DC-N-*`, `docs/DC-N-*`, `chore/DC-N-*` |
| Commit            | Always                       | Conventional Commits + `commitlint.config.cjs`                |
| PR                | Always                       | `.github/PULL_REQUEST_TEMPLATE.md`                            |
| Closing keyword   | Always for human PRs         | `Closes #N`, `Fixes #N`, or `Resolves #N`                     |
| Labels            | Required once PR exists      | `.husky/check-pr-labels.js`                                   |
| Local check       | Recommended before readiness | `npm run check`                                               |
| PR CI             | Required before merge        | `.github/workflows/ci.yml`                                    |
| Back-sync         | Track A only                 | `.github/workflows/back-sync-specs.yml`                       |
| Staging deploy    | Optional after CI on `main`  | `.github/workflows/staging-deploy.yml`                        |
| Release           | Manual release train         | `.github/workflows/release.yml`                               |
| Production deploy | Release-published or manual  | `.github/workflows/deploy.yml`                                |

## 12. Example Flows

### Track A - Existing BMAD Story Issue

1. Open the GitHub story issue, for example `#42`.
2. Verify AC, DoR, DoD, `BMAD Source`, and `Suggested Branch`.
3. If AC/DoD are missing in GitHub, clarify the issue before implementation.
4. Create or checkout the suggested branch, for example:

   ```bash
   git checkout main
   git pull --rebase origin main
   git checkout -b feature/DC-42-nestjs-backend-bootstrap
   ```

5. Implement only the issue scope.
6. Commit with Conventional Commits.
7. Run relevant checks.
8. Open a PR using the template and `Closes #42`.
9. Merge only after review and green CI.
10. Let BMAD back-sync run after the issue closes.

### Track B - GitHub-Only Feature

1. Create an issue from `.github/ISSUE_TEMPLATE/feature_request.md`.
2. Fill AC/DoD clearly enough to review.
3. Create a branch with the issue number:

   ```bash
   git checkout main
   git pull --rebase origin main
   git checkout -b feature/DC-123-add-export-filter
   ```

4. Implement the change.
5. Commit, for example:

   ```bash
   git commit -m "feat(documents): add export filter"
   ```

6. Run `npm run check` or targeted checks.
7. Open a PR with:
   - `User Story: #123 - GitHub-only issue - Add export filter`
   - `Epic: N/A - GitHub-only work`
   - `BMAD Story File: N/A - GitHub-only work`
   - `Closing Issue (required): Closes #123`
8. Merge only after review and green CI.

## 13. Agent Prompt Recipes

Use these prompts when asking an agent to apply the repository workflow. In
PowerShell, wrap prompts in single quotes so skill names such as
`$monorepo-github-flow` are not interpreted as shell variables.

### Track B - Diff-First Dry Run

Use this when local changes already exist and the agent must reconstruct the
GitHub-only issue and PR from the diff. This is the safest first pass because it
does not create GitHub resources.

```text
Use $monorepo-github-flow in Mode B diff-first.

Inspect the current local diff and reconstruct the smallest coherent GitHub-only change from it.
Do not use BMAD artifacts, do not inspect the specs repo, and do not mention back-sync.

Draft the feature_request issue body and the PR body from the diff, using the repository templates and English GitHub-facing content.
Do not run gh issue create or gh pr create yet.
Stop after showing me:
1. inferred issue title,
2. selected labels if knowable,
3. issue body,
4. proposed branch name placeholder,
5. PR title,
6. PR body,
7. proposed commands to run after confirmation.
```

PowerShell command form:

```powershell
codex 'Use $monorepo-github-flow in Mode B diff-first. Inspect the current local diff and reconstruct the smallest coherent GitHub-only change from it. Do not use BMAD artifacts, do not inspect the specs repo, and do not mention back-sync. Draft the feature_request issue body and the PR body from the diff, using the repository templates and English GitHub-facing content. Do not run gh issue create or gh pr create yet. Stop after showing me the inferred issue title, selected labels if knowable, issue body, proposed branch name placeholder, PR title, PR body, and proposed commands to run after confirmation.'
```

### Track B - Diff-First Execution After Approval

Use this only after reviewing and approving the dry-run issue and PR drafts.

```text
Use $monorepo-github-flow in Mode B diff-first.

Use the approved issue and PR drafts from this conversation.
Create the GitHub-only feature_request issue with gh.
Then create an issue-numbered branch from the current worktree, without committing on main.
Commit the current local changes with a valid Conventional Commit message.
Prepare or create the PR using .github/PULL_REQUEST_TEMPLATE.md, with N/A - GitHub-only work in BMAD-only fields and Closes #<created-issue>.
Do not use BMAD artifacts, do not inspect the specs repo, and do not mention back-sync.
```

### Track B - Existing GitHub Issue

Use this when a non-BMAD issue already exists.

```text
Use $monorepo-github-flow in Mode B.

Implement existing GitHub-only issue #<issue-number>.
Do not use BMAD artifacts, do not inspect the specs repo, and do not mention back-sync.
Create or switch to the issue-numbered branch, implement only the issue scope, run relevant checks, and prepare a PR using .github/PULL_REQUEST_TEMPLATE.md with Closes #<issue-number>.
```

### Track A - Existing BMAD Story Issue

Use this for BMAD story issues imported into GitHub.

```text
Use $bmad-github-dev-story and $monorepo-github-flow to implement GitHub issue #<issue-number>.

Treat GitHub as the operational source of truth for AC, DoR, DoD, status, comments, and PR linkage.
Use BMAD only as context if the issue links a BMAD Source.
Create or use the suggested branch, implement only the issue scope, run relevant checks, and prepare a PR with Closes #<issue-number>.
```

## 14. FAQ

### Can I make a micro-fix without an issue?

No for human-authored PRs intended for `main`. Create a small GitHub-only issue
from `feature_request.md` or `bug_report.md`, then close it from the PR body.

### Can I use `Related to #N` instead of `Closes #N`?

No for the primary issue. `Related to #N` is only secondary context and does not
satisfy `.github/workflows/pr-traceability-guard.yml`.

### Do I always have to fill DoR/DoD?

Yes, but adapt them to the change. For Track B docs/chore work, the DoD can be
simple and practical, but it must still be explicit enough to review.

### Should GitHub-only work mention BMAD?

No, unless the user explicitly provides a real BMAD trace. Otherwise use
`N/A - GitHub-only work` in BMAD-only PR fields.

### Should BMAD story work update local BMAD files during implementation?

Not by default. Implement from the GitHub issue. Let the back-sync workflow
update BMAD status after the issue closes, unless the user explicitly asks for a
manual BMAD documentation update.

## 15. Reference & Further Reading

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- [.github/ISSUE_TEMPLATE/story.md](../.github/ISSUE_TEMPLATE/story.md)
- [.github/ISSUE_TEMPLATE/feature_request.md](../.github/ISSUE_TEMPLATE/feature_request.md)
- [.github/ISSUE_TEMPLATE/bug_report.md](../.github/ISSUE_TEMPLATE/bug_report.md)
- [.github/workflows/pr-traceability-guard.yml](../.github/workflows/pr-traceability-guard.yml)
- [.github/workflows/back-sync-specs.yml](../.github/workflows/back-sync-specs.yml)
- [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [docs/RELEASE_DEPLOY_FLOW.md](./RELEASE_DEPLOY_FLOW.md)
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)
- [.github/skills/bmad-github-dev-story/SKILL.md](../.github/skills/bmad-github-dev-story/SKILL.md)
- [.github/skills/monorepo-github-flow/SKILL.md](../.github/skills/monorepo-github-flow/SKILL.md)
