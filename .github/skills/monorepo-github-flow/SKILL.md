---
name: monorepo-github-flow
description: 'Automate and standardize GitHub mechanics in the doc-classifier monorepo for both BMAD story work and GitHub-only work: branch creation, Conventional Commits, issue creation, PR creation, labels, templates, and traceability. Use standalone for non-BMAD features, bug fixes, external contributions, chores, documentation, small improvised changes, and diff-driven local changes that must be converted into a compliant GitHub issue/branch/PR flow without BMAD back-sync. Use with bmad-github-dev-story when implementing BMAD story issues: that skill defines the GitHub issue contract and implementation scope; this skill handles branch/commit/PR mechanics and English-only GitHub-facing content.'
---
# SKILL.md - Monorepo GitHub Flow (Branch, Commit, Issue, PR)

## Purpose

Automate and standardize the process of:
- Branch creation following `docs/WORKFLOW.md` conventions (always start from an up-to-date main unless exception justified)
- Commits using Conventional Commits and `commitlint.config.cjs`
- Issue creation with the correct `.github/ISSUE_TEMPLATE/*` template when a new issue is needed
- Pull Request creation using `.github/PULL_REQUEST_TEMPLATE.md` (GH CLI + temp file, ensure all sections are filled)
- End-to-end traceability and English-only content, with all template sections properly filled and closing keyword in the PR
- GitHub-only work that deliberately has no BMAD Source, no specs repo dependency, and no back-sync
- Diff-driven local work where the change already exists and must be reconstructed into a compliant issue, branch, commit, and PR

**Best practice:** Always review the generated issue/PR body before submission, even if automated.

---

## Repository Preflight

Before any Mode A or Mode B branch, issue, PR, or diff-first action:

- Run `git rev-parse --show-toplevel` and treat that path as the active repository root for the next checks.
- Verify the active repository is the app repository before declaring that no local diff exists. App-repository markers include `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/`, `docs/WORKFLOW.md`, and `commitlint.config.cjs` when present.
- If `git status --short` is clean but the user references an IDE tab, repository name, or path outside the active root, resolve whether the referenced path is absolute, relative to the active root, or located in a sibling repository under the active root's parent directory.
- If exactly one sibling repository matches the referenced project name or file path, switch subsequent read-only inspection commands to that repository before concluding that the requested diff or template is absent.
- For Mode B GitHub-only work, resolve the app repository using only Git roots, path names, app repository files, and GitHub templates; do not inspect specs/BMAD content while finding the correct repository.
- If multiple candidate repositories match, stop and ask the user for the intended repository root.

---

## Workflow Mode Selection

Use exactly one mode before starting branch or PR work:

- **Mode A - BMAD story issue:** Use `bmad-github-dev-story` first. It owns the issue resolver, AC, DoD, DoR, implementation scope, and GitHub-first source-of-truth rule.
- **Mode B - GitHub-only work:** Use this skill standalone. GitHub issue + PR are the whole operational record. Do not require BMAD artifacts, do not inspect the specs repo, do not write BMAD metadata, and do not expect back-sync.

For Mode B, create or use a GitHub issue before branch creation and implementation for every mergeable PR.

Mode B can start from either:
- **Issue-first intake:** the user provides an existing issue or asks to create one from a request.
- **Diff-first intake:** local changes already exist. Reconstruct the issue and PR from `git status`, `git diff`, relevant docs/templates, and the user's context.

For diff-first intake, inspect the local diff before drafting GitHub content:
- run `git status --short` and inspect changed files;
- run `git diff --stat` and targeted `git diff -- <path>` for meaningful changed files;
- infer the smallest coherent intent, scope, impacted areas, tests/checks, and risks from the diff;
- classify the issue template from the diff: use `feature_request.md` for documentation, workflow, tooling, refactor, and feature changes; use `bug_report.md` only when the diff clearly fixes a reproducible bug/regression;
- draft the issue body in English with testable AC/DoD that match the actual diff;
- draft the PR body in English from the same evidence;
- if the diff contains unrelated changes or the intent is ambiguous, stop and ask before creating an issue or PR.

When diff-first work is currently on `main` with uncommitted changes, do not commit on `main`. Create or draft the GitHub issue first, then create an issue-numbered branch from the current worktree so the uncommitted changes move with the checkout.

