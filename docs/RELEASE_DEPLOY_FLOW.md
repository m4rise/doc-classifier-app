# Release and Deploy Flow

This runbook explains how the repository now moves from merged stories to
staging, semantic release, tags, GitHub Releases, and production deployment.

It is intentionally verbose. The goal is to make every path explicit so release
work does not depend on memory or guesswork.

## 1. Mental model

`main` is now an integration branch, not a direct production trigger.

The intended flow is:

```text
story PRs -> main -> optional staging train -> manual Release -> GitHub tag/release -> production deploy
```

This gives you two useful controls:

- you can merge several stories into `main` before publishing a release;
- you can decide when a GitHub Release and production deploy happen.

The important split is:

| Layer             | Workflow                               | Trigger                                         | Human intent                     |
| ----------------- | -------------------------------------- | ----------------------------------------------- | -------------------------------- |
| CI                | `.github/workflows/ci.yml`             | PRs, app-relevant pushes to `main`, manual      | prove the code is healthy        |
| Staging deploy    | `.github/workflows/staging-deploy.yml` | successful CI on `main` if enabled, or manual   | validate an integration train    |
| Release           | `.github/workflows/release.yml`        | manual only                                     | publish a selected release train |
| Production deploy | `.github/workflows/deploy.yml`         | GitHub Release published, or manual ref/tag/SHA | put a selected artifact in prod  |

## 2. What changed

### CI no longer deploys production indirectly

Before, this chain existed:

```text
push to main -> CI success -> Deploy
```

That meant a story merge, docs-only merge, or maintenance merge could trigger
production as soon as CI passed.

Now:

- PR CI still runs for every PR to `main`.
- Push CI on `main` skips docs/templates/skills/metadata-only changes through
  `paths-ignore`.
- The old `release` job was removed from `ci.yml`.
- Production deploy no longer listens to `workflow_run: CI`.

### Release is manual

`.github/workflows/release.yml` runs only through GitHub Actions
`workflow_dispatch`.

It:

1. requires that the run is dispatched from `main`;
2. checks that the exact current `main` SHA has a successful `CI` run;
3. supports `dry_run=true` to preview the next release;
4. runs `npx semantic-release` when `dry_run=false`.

### Production deploy is release-controlled

`.github/workflows/deploy.yml` is now named `Deploy Production`.

It runs when:

- a GitHub Release is published; or
- a human manually dispatches the workflow with an explicit ref, tag, or SHA.

### Staging is optional and gated

`.github/workflows/staging-deploy.yml` is available, but automatic staging is
off until the repository variable below is set:

```text
ENABLE_STAGING_DEPLOY=true
```

Manual staging deploy still works through the GitHub Actions UI, assuming the
staging secrets and variables are configured.

## 2.1 Manual action map

Use this table when you need to know whether an action is done in GitHub UI, via
CLI, or both. CLI examples are single-line commands that work in PowerShell and
Bash when `gh` is authenticated.

