# Doc Classifier Prod Smoke - Bruno

Open this folder in Bruno as a collection:

```bash
docs/bruno/doc-classifier-prod-smoke
```

Select the `Production` environment before running requests.

## Fixtures

Generate upload fixtures from Git Bash before running document upload requests:

```bash
cd docs/bruno/doc-classifier-prod-smoke
bash fixtures/generate-fixtures.sh
```

## Suggested Run Order

Run requests in sequence order. The first register request creates runtime variables:

- `smokeEmail`
- `accessToken`
- `refreshToken`
- `newRefreshToken`

Requests tagged `manual` need extra setup, for example an admin access token.

## Prod Warning

These requests create real prod users and real prod documents. Use only for smoke validation after deployment.