Use `.github/ISSUE_TEMPLATE/feature_request.md` by default for non-BMAD features, improvements, refactors, tooling, documentation, and small improvised changes. Use `.github/ISSUE_TEMPLATE/bug_report.md` only for reproducible bugs or regressions. Do not use `.github/ISSUE_TEMPLATE/story.md` for Mode B because it carries BMAD story traceability fields (`Project Key`, `Story ID`, `Epic`, `BMAD Source`, `Suggested Branch`).

For a Mode B `feature_request.md` issue, fill the template sections from the GitHub-only source of truth:
- `Summary`: clear request or problem statement;
- `Type of Request`: check the matching type;
- `Context & Motivation`: why the change is needed;
- `Proposed Solution`: expected implementation direction or user-visible behavior;
- `Scope / Impacted Areas`: check relevant areas or `Not applicable`;
- `Traceability`: use `N/A - GitHub-only work` for BMAD traceability and list real related issues/PRs only when they exist;
- `Acceptance Criteria / Definition of Done`: required, testable, and specific enough to review;
- `Breaking change?`: check `Yes` or `No` when knowable;
- `Risks / Points to watch`: fill when there is technical, security, RGPD, migration, or UX risk;
- `Additional Context`: add screenshots, logs, links, ADRs, or notes only when relevant.

For a Mode B `bug_report.md` issue, the issue contract is reproducibility plus expected behavior. Fill `Summary`, `Affected Area`, `Steps to Reproduce`, `Expected Behavior`, `Actual Behavior`, `Severity`, and `Security / RGPD Impact`; add logs and environment details when available. If the expected behavior is not precise enough to verify the fix, update or clarify the issue before implementation.

External contributors can fully use Mode B with only the app repository and GitHub access.

## Boundary with BMAD GitHub Dev Story

This skill must not reinterpret BMAD artifacts, replace missing GitHub AC/DoD from local files, or decide whether a story is ready. It only handles GitHub mechanics after the primary issue context is known:
- branch creation or checkout;
- commit message shape;
- PR body, labels, reviewers, and closing keyword;
- creation of GitHub-only operational issues when no issue exists yet.

If the target is an existing BMAD story issue, do not create a replacement issue and do not rewrite the issue contract from BMAD. Use the issue number, `BMAD Source`, epic link, and suggested branch already present in GitHub.

If the target is GitHub-only work, do not add fake BMAD fields, do not invent a `BMAD Source`, and do not mention back-sync in the issue or PR. In the PR `Related Work` section, keep the template field names and fill them as follows:
- `Branch`: the current branch;
- `User Story`: `#<primary-issue> - GitHub-only issue - <title>`;
- `Epic`: `N/A - GitHub-only work` unless a real GitHub epic exists;
- `BMAD Story File`: `N/A - GitHub-only work` unless a real BMAD trace was explicitly provided;
- `Closing Issue (required)`: `Closes #<primary-issue>`;
- `Related Issue(s) (optional)`: real related issues only when they exist.

When generating the final issue or PR body, preserve GitHub autolinking: do not wrap issue numbers, PR numbers, branch names, closing keywords, or `Related Work` values in backticks unless they are being shown as documentation examples rather than emitted as final body content.

---

## Step-by-step Workflow

### 1. Branch Creation


- Check the issue number first. For mergeable PRs, a primary issue is required because `.github/workflows/pr-traceability-guard.yml` blocks PRs to `main` without a closing keyword, except Renovate bot PRs.
- For diff-first work with no issue yet, draft and create the GitHub issue before creating the branch. If the user asked for a dry run, stop after the issue and PR drafts plus proposed commands.
- For BMAD story issues, use the `Suggested Branch` from the issue when present. If absent, derive a branch from the primary issue number.
- For GitHub-only feature or bug work, derive the branch from the primary issue number.
- If you skip syncing main, make sure your base is up to date and you are not introducing unnecessary conflicts.
- Name the branch according to the pattern:
    - `feature/DC-<issue-number>-<short-desc>` (feature)
    - `fix/DC-<issue-number>-<short-desc>` (bugfix)
    - Example:
        - `feature/DC-1234-add-login-form`
        - `fix/DC-5678-fix-auth-bug`
- Create the branch (pattern):
    ```sh
    git checkout -b feature/DC-<issue-number>-<short-desc>
    ```
    Example:
    ```sh
    git checkout -b feature/DC-1234-add-login-form
    ```