| Manual action                         | GitHub UI path                                                                     | CLI equivalent                                                                                             | Notes                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Inspect recent CI runs                | `Actions` -> `CI`                                                                  | `gh run list --workflow ci.yml --branch main --limit 5`                                                    | Useful before a release train.                              |
| Run CI on `main`                      | `Actions` -> `CI` -> `Run workflow` -> branch `main`                               | `gh workflow run ci.yml --ref main`                                                                        | Required when latest `main` SHA has no successful CI run.   |
| Preview release                       | `Actions` -> `Release` -> `Run workflow` -> branch `main` -> `dry_run=true`        | `gh workflow run release.yml --ref main -f dry_run=true`                                                   | Does not tag, publish, or deploy.                           |
| Publish release                       | `Actions` -> `Release` -> `Run workflow` -> branch `main` -> `dry_run=false`       | `gh workflow run release.yml --ref main -f dry_run=false`                                                  | Creates tag and GitHub Release when commits require it.     |
| Watch release/deploy runs             | `Actions` -> open the workflow run                                                 | `gh run list --workflow release.yml --branch main --limit 5`                                               | Use `gh run watch <run-id>` if you want terminal follow-up. |
| Manual production deploy              | `Actions` -> `Deploy Production` -> `Run workflow`                                 | `gh workflow run deploy.yml --ref main -f ref=v1.4.0 -f deploy_backend=true -f deploy_frontend=true`       | Prefer release tags over raw SHAs.                          |
| Backend-only production redeploy      | `Actions` -> `Deploy Production` -> `deploy_backend=true`, `deploy_frontend=false` | `gh workflow run deploy.yml --ref main -f ref=v1.4.0 -f deploy_backend=true -f deploy_frontend=false`      | Useful after transient Cloud Run failure.                   |
| Frontend-only production redeploy     | `Actions` -> `Deploy Production` -> `deploy_backend=false`, `deploy_frontend=true` | `gh workflow run deploy.yml --ref main -f ref=v1.4.0 -f deploy_backend=false -f deploy_frontend=true`      | Useful after transient Firebase failure.                    |
| Manual staging deploy                 | `Actions` -> `Deploy Staging` -> `Run workflow`                                    | `gh workflow run staging-deploy.yml --ref main -f ref=main -f deploy_backend=true -f deploy_frontend=true` | Requires staging secrets/vars to exist.                     |
| Enable automatic staging              | `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`                  | `gh variable set ENABLE_STAGING_DEPLOY --body "true" --repo "m4rise/doc-classifier-app"`                   | Do this only after staging infra is ready.                  |
| Disable automatic staging             | same as above                                                                      | `gh variable set ENABLE_STAGING_DEPLOY --body "false" --repo "m4rise/doc-classifier-app"`                  | Recommended until staging exists.                           |
| Set production DB deploy secret       | `Settings` -> `Environments` -> `production-backend` -> `Environment secrets`      | `gh secret set DATABASE_URL_PROD --env production-backend --repo "m4rise/doc-classifier-app"`              | Secret value is entered interactively.                      |
| Set staging DB deploy secret          | `Settings` -> `Environments` -> `staging-backend` -> `Environment secrets`         | `gh secret set DATABASE_URL_STAGING --env staging-backend --repo "m4rise/doc-classifier-app"`              | Only needed for staging.                                    |
| Set repo-level GCP/Firebase variables | `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`                  | `gh variable set FIREBASE_PROJECT_ID --body "doc-classifier-app" --repo "m4rise/doc-classifier-app"`       | Repeat for each non-sensitive variable.                     |
| Set repo-level WIF secrets            | `Settings` -> `Secrets and variables` -> `Actions` -> `Secrets`                    | `gh secret set WIF_PROVIDER --repo "m4rise/doc-classifier-app"`                                            | Secret value is entered interactively.                      |
| Configure production approval gates   | `Settings` -> `Environments` -> `production-backend` / `production-frontend`       | UI-first; do not script by default                                                                         | Protection rules are easy to misconfigure via API.          |
| Approve pending production deployment | Pending deployment banner in the GitHub Actions run                                | UI-first; do not script by default                                                                         | Keep human approval explicit and auditable.                 |

## 3. The release source of truth

The current release configuration is `.releaserc.json`:

```json
{
  "branches": ["main"],
  "tagFormat": "v${version}",
  "preset": "conventionalcommits"
}
```

The important consequences:

- releases are calculated only from commits reachable from `main`;
- tags use the format `v1.2.3`;
- `semantic-release` analyzes commit messages since the last release tag;
- `semantic-release` creates the Git tag and GitHub Release;
- `@semantic-release/changelog` updates `CHANGELOG.md`;
- `@semantic-release/git` commits release artifacts with
  `chore(release): ${nextRelease.version} [skip ci]`;
- because the current config does not include `@semantic-release/npm`, do not
  rely on `package.json` version being bumped automatically.

`package.json` is currently listed in the `@semantic-release/git` assets. That
means it would be committed if another release plugin changed it, but the
current plugin set does not itself perform an npm/package version bump.

## 4. Squash merge commit messages matter

Yes: the squash merge commit title matters a lot.

The repository uses "Squash and merge only". After a PR is squashed, the commit
that lands on `main` is what `semantic-release` sees. Your local branch commits
are useful during review, but the final release calculation depends on the
squash commit title and body that GitHub creates on `main`.

