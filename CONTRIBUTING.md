
# Contributing Guide

Welcome! This project uses **GitHub Flow** and strict automation for quality and traceability.

**For all workflow, naming, automation, and release conventions, see:**
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — _Reference for all agents, scripts, and contributors_

**This CONTRIBUTING guide focuses on practical daily steps, PR etiquette, and collaboration tips.**


---

## Quick Workflow Reference

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for:
- Branch naming rules
- Commit message conventions
- PR/label/DoR/DoD requirements
- CI, release, and changelog automation
- FAQ and best practices

---

---


## Daily Workflow (Practical Steps)

### 1. Create a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/42-short-description
```



**Branch naming convention:** See [docs/WORKFLOW.md](docs/WORKFLOW.md) for full rules. Always include the issue number if possible.

> allowing the push. Labels are auto-applied by the labeler bot, but you can
> also set them manually in the GitHub UI.


> The pre-push hook will check that your PR has at least one valid label before allowing the push. Labels are auto-applied by the labeler bot, but you can also set them manually in the GitHub UI. See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the list of allowed labels.

### 2. Commit Often, Write Clear Messages

```bash
git add .
git commit -m "feat(auth): implement login use-case"
```


**Commit message format:** See [docs/WORKFLOW.md](docs/WORKFLOW.md) for full Conventional Commits rules and examples.

### 3. Push to Remote

```bash
git push -u origin feature/42-short-description
```

### 4. Create a Pull Request

Go to [GitHub Repo](https://github.com/m4rise/doc-classifier-app) → **Pull Requests** → **New PR**


**PR Title:** Same format as commit message (see [docs/WORKFLOW.md](docs/WORKFLOW.md)).



**PR Description:**
- Use the PR template (auto-filled by GitHub)
- Reference issues/stories/epics as described in [docs/WORKFLOW.md](docs/WORKFLOW.md)

### 5. Review & Approval

- **Solo dev?** Review your own changes, then approve
- **With a partner?** Wait for their review, address feedback

Reviewers will:
- Check code quality
- Verify tests pass on CI
- Leave comments for improvements

### 6. Merge & Clean Up

Once approved and CI is green ✅:

1. **GitHub UI** → Click "Squash and merge"
   - This combines all commits into a single clean commit
   - Keeps `main` history readable

2. **Delete feature branch** (GitHub UI offers this auto-cleanup option)
   - Keeps repo clean

3. **Local cleanup:**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/42-short-description
   ```

---

## Working in Parallel (Multiple Developers)

### Scenario: You + Partner Both Working

```
You work on:         Partner works on:
feature/auth-login   feature/document-upload
       ↓                    ↓
      PR (you review)      PR (partner reviews)
       ↓                    ↓
    MERGE ←────→ MERGE
       ↓                    ↓
       └──── main ────┘
          (clean history)
```

**Key:** No interaction between branches until `main`. Zero merge conflicts.

### Pulling Latest Changes

```bash
# You just merged partner's PR
git checkout main
git pull origin main  # ← Gets their squash-merged commit

# Start your next feature with latest code
git checkout -b feature/next-thing
```

---

## CI/CD Pipeline

Every PR runs GitHub Actions:

```
PR Created
    ↓
CI Triggered (5 jobs run in parallel)
    ├─ lint        — ESLint (backend + frontend)
    ├─ test-unit   — Jest + Vitest with coverage → Codecov
    ├─ test-integration — Jest e2e (PostgreSQL via service container)
    ├─ security    — Trivy image scan (CRITICAL/HIGH)
    └─ release     — semantic-release (main branch only)
    ↓
If all ✅ → PR shows "All checks passed"
If any ❌ → PR blocked until fixed
    ↓
Can only merge if:
  ✓ PR approved
  ✓ CI green
  ✓ Branch up-to-date with main
  ✓ PR has a valid label (checked by pre-push hook)
```

---


## Branch Protection Rules

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for up-to-date branch protection and automation requirements.

---

## Common Commands Reference

```bash
# Start a feature (always link to an issue number)
git checkout -b feature/42-short-description
git push -u origin feature/42-short-description

# Keep your feature branch updated (while working)
git fetch origin
git rebase origin/main

# Before creating PR, check everything locally
npm run check  # lint + test + build

# After PR is merged
git checkout main
git pull origin main
git branch -d feature/42-short-description

# View recent branches
git branch -v

# Fetch all branches
git fetch origin
```

---


## FAQ

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the full FAQ and best practices.

---

## Useful Links

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Repo Branch Protection Settings](https://github.com/m4rise/doc-classifier-app/settings/branches)

---

## Need Help?

Post an issue or comment on a PR. Clear communication > perfect code.