- **Tip:** If the branch already exists, use `git checkout feature/DC-<issue-number>-<short-desc>`.

### 2. Commit


- Use Conventional Commits with scopes allowed by `commitlint.config.cjs`.
    - Pattern: `<type>(<scope>): <short description>`
    - Common valid scopes include: `auth`, `users`, `documents`, `ai-pipeline`, `search`, `admin`, `mcp`, `rgpd`, `domain`, `application`, `shared`, `health`, `observability`, `frontend`, `backend`, `root`, `ci-cd`, `infra`, `db`, `docker`, `dependencies`, `release`, `workspace`, `deps`, `types`, `docs`, `tests`.
    - Examples:
        - `feat(auth): add login form validation`
        - `fix(backend): handle user fetch failure`
        - `chore(deps): ensure lockfile stability and update convergence across monorepo`
- **Do not include** the closing keyword in the commit (only in the PR).
- **Best practices:**
    - Always review your commit message: it should be clear, concise, and follow the convention.
    - If commitlint rejects your commit, fix the message; never force push a non-compliant commit.

### 3. Issue Creation (GH CLI + template)


- Generate a temporary file for the body (e.g. `/tmp/issue_body_<desc>.md`).
- Choose the template deliberately:
    - Existing BMAD story issue: do not create a new issue.
    - New BMAD story or epic: prefer the BMAD-to-GitHub sync workflow from the specs repo. If manual creation is explicitly requested, use `.github/ISSUE_TEMPLATE/story.md` or `.github/ISSUE_TEMPLATE/epic.md` and keep GitHub AC/DoD/DoR authoritative after creation.
    - Non-BMAD feature/change: use `.github/ISSUE_TEMPLATE/feature_request.md`.
    - Bug/regression: use `.github/ISSUE_TEMPLATE/bug_report.md`.
- Fill out every section of the selected issue template in English, with clear and relevant content.
    - For GitHub-only work, the issue body is the source of truth. Do not reference BMAD unless the user explicitly provides a real BMAD trace.
    - Example title: `Add login form validation`
    - Recommended labels must exist in the repository; check with `gh label list` when unsure.
    - Assignee: always specify a responsible person if possible.
- For diff-first issue creation:
    - Use the diff as evidence, not as a license to invent broader scope.
    - Mention only user-visible or contributor-relevant outcomes, not every edited line.
    - AC/DoD must be verifiable from the resulting PR: docs updated, workflow rules clarified, skill behavior updated, checks run, etc.
    - `Traceability`: use `N/A - GitHub-only work` for BMAD traceability unless the diff explicitly includes a real BMAD story trace.
- Create the issue via GH CLI (pattern):
    ```sh
    gh issue create --title "<title>" --body-file /tmp/issue_body_<desc>.md --label "<labels>" --assignee "<user>"
    ```
    Example:
    ```sh
    gh issue create --title "Add login form validation" --body-file /tmp/issue_body_login.md --label "frontend" --assignee "alice"
    ```
- Retrieve the issue number for use in branch/PR naming (automatically or from the returned URL).
- **Tip:** Pre-fill the template in an editor to avoid formatting errors.

### 4. Pull Request Creation (GH CLI + template)


- Generate a temporary file for the body (e.g. `/tmp/pr_body_<desc>.md`).
- Fill out every section of the `.github/PULL_REQUEST_TEMPLATE.md` template in English, with clear and relevant content.
    - Example title: `feat(auth): add login form validation`
    - `Related Work`: keep the template field names. For GitHub-only work, put the primary issue in `User Story`, `Closes #<primary-issue>` in `Closing Issue (required)`, and `N/A - GitHub-only work` in BMAD-only fields that do not apply.
    - `Tasks / Acceptance Criteria Addressed`: mirror the GitHub issue AC/tasks that were actually implemented.
    - `Closing Issue (required)`: use `Closes #<primary-issue>` when the PR completes the issue.
    - Do not use a closing keyword for an epic unless the PR actually completes that epic.
    - In the final PR body, emit GitHub references as plain text, not inline code: write `Closes #123`, `Related to #456`, and `feature/DC-123-short-desc` without surrounding backticks so GitHub can autolink them.
- Create the PR via GH CLI (pattern):
    ```sh
    gh pr create --base main --head feature/DC-<issue-number>-<short-desc> --title "<commit message or PR title>" --body-file /tmp/pr_body_<desc>.md
    ```
    Example:
    ```sh
    gh pr create --base main --head feature/DC-1234-add-login-form --title "feat(auth): add login form validation" --body-file /tmp/pr_body_login.md
    ```