Before clicking "Confirm squash and merge", review the squash commit title.

Good examples:

```text
feat(auth): add refresh token rotation
fix(documents): reject unsupported MIME mismatch
perf(search): reduce query latency
docs(workflow): clarify release train process
chore(ci-cd): split release and production deploy
```

Bad examples:

```text
Implement story 2.4
Merge pull request #84
Updates
fixes
Story done
```

### Release impact examples

With the current conventional commit analyzer rules:

| Squash commit on `main`                                          | Release impact        | Why                                    |
| ---------------------------------------------------------------- | --------------------- | -------------------------------------- |
| `feat(auth): add password reset`                                 | minor                 | `feat` introduces a feature            |
| `fix(auth): handle expired refresh token`                        | patch                 | `fix` is a bug fix                     |
| `perf(search): reduce query latency`                             | patch                 | `perf` is performance-related          |
| `feat(api)!: change document response shape`                     | major                 | `!` marks a breaking change            |
| `fix(api): validate upload size` with `BREAKING CHANGE:` in body | major                 | breaking-change footer wins            |
| `docs(workflow): explain deploy flow`                            | no release by default | documentation is not release-producing |
| `test(auth): add refresh token tests`                            | no release by default | tests are not release-producing        |
| `chore(ci-cd): split release workflow`                           | no release by default | chores are not release-producing       |
| `refactor(auth): simplify token service`                         | no release by default | refactor has no default release impact |

When a train contains multiple commits, the highest release impact wins:

```text
fix(auth): handle expired token          -> patch
feat(documents): add DOCX upload support -> minor
docs(workflow): update release runbook   -> no release
```

Result: one minor release.

### Breaking changes

Use one of these forms when the release must be major:

```text
feat(api)!: change document upload response
```

or:

```text
feat(api): change document upload response

BREAKING CHANGE: clients must read documentId instead of id.
```

Only use breaking-change markers intentionally. They create a major release.

## 5. Normal daily story flow

Use this when implementing one BMAD story or one GitHub-only feature.

1. Create or use the issue.
2. Create the branch.
3. Implement the change.
4. Open the PR with `Closes #<issue-number>` in the PR body.
5. Wait for PR CI and review.
6. Squash and merge.
7. Before confirming the squash merge, fix the squash title if needed.

Example squash titles:

```text
feat(auth): implement logout endpoint
fix(documents): preserve upload owner id
docs(workflow): document release train
```

After merge:

- if the change was docs-only, push CI on `main` is skipped;
- if the change was app-relevant, CI runs on `main`;
- if staging is enabled, staging deploy can run after push CI succeeds;
- production does not deploy automatically from the story merge.

## 6. Release train flow

Use this when several stories should ship together.

Example train:

```text
Story 2.1 -> feat(auth): implement login use case
Story 2.2 -> feat(auth): implement refresh token rotation
Story 2.3 -> fix(auth): normalize invalid credentials response
Story 2.4 -> docs(auth): update auth flow documentation
```

Process:

1. Merge each story PR to `main` after PR CI and review.
2. Keep squash commit titles conventional.
3. Let `main` accumulate the train.
4. If staging is enabled, validate the accumulated train there.
5. Update the Epic issue Release / Deploy Gate checklist.
6. Dispatch `Release` with `dry_run=true`.
7. Review the predicted version and release notes.
8. Dispatch `Release` with `dry_run=false`.
9. Let `Deploy Production` run from the published GitHub Release.
10. Monitor Cloud Run, Firebase Hosting, Sentry, and smoke checks.

Expected release result:

- at least one `feat`: minor release;
- only `fix`/`perf`: patch release;
- any breaking change: major release;
- only docs/chore/test/refactor: no release.

## 7. Epic release flow

Use this when an epic is the release boundary.

1. Keep the Epic issue open while stories are still merging.
2. Check every story in the Epic issue.
3. Confirm:
   - all included stories are merged to `main`;
   - CI is green on `main`;
   - staging is validated, if enabled;
   - no security or RGPD concern is open;
   - the Epic Release / Deploy Gate is complete.
