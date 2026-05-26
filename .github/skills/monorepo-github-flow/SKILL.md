---
name: monorepo-github-flow
description: 'Automate and standardize branch creation, commit, issue, and PR processes in a monorepo, following project conventions (WORKFLOW.md, commitlint, GitHub templates) with full traceability and English-only content.'
---
# SKILL.md — Monorepo GitHub Flow (Branch, Commit, Issue, PR)

## Purpose

Automate and standardize the process of:
- Branch creation following WORKFLOW.md conventions (always start from an up-to-date main unless exception justified)
- Commit using Conventional Commits and commitlint config (see below for examples)
- Issue creation using the `.github/ISSUE_TEMPLATE/feature_request.md` template (GH CLI + temp file, see below for best practices)
- Pull Request creation using the `.github/PULL_REQUEST_TEMPLATE.md` template (GH CLI + temp file, ensure all sections are filled)
- End-to-end traceability and English-only content, with all template sections properly filled and closing keyword in the PR

**Best practice:** Always review the generated issue/PR body before submission, even if automated.

---

## Step-by-step Workflow

### 1. Branch Creation


- Check the issue number or create the issue first if needed. If you skip syncing main, make sure your base is up to date and you are not introducing unnecessary conflicts.
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


- Use Conventional Commits (see commitlint config for allowed types/scopes).
    - Pattern: `<type>(<scope>): <short description>`
    - Examples:
        - `feat(auth): add login form validation`
        - `fix(api): handle 500 error on user fetch`
        - `chore(deps): ensure lockfile stability and update convergence across monorepo`
- **Do not include** the closing keyword in the commit (only in the PR).
- **Best practices:**
    - Always review your commit message: it should be clear, concise, and follow the convention.
    - If commitlint rejects your commit, fix the message; never force push a non-compliant commit.

### 3. Issue Creation (GH CLI + template)


- Generate a temporary file for the body (e.g. `/tmp/issue_body_<desc>.md`).
- Fill out every section of the `.github/ISSUE_TEMPLATE/feature_request.md` template in English, with clear and relevant content.
    - Example title: `Add login form validation`
    - Recommended labels: `feature`, `frontend`, `bug`, etc.
    - Assignee: always specify a responsible person if possible.
- Create the issue via GH CLI (pattern):
    ```sh
    gh issue create --title "<title>" --body-file /tmp/issue_body_<desc>.md --label "<labels>" --assignee "<user>"
    ```
    Example:
    ```sh
    gh issue create --title "Add login form validation" --body-file /tmp/issue_body_login.md --label "feature,frontend" --assignee "alice"
    ```
- Retrieve the issue number for use in branch/PR naming (automatically or from the returned URL).
- **Tip:** Pre-fill the template in an editor to avoid formatting errors.

### 4. Pull Request Creation (GH CLI + template)


- Generate a temporary file for the body (e.g. `/tmp/pr_body_<desc>.md`).
- Fill out every section of the `.github/PULL_REQUEST_TEMPLATE.md` template in English, with clear and relevant content.
    - Example title: `feat(auth): add login form validation`
    - "Closing Issue (required)" section: `Closes #1234`
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
    - Add relevant reviewers.

---

## Quality Criteria / Completion Checks

- Branch, issue, commit, and PR are all in English and consistent.
- Commit message follows commitlint config and Conventional Commits.
- Issue and PR are created via GH CLI with temporary files for bodies to avoid shell interpretation issues.
- PR contains the closing keyword in the description, not in the commit.
- All template sections are properly filled out (see `.github/ISSUE_TEMPLATE/feature_request.md` and `.github/PULL_REQUEST_TEMPLATE.md`).
- The branch is based on the latest main (unless exception justified and documented in the PR).
- The PR has at least one reviewer and all CI checks pass.

---

## Example Robust Automation Script

```sh
#!/bin/bash
set -e

# 1. Sync main (recommended)
git checkout main
git pull --rebase origin main

# 2. Create issue and extract number robustly
ISSUE_URL=$(gh issue create --title "$1" --body-file "$2" --label "$3" --assignee "$4")
if [ $? -ne 0 ] || [ -z "$ISSUE_URL" ]; then
  echo "❌ Failed to create issue. Aborting."
  exit 1
fi
ISSUE_NUMBER=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Could not extract issue number from: $ISSUE_URL"
  exit 1
fi

# 3. Create branch (conventional name)
BRANCH_NAME="feature/DC-${ISSUE_NUMBER}-$5"
git checkout -b "$BRANCH_NAME"

# 4. Make your changes manually, then:
# git add ...
# git commit -m "<conventional commit message>"
# (Check commitlint output)

# 5. Push branch
git push --set-upstream origin "$BRANCH_NAME"

# 6. Create PR (with title and body from template)
gh pr create --base main --head "$BRANCH_NAME" --title "$6" --body-file "$7"
# Add reviewers and labels if needed
```

---

## Troubleshooting

- **Commit rejected by commitlint:** Fix your commit message to match Conventional Commits. The error will be shown in the console. Example: `type(scope): message`.
- **No commits between main and feature/…:** Make sure you have committed and pushed your changes to the new branch. Check with `git log` and `git status`.
- **gpg failed to sign the data:** Run `fixgpgtty` or check your GPG agent configuration. See internal docs if needed.
- **PR/issue body not rendering correctly:** Always use a temp file for the body and reference the correct template. Check Markdown formatting.
- **Labels missing on issues:** Add at least one label if your workflow/CI expects it for issues. For PRs, labels can be added manually or by CI/labeller.
- **GH CLI error (e.g. authentication):** Check that you are authenticated (`gh auth status`).
- **Push conflict:** Rebase on main and resolve conflicts before re-pushing.

## Example Prompts
- “Create a feature branch, commit, issue, and PR for a new dependency update, following my workflow and referencing the correct templates.”
- “Automate the full GitHub flow for a bugfix, with all steps in English and using temp files for issue/PR bodies, referencing `.github/ISSUE_TEMPLATE/feature_request.md` and `.github/PULL_REQUEST_TEMPLATE.md`.”

## Bonnes pratiques
## Best Practices

- Always review the diff and PR body before submission.
- Document any exception to the process (e.g. no sync on main) in the PR.
- Prioritize clarity and traceability in all messages.

---

## Related Customizations

- Skill to automate the generation of issue/PR bodies from prompts or specs, referencing the correct templates.
- Skill to check commit and PR compliance before push.
