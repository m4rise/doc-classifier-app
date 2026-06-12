---
name: bmad-github-dev-story
description: Implement doc-classifier BMAD stories from GitHub issues in a GitHub-first workflow. Use when the user asks to implement, continue, verify, or prepare a PR for a GitHub story issue where GitHub is the operational source of truth for AC, DoD, DoR, active status, branch, comments, and PR linkage, while BMAD local artifacts provide product context and traceability.
---

# BMAD GitHub Dev Story

## Operating Rule

For doc-classifier story issues, treat GitHub as the operational source of truth for AC, DoD, DoR, active status, comments, and PR linkage. Treat BMAD local artifacts as design context, generation history, and traceability that may lag until back-sync.

Use this skill for implementation. Use `monorepo-github-flow` for branch, commit, issue, and PR mechanics. If both skills apply, this skill decides what to implement and how to verify it; `monorepo-github-flow` decides how to name branches, write commits, fill templates, keep GitHub-facing content in English, and link the PR.

## Source Priority

Load context in this order:

1. GitHub issue URL or issue number.
2. Normalized issue context extracted from the issue.
3. BMAD Source linked from the issue.
4. Epic, architecture, or PRD docs only when needed.
5. Current application code and tests.

Do not block on stale local `status: backlog`, `DC-sprint-status.yaml`, or frontmatter if GitHub shows the issue is ready. Treat local status mismatches as sync hygiene issues, not implementation blockers.

## Application Repository Preflight

Before resolving or implementing a GitHub story:

- Run `git rev-parse --show-toplevel` and treat that path as the active repository root for implementation work.
- Verify the active root is the doc-classifier app repository before reading code or concluding files are missing. App-repository markers include `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/`, application source directories, and `docs/WORKFLOW.md`.
- If the active root is a specs/BMAD repository but the user references an app path, IDE tab, or repo name, check whether a sibling app repository exists under the active root's parent directory.
- If exactly one sibling repository matches the app path or repo name, use that repository for app code, tests, GitHub templates, branch, commit, and PR work.
- If multiple candidate repositories match, stop and ask the user for the intended app repository root.

## Issue Resolver

Before editing code, create a short normalized issue context in the working notes:

```text
repository:
issue:
story_id:
title:
state:
labels:
bmad_source:
suggested_branch:
prerequisites:
acceptance_criteria:
definition_of_ready:
definition_of_done:
implementation_notes:
```

Extract `story_id` from titles like `[2.5] Logout Use Case`. Extract `bmad_source` from the `BMAD Source` field. Use the suggested branch from the issue when present; otherwise derive `feature/DC-<issue-number>-<short-slug>`.

If AC or DoD are missing from GitHub, stop and ask the user before implementation. Use BMAD Source only to draft a clarification or proposed issue update, never as an implicit replacement for the GitHub contract. If BMAD Source is missing but the GitHub issue has enough AC and DoD, continue and note the traceability gap.

## Implementation Workflow

1. Confirm the issue is open or explicitly requested despite being closed.
2. Verify DoR and prerequisites from GitHub first, then code reality.
3. Check the current branch and worktree before changing files.
4. Create or switch to the suggested branch using `monorepo-github-flow` conventions.
5. Inspect the affected code and nearby tests before planning edits.
6. Implement only the issue scope, preserving existing architecture and patterns.
7. Add or update tests that prove the AC and important edge cases.
8. Run the smallest meaningful verification first, then broader tests when risk warrants.
9. Compare the final diff against every AC and DoD item.
10. Prepare PR-ready notes with summary, tests run, risks, and `Closes #<issue-number>`.

When writing final PR body content, keep GitHub references as plain text rather than inline code. Do not wrap issue numbers, PR numbers, branch names, closing keywords, or `Related Work` values in backticks, because that disables GitHub autolinking.

Keep the `bmad-dev-story` discipline even when using the more flexible `bmad-quick-dev` mental model: proceed sequentially, avoid scope creep, update tests with code, verify all AC, and leave a clear implementation status.

## BMAD Skill Compatibility

This skill supersedes `bmad-quick-dev` and `bmad-dev-story` as the driver for GitHub story issue implementation. Use its GitHub-first resolver to reconstruct the executable spec from GitHub, BMAD Source, code, and tests.

Borrow `bmad-quick-dev` flexibility when the implementation requires adapting to code reality. Borrow `bmad-dev-story` discipline for sequential execution, AC verification, testing, and status clarity.

Never let `bmad-dev-story`, local story frontmatter, `DC-sprint-status.yaml`, or any BMAD artifact override the GitHub issue contract for AC, DoD, DoR, active status, branch, or completion. If a local BMAD artifact disagrees with GitHub, continue from GitHub and record the mismatch as a sync or documentation follow-up.

Use `bmad-code-review` after implementation for a fresh acceptance-focused review. The acceptance contract for review is the GitHub issue AC and DoD, not stale local frontmatter.

## Sync And Traceability Rules

Always reference the issue in the PR body with `Closes #<issue-number>` when the PR completes the story. Do not put closing keywords in commits.

Treat the backticked forms in this skill as instruction examples only. In emitted PR content, write `Closes #123`, `Related to #456`, and similar references without backticks.

Do not manually edit generated BMAD metadata unless the user explicitly asks or the sync script requires it:

- `github_issue`
- `epic_github_issue`
- `suggested_branch`
- back-synced `status: done`

If GitHub and BMAD disagree:

1. Prefer GitHub for active implementation.
2. Check whether `sync/state.json` or the back-sync workflow explains the lag.
3. Use dry-run reconciliation before applying local metadata updates.
4. Do not import GitHub issue bodies back into BMAD unless explicitly requested.

During implementation, change AC in GitHub if the contract needs to change. Note substantial AC changes in the PR and decide later whether BMAD Source needs a product documentation update.

## Stop Conditions

Stop and ask the user when:

- no GitHub issue can be identified;
- GitHub lacks AC or DoD, even if BMAD Source contains candidate acceptance details;
- prerequisites are clearly unmet and cannot be satisfied within the issue scope;
- the worktree contains unrelated conflicting edits that make the implementation unsafe;
- the issue asks for a destructive migration, data loss, or security-sensitive change without enough acceptance detail.

## Completion Checklist

Before final response or PR creation, confirm:

- GitHub issue AC and DoD are satisfied or explicitly called out as incomplete.
- Tests were added or updated where the implementation risk warrants it.
- Relevant tests were run, or skipped with a concrete reason.
- Local BMAD status mismatches were treated as non-blocking sync issues.
- PR notes include summary, verification, and `Closes #<issue-number>`.
- Branch, commit, PR formatting, and GitHub-facing language follow `monorepo-github-flow`.
- Final PR body preserves GitHub autolinking by leaving issue/PR references, branch names, and `Related Work` values unquoted and without backticks.