4. Dispatch `Release` with `dry_run=true`.
5. Check whether the release notes match the epic scope.
6. Dispatch `Release` with `dry_run=false`.
7. Let production deploy from the published GitHub Release.
8. Close or update the Epic issue after deployment evidence is recorded.

Do not put a closing keyword for an epic in a story PR unless that PR really
completes the entire epic.

## 8. Staging train flow

Staging is meant to answer this question:

```text
Is the current accumulated main train demonstrable before production?
```

### One-time setup

Configure the staging values documented in `docs/ci-cd-secrets.md`:

```text
DATABASE_URL_STAGING
CLOUD_RUN_STAGING_SERVICE
GCS_STAGING_BUCKET_NAME
FIREBASE_STAGING_PROJECT_ID
optional GCP_STAGING_PROJECT_ID
optional GCP_STAGING_REGION
```

Then enable automatic staging:

GitHub UI:

1. Go to `Settings`.
2. Open `Secrets and variables`.
3. Open `Actions`.
4. Open the `Variables` tab.
5. Add or update `ENABLE_STAGING_DEPLOY`.
6. Set its value to `true`.

CLI:

```bash
gh variable set ENABLE_STAGING_DEPLOY --body "true" --repo "m4rise/doc-classifier-app"
```

Keep it disabled with:

GitHub UI:

1. Go to `Settings`.
2. Open `Secrets and variables`.
3. Open `Actions`.
4. Open the `Variables` tab.
5. Add or update `ENABLE_STAGING_DEPLOY`.
6. Set its value to `false`.

CLI:

```bash
gh variable set ENABLE_STAGING_DEPLOY --body "false" --repo "m4rise/doc-classifier-app"
```

### Automatic staging

Automatic staging happens only when all are true:

- CI completed successfully;
- CI was triggered by a push to `main`;
- `ENABLE_STAGING_DEPLOY=true`;
- the changed files are deployable backend/frontend files.

The staging workflow skips component deploys where possible:

- backend-only change: backend deploy only;
- frontend-only change: frontend deploy only;
- test-only change: no staging deploy;
- docs-only change: no CI push run, therefore no staging deploy.

### Manual staging

Use manual staging when:

- staging is disabled by default, but you want to test one train;
- you want to deploy a specific SHA or tag;
- automatic staging was skipped and you still want to validate.

GitHub UI:

1. Go to `Actions`.
2. Open `Deploy Staging`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Fill `ref` with a SHA, branch, or tag if needed.
6. Choose `deploy_backend` and `deploy_frontend`.
7. Click `Run workflow`.

CLI:

```bash
gh workflow run staging-deploy.yml --ref main -f ref=main -f deploy_backend=true -f deploy_frontend=true
```

## 9. Release workflow in practice

### Dry run

Use dry run before a real release, especially for trains and epics.

GitHub UI:

1. Go to `Actions`.
2. Open `Release`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Set `dry_run=true`.
6. Click `Run workflow`.
7. Read the logs for:
   - proposed next version;
   - release type;
   - release notes;
   - commits included since the last tag.

CLI equivalent:

```bash
gh workflow run release.yml --ref main -f dry_run=true
```

### Real release

Run this when you have accepted the train.

GitHub UI:

1. Go to `Actions`.
2. Open `Release`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Set `dry_run=false`.
6. Click `Run workflow`.

CLI equivalent:

```bash
gh workflow run release.yml --ref main -f dry_run=false
```

The real release will:

1. analyze commits since the last `vX.Y.Z` tag;
2. decide whether a release is needed;
3. create the next tag, for example `v1.4.0`;
4. create/update `CHANGELOG.md`;
5. publish a GitHub Release;
6. create a release commit with `[skip ci]`;
7. trigger `Deploy Production` through the GitHub Release `published` event.

If no release-producing commits exist, `semantic-release` exits without creating
a tag or GitHub Release. Production deploy will not run automatically because no
GitHub Release was published.

## 10. Production deploy in practice

### Normal production deploy

The normal path is:

```text
Release workflow publishes GitHub Release -> Deploy Production starts automatically
```

The deploy ref is the release tag, for example:

```text
v1.4.0
```

### Environment approvals

Production jobs target these GitHub Environments:

```text
production-backend
production-frontend
```