- **Best practices:**
    - Review the diff and PR body before submission.
    - Add at least one valid repository label before further pushes once the PR exists; the Husky pre-push hook blocks PRs with missing or unauthorized labels.
    - Add relevant reviewers.

---

## Quality Criteria / Completion Checks

- Branch, issue, commit, and PR are all in English and consistent.
- For diff-first work, issue title, issue AC/DoD, branch slug, commit message, and PR summary all describe the same coherent change set.
- Commit message follows commitlint config and Conventional Commits.
- Issue and PR are created via GH CLI with temporary files for bodies to avoid shell interpretation issues.
- PR contains the closing keyword in the description, not in the commit.
- All selected issue template sections and PR template sections are properly filled out.
- The branch is based on the latest main (unless exception justified and documented in the PR).
- The PR has at least one valid label, relevant reviewers when appropriate, and all CI checks pass.
- For BMAD story issues, PR traceability points to the GitHub issue contract and does not let local BMAD artifacts override it.
- For GitHub-only work, traceability is issue -> branch -> commits -> PR -> merge, with no BMAD or back-sync dependency.
- For architecture, config, security, data, or operational debt, the PR risk
  section links a follow-up issue or explains why no follow-up is needed.
- For backend changes, avoid introducing new ad hoc env resolvers, duplicated
  validation regexes, broad unknown-input guards, or runtime policy constants
  when the repository already has or clearly needs a centralized pattern.

---

## Example Existing-Issue Flow

```sh
#!/bin/bash
set -e

# 1. Sync main (recommended)
git checkout main
git pull --rebase origin main

# 2. Use an existing primary issue
ISSUE_NUMBER="$1"
SHORT_DESC="$2"
if [ -z "$ISSUE_NUMBER" ] || [ -z "$SHORT_DESC" ]; then
  echo "Usage: ./flow.sh <issue-number> <short-desc>"
  exit 1
fi

# 3. Create branch (conventional name)
BRANCH_NAME="feature/DC-${ISSUE_NUMBER}-${SHORT_DESC}"
git checkout -b "$BRANCH_NAME"

# 4. Make your changes manually, then:
# git add ...
# git commit -m "<conventional commit message>"
# (Check commitlint output)

# 5. Push branch
git push --set-upstream origin "$BRANCH_NAME"

# 6. Create PR with a body file filled from .github/PULL_REQUEST_TEMPLATE.md
gh pr create --base main --head "$BRANCH_NAME" --title "$3" --body-file "$4"
# Add valid labels and reviewers after PR creation.
```

---

## Troubleshooting

- **Commit rejected by commitlint:** Fix your commit message to match Conventional Commits. The error will be shown in the console. Example: `type(scope): message`.
- **No commits between main and feature/...:** Make sure you have committed and pushed your changes to the new branch. Check with `git log` and `git status`.
- **gpg failed to sign the data:** Run `fixgpgtty` or check your GPG agent configuration. See internal docs if needed.
- **PR/issue body not rendering correctly:** Always use a temp file for the body and reference the correct template. Check Markdown formatting.
- **Labels missing on issues:** Add at least one label if your workflow/CI expects it for issues. For PRs, labels can be added manually or by CI/labeller.
- **GH CLI error (e.g. authentication):** Check that you are authenticated (`gh auth status`).
- **Push conflict:** Rebase on main and resolve conflicts before re-pushing.

## Example Prompts
- "Create a feature branch and PR for existing GitHub issue #42, following my workflow and PR template."
- "Create a non-BMAD bug issue, branch, commit, and PR with English GitHub content and valid labels."
- "Use the current local diff to create a GitHub-only feature_request issue, then create the issue-numbered branch and prepare a PR. Do not use BMAD or back-sync."
- "Review the current local diff and draft the GitHub-only issue body and PR body only. Wait for my confirmation before running gh issue create or gh pr create."

## Bonnes pratiques
## Best Practices

- Always review the diff and PR body before submission.
- Document any exception to the process (e.g. no sync on main) in the PR.
- Prioritize clarity and traceability in all messages.

---

## Related Customizations

- Skill to automate the generation of issue/PR bodies from prompts or specs, referencing the correct templates.
- Skill to check commit and PR compliance before push.
