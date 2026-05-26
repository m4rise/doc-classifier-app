
# GitHub Flow & Release Workflow

This document describes the complete workflow for contributing to this repository, ensuring compliance with all automation, naming, and quality conventions (labels, commit lint, changelog, release, etc.).

## 0. Choose the Right Track

Use one of these two contribution tracks:

- **Track A — BMAD-driven product scope (epics/stories):**
	- Source of truth lives in `doc-classifier-specs/_bmad-output/doc-classifier/`.
	- Sync to GitHub with `import_epics_stories.py`.
	- Back-sync on issue close with `sync_status.py` through `.github/workflows/back-sync-specs.yml`.
	- Full commands and scenarios are documented in `doc-classifier-specs/scripts/README.md`.

- **Track B — Non-BMAD operational work (maintenance, tooling, external user requests):**
	- Create a regular GitHub issue from `.github/ISSUE_TEMPLATE/feature_request.md` or `.github/ISSUE_TEMPLATE/bug_report.md`.
	- Create a dedicated branch named with the issue number.
	- Open a PR using the PR template and include a closing keyword (`Closes #N`, `Fixes #N`, `Resolves #N`).
	- CI enforces the closing keyword via `.github/workflows/pr-traceability-guard.yml`.

Both tracks must satisfy the same quality gates: Conventional Commits, PR template completion, CI green, and traceability from issue to PR.

---

## 1. Branching
- **Always create a dedicated branch** for each feature, bugfix, refactor, or improvement.
- **Branch naming** — include the issue number for full BMAD traceability:
	- `feature/DC-{issue-number}-<short-desc>` (feature / story)
	- `fix/DC-{issue-number}-<short-desc>` (bugfix)
	- `chore/<short-desc>` (tooling, config — no issue required)
	- `docs/<short-desc>` (documentation — no issue required)
	- Examples:
		- `feature/DC-42-nestjs-backend-bootstrap`
		- `fix/DC-67-auth-token-expiry`
	- The issue number is suggested in the GitHub story issue body under **Suggested Branch**.

## 2. Conventional Commits
- **All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):**
	- `type(scope): short summary`
	- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, etc.
	- Scope: matches a domain, module, or label (e.g. `frontend`, `ci-cd`, `docs`)
	- Example: `feat(frontend): improve accessibility score`
- **Commit messages are linted** (pre-commit hook).

## 3. Pull Requests (PR)
- **Open a PR for every branch** (no direct pushes to `main`).
- **Fill out the PR template:**
	- Reference at least one User Story, Epic, or Issue (if possible).
	- Add at least one label (required by pre-push hook).
	- Complete DoR/DoD checklists.
	- List Acceptance Criteria and Implementation Tasks addressed.
- **Label your PR:**
	- Use only labels defined in the repository (enforced by pre-push hook).
- **Link issues/stories/epics:**
	- Use `Closes #XX` or `Related to #YY` in the PR description for traceability.
	- PRs without a closing keyword for the primary issue are blocked by `.github/workflows/pr-traceability-guard.yml`.

## 4. Local Checks Before Push
- **Run all tests, lint, and build locally:**
	- `npm run test`, `npm run lint`, `npm run build`
- **Pre-push hooks enforce:**
	- Commit message format
	- PR label compliance
	- (Optionally) other custom checks

## 5. CI/CD Pipeline
- **CI runs on every PR:**
	- Lint, test, build, security checks, coverage, etc.
	- PR must be green before merge.

## 5.1 App -> Specs Back-Sync
- On issue close, `.github/workflows/back-sync-specs.yml` syncs status back to `doc-classifier-specs`.
- The workflow runs `scripts/sync_status.py` in the specs repo and commits the resulting status/frontmatter updates.
- This keeps BMAD artifacts aligned even when implementation work started from a GitHub issue.

## 6. Merge Strategy
- **Squash & merge** only (no merge commits, no rebase merges).
- **Squash commit message** should follow Conventional Commits (for changelog/release automation).

## 7. Release & Changelog Automation
- **semantic-release** (or similar) runs on `main` after merge:
	- Analyzes commit messages to determine version bump.
	- Generates/updates `CHANGELOG.md`.
	- Creates a GitHub release and tag.
	- (Optionally) triggers deployment.

## 8. Best Practices
- **Never push directly to `main`.**
- **Batch small fixes** in a single PR if needed, but always use the template and label.
- **Keep PRs focused**: one logical change per PR.
- **Update documentation** if your change affects usage, APIs, or architecture.

---

## Quick Reference Table
| Step         | Required? | Tool/Check           | Convention/Rule                |
|--------------|-----------|----------------------|--------------------------------|
| Branch       | Always    | Naming, PR required  | `feat/`, `fix/`, `chore/`...   |
| Commit       | Always    | Commitlint           | Conventional Commits           |
| PR           | Always    | PR Template, Labels  | Label from repo, traceability  |
| Local Check  | Always    | Test/Lint/Build      | All green before push          |
| CI           | Always    | GitHub Actions       | All green before merge         |
| Merge        | Always    | Squash & Merge       | Conventional commit message    |
| Release      | Auto      | semantic-release     | Changelog, version, release    |

---

## Example Flow
1. `git checkout -b feat/frontend-accessibility-audit`
2. Make changes, commit with `feat(frontend): ...` messages
3. Push branch, open PR, fill template, add label(s), link issue/story
4. Ensure all checks pass (local + CI)
5. Squash & merge PR to `main`
6. Release & changelog auto-generated

---

## FAQ

- **Q: Can I make a micro-fix without an issue?**
	- A: Yes, but always open a branch and PR, and explain in the PR template why there is no linked issue.
- **Q: Can I use a custom label?**
	- A: No, only labels defined in the repository are allowed (enforced by the Husky pre-push hook).
- **Q: Do I always have to fill out DoR/DoD?**
	- A: Yes, even for chores or docs. Adapt the criteria as needed, but always check them.

---

## Reference & Further Reading

- This workflow is the reference for all agents, scripts, and contributors.
- See also: [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed daily workflow, commit/PR examples, and branch protection rules. Both documents are complementary and must be followed for all contributions and automation.