If required reviewers or wait timers are configured in GitHub repository
settings, the deploy pauses until approval.

GitHub UI path:

1. Go to `Settings`.
2. Open `Environments`.
3. Select `production-backend` or `production-frontend`.
4. Configure required reviewers, wait timers, and deployment branch/tag rules.

CLI/API:

Use the GitHub UI for environment protection rules in normal operations. These
settings are safety gates, and they are easier to audit when changed manually in
the repository settings. Script them only as part of an explicitly reviewed
infrastructure automation change.

### Manual production deploy

Use manual production deploy only for explicit operational cases:

- redeploy the same release after transient infra failure;
- deploy only backend or only frontend;
- rollback to a previous tag;
- deploy a hotfix tag if automatic deploy was blocked;
- emergency deploy a specific SHA after an explicit decision.

GitHub UI:

1. Go to `Actions`.
2. Open `Deploy Production`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Fill `ref` with a release tag or SHA.
6. Choose `deploy_backend` and `deploy_frontend`.
7. Click `Run workflow`.

Examples:

```text
ref: v1.4.0
deploy_backend: true
deploy_frontend: true
```

```text
ref: v1.3.2
deploy_backend: true
deploy_frontend: false
```

CLI equivalents:

```bash
gh workflow run deploy.yml --ref main -f ref=v1.4.0 -f deploy_backend=true -f deploy_frontend=true
```

```bash
gh workflow run deploy.yml --ref main -f ref=v1.3.2 -f deploy_backend=true -f deploy_frontend=false
```

Prefer tags over raw SHAs for production. Tags are easier to audit.

## 11. Hotfix flow

Use this when production needs a small urgent fix.

1. Create a bug issue.
2. Branch from up-to-date `main`.
3. Implement the fix.
4. Open PR with `Closes #<issue-number>`.
5. Ensure PR CI is green.
6. Squash merge with a `fix(...)` title.
7. If staging is enabled, validate quickly in staging.
8. Dispatch `Release` with `dry_run=true`.
9. Dispatch `Release` with `dry_run=false`.
10. Approve production deploy if the environment requires approval.

Example squash title:

```text
fix(auth): reject reused refresh tokens
```

Expected release: patch.

## 12. Docs-only and test-only changes

### Docs-only

Examples:

```text
docs(workflow): explain release train flow
docs(auth): document refresh token behavior
```

Expected behavior:

- PR CI still runs before merge.
- Push CI on `main` is skipped when only ignored paths changed.
- Staging does not run.
- Release dry run should report no release unless other release-producing commits
  exist since the last tag.
- Production does not run.

### Test-only

Examples:

```text
test(auth): cover refresh token replay
```

Expected behavior:

- PR CI runs.
- Push CI on `main` may run because test files are not globally ignored.
- Staging detect step skips test-only paths.
- Release should not produce a version by default.
- Production does not run unless a separate release-producing commit is in the
  train.

## 13. Manual CI cases

`Release` requires a successful CI run for the exact current `main` SHA.

This is stricter than "the app code probably already passed". It is intentional
because the release tag should point to a verified commit.

You must manually run `CI` on `main` before `Release` when:

- the latest commit on `main` was docs-only and push CI was skipped;
- the previous push CI was canceled;
- the previous push CI failed and was fixed by a metadata-only commit;
- you want to release a train after a skipped push run.

GitHub UI:

1. Go to `Actions`.
2. Open `CI`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Click `Run workflow`.
6. Wait for all CI jobs to pass.
7. Dispatch `Release` again.

CLI:

```bash
gh workflow run ci.yml --ref main
```

## 14. Feature flags

There are two different ideas that people call "feature flags". Keep them
separate.

### Workflow flag

`ENABLE_STAGING_DEPLOY` is a repository variable controlling CI/CD automation.

It does not hide product functionality. It only decides whether successful
push-based CI on `main` should automatically deploy staging.

### Product feature flags

The current CI/CD change did not introduce product feature flags.

If you merge unfinished or risky product behavior to `main`, it can still be
released later. If a story must merge before it is visible to users, implement a
real application-level feature flag before merging.

Examples:

```text
FEATURE_ASYNC_PIPELINE=false
FEATURE_ADMIN_PANEL=false
```

Recommended policy:

- merge only completed, tested stories to `main`;
- use product feature flags for incomplete epic slices;
- keep flags default-off in production until the release decision;
- document flag state in the PR and Epic Release / Deploy Gate.

## 15. What not to do

Do not manually create normal release tags.

Normal path:

```text
Release workflow -> semantic-release -> tag -> GitHub Release -> production deploy
```

Avoid:

```bash
git tag v1.4.0
git push origin v1.4.0
```

Manual tags are only for explicit repair or migration operations. If you do one,
record why in the relevant issue or release notes.

Do not use `Deploy Production` on `main` for ordinary releases. Use the Release
workflow so tags, release notes, and deploy evidence stay connected.

Do not leave the GitHub squash title as a vague default. The final squash title
is release metadata.

Do not put `Closes #N` in commits. Closing keywords belong in the PR body.

Do not merge unfinished functionality to `main` unless it is genuinely safe to
release or protected by a real product feature flag.

## 16. Troubleshooting

### `Release` says no successful CI run exists for the SHA

Run `CI` manually on `main`, wait for success, then dispatch `Release` again.

This commonly happens after a docs-only commit because push CI is intentionally
skipped for ignored paths.

### `Release` dry run says no release will be created

Check the squash commits since the last tag:

```bash
git fetch --tags
git log --oneline "$(git describe --tags --abbrev=0)..HEAD"
```

If all commits are `docs`, `test`, `chore`, or `refactor`, no release is created
by default.

If a story should have produced a release, the squash merge title was probably
wrong. Fixing that after merge requires a follow-up release-producing commit or
a carefully reviewed history operation. Prefer a follow-up commit.

### Production deploy did not start after Release

Check:

- did `semantic-release` actually publish a GitHub Release?
- was the run `dry_run=false`?
- did `RELEASE_TOKEN` have enough permissions?
- did the GitHub Release event trigger `Deploy Production`?
- is the deploy waiting for environment approval?

### Staging did not run

Check:

- `ENABLE_STAGING_DEPLOY` is exactly `true`;
- CI ran from a push to `main`, not from a PR or manual event;
- CI concluded with `success`;
- the changed files matched deployable backend/frontend paths;
- staging environment secrets and variables exist.

### The release commit did not trigger CI

That is expected. The release commit message includes `[skip ci]`.

### `package.json` version did not change

That is expected with the current plugin set. The release tag and GitHub Release
are the authoritative version markers. Add and configure `@semantic-release/npm`
later if package version bumping becomes a requirement.

## 17. Quick command reference

Run CI on `main`:

```bash
gh workflow run ci.yml --ref main
```

Preview next release:

```bash
gh workflow run release.yml --ref main -f dry_run=true
```

Publish release:

```bash
gh workflow run release.yml --ref main -f dry_run=false
```

Deploy production tag:

```bash
gh workflow run deploy.yml --ref main \
  -f ref=v1.4.0 \
  -f deploy_backend=true \
  -f deploy_frontend=true
```

Deploy staging manually:

```bash
gh workflow run staging-deploy.yml --ref main \
  -f ref=main \
  -f deploy_backend=true \
  -f deploy_frontend=true
```

Enable automatic staging:

```bash
gh variable set ENABLE_STAGING_DEPLOY --body "true" --repo "m4rise/doc-classifier-app"
```

Disable automatic staging:

```bash
gh variable set ENABLE_STAGING_DEPLOY --body "false" --repo "m4rise/doc-classifier-app"
```

Inspect commits since last tag:

```bash
git fetch --tags
git log --oneline "$(git describe --tags --abbrev=0)..HEAD"
```

## 18. External references

- GitHub Actions workflow syntax:
  <https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions>
- GitHub Actions events:
  <https://docs.github.com/actions/using-workflows/events-that-trigger-workflows>
- GitHub deployment environments:
  <https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment>
- semantic-release configuration:
  <https://semantic-release.gitbook.io/semantic-release/usage/configuration>
- semantic-release commit analyzer:
  <https://github.com/semantic-release/commit-analyzer>
- semantic-release package version FAQ:
  <https://semantic-release.gitbook.io/semantic-release/support/faq>
