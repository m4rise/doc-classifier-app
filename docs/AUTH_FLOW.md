# Authentication and Refresh Flow

## Scope

This document describes the current authentication flow implemented in the
backend:

- registration;
- login;
- access token validation;
- refresh token issuance;
- refresh token rotation;
- refresh token revocation and reuse detection.

It documents the behavior that exists today. Logout is intentionally out of
scope for now and will be added later.

## Components

### HTTP endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

Defined in
[`backend/src/auth/presentation/auth.controller.ts`](../backend/src/auth/presentation/auth.controller.ts).

### Main use cases

- `RegisterUseCase`
- `LoginUseCase`
- `IssueAuthTokensUseCase`
- `RefreshTokenUseCase`

Configured in
[`backend/src/auth/auth.module.ts`](../backend/src/auth/auth.module.ts).

### Persistence

Refresh tokens are stored in the `refresh_tokens` table with the following
security-relevant fields:

- `jti`: unique JWT identifier
- `tokenHash`: Argon2 hash of the full refresh token string
- `userId`
- `expiresAt`
- `revokedAt`

Defined in
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

### JWT durations

- Access token: `15m`
- Refresh token: `7d`

Configured in
[`backend/src/auth/auth.module.ts`](../backend/src/auth/auth.module.ts)
and
[`backend/src/auth/infrastructure/security/jwt-auth-token-issuer.ts`](../backend/src/auth/infrastructure/security/jwt-auth-token-issuer.ts).

## High-level model

The system uses two different tokens:

- an access token, short-lived and stateless;
- a refresh token, long-lived and stateful.

The access token is only validated by JWT signature and expiration. It is not
looked up in the database during normal request authentication.

The refresh token is a signed JWT, but it is also tracked in the database. This
enables:

- token rotation;
- individual revocation;
- global revocation for one user after refresh-token reuse detection.

The rationale behind this design is documented in
[`docs/adr/ADR-SEC-003-refresh-token-revocation.md`](./adr/ADR-SEC-003-refresh-token-revocation.md).

## Dependency injection details

`IssueAuthTokensUseCase` and `RefreshTokenUseCase` are singleton providers by
default, but they receive callbacks rather than fixed values for time and JTI
generation:

- `() => new Date()`
- `randomUUID`

Configured in
[`backend/src/auth/auth.module.ts`](../backend/src/auth/auth.module.ts).

This means:

- the use case instance is reused;
- each call to `execute()` still gets a fresh date;
- each call to `createJti()` still gets a new UUID.

## Flow 1: Registration

### Route

`POST /api/v1/auth/register`

### Sequence

1. The controller validates the DTO with Nest `ValidationPipe`.
2. `RegisterUseCase` validates domain rules such as email, password, and TOS
   consent.
3. The password is hashed before persistence.
4. The user is created in the database.
5. No tokens are issued during registration.

### Relevant code

- [`backend/src/auth/presentation/auth.controller.ts`](../backend/src/auth/presentation/auth.controller.ts)
- [`backend/src/auth/application/use-cases/register.use-case.ts`](../backend/src/auth/application/use-cases/register.use-case.ts)

## Flow 2: Login

### Route

`POST /api/v1/auth/login`

### Sequence

1. `LocalAuthGuard` delegates to `LocalStrategy`.
2. `LocalStrategy` calls `LoginUseCase`.
3. `LoginUseCase`:
   - normalizes and validates the email;
   - loads credentials by email;
   - rejects inactive users;
   - verifies the password hash.
4. On success, the authenticated user is attached to `req.user`.
5. The controller calls `IssueAuthTokensUseCase`.
6. `IssueAuthTokensUseCase`:
   - generates a new `jti`;
   - issues a refresh token JWT containing `sub`, `email`, `role`, `jti`;
   - hashes the full refresh token string;
   - stores the refresh token record in the database;
   - issues an access token JWT;
   - returns both tokens to the client.

### Relevant code

- [`backend/src/auth/infrastructure/passport/local.strategy.ts`](../backend/src/auth/infrastructure/passport/local.strategy.ts)
- [`backend/src/auth/application/use-cases/login.use-case.ts`](../backend/src/auth/application/use-cases/login.use-case.ts)
- [`backend/src/auth/application/use-cases/issue-auth-tokens.use-case.ts`](../backend/src/auth/application/use-cases/issue-auth-tokens.use-case.ts)
- [`backend/src/auth/infrastructure/security/jwt-auth-token-issuer.ts`](../backend/src/auth/infrastructure/security/jwt-auth-token-issuer.ts)
- [`backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts`](../backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts)

### Security notes

- The database never stores the refresh token in plaintext.
- The `jti` allows direct lookup of the candidate row before hash verification.
- `expiresIn` returned to the client corresponds to the access token lifetime.

## Flow 3: Accessing protected routes

### Route example

`GET /api/v1/auth/me`

### Sequence

1. `JwtAuthGuard` extracts the bearer token.
2. `JwtStrategy` verifies the access token with the access secret.
3. If valid, the payload is mapped to an `AuthenticatedUser`.
4. The request proceeds without any database lookup.

### Relevant code

- [`backend/src/auth/infrastructure/passport/jwt-auth.guard.ts`](../backend/src/auth/infrastructure/passport/jwt-auth.guard.ts)
- [`backend/src/auth/infrastructure/passport/jwt.strategy.ts`](../backend/src/auth/infrastructure/passport/jwt.strategy.ts)
- [`backend/src/auth/presentation/auth.controller.ts`](../backend/src/auth/presentation/auth.controller.ts)

### Implication

Revoking refresh tokens does not immediately invalidate already-issued access
tokens. Those access tokens remain usable until their own expiration, which is
currently limited to 15 minutes.

## Flow 4: Refreshing tokens

### Route

`POST /api/v1/auth/refresh`

### Guard stage

Before business logic runs, `RefreshTokenGuard` and `RefreshTokenStrategy`
perform JWT-level checks:

1. extract the bearer token;
2. verify the refresh JWT signature with the refresh secret;
3. reject an expired refresh JWT with `Refresh token expired`;
4. attach both the raw refresh token and decoded payload to `req.user`.

### Business stage

`RefreshTokenUseCase.execute()` then applies the stateful checks:

1. load the persisted refresh token by `payload.jti`;
2. reject if no row exists;
3. reject if `payload.sub` does not match the persisted `userId`;
4. if `revokedAt` is already set:
   - revoke all non-revoked refresh tokens for the user;
   - raise `RefreshTokenReusedError`;
5. reject if `expiresAt` is in the past;
6. verify the raw bearer token against `tokenHash`;
7. reject if the hash check fails;
8. revoke the current refresh token row;
9. issue a brand-new access/refresh token pair.

This is refresh-token rotation: one refresh token is expected to be used once.

### Relevant code

- [`backend/src/auth/infrastructure/passport/refresh-token.guard.ts`](../backend/src/auth/infrastructure/passport/refresh-token.guard.ts)
- [`backend/src/auth/infrastructure/passport/refresh-token.strategy.ts`](../backend/src/auth/infrastructure/passport/refresh-token.strategy.ts)
- [`backend/src/auth/application/use-cases/refresh-token.use-case.ts`](../backend/src/auth/application/use-cases/refresh-token.use-case.ts)
- [`backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts`](../backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts)

## Revocation model

### Single-token revocation

After a successful refresh, the old token is revoked by setting `revokedAt` on
its row before issuing a new one.

Relevant code:

- [`backend/src/auth/application/use-cases/refresh-token.use-case.ts`](../backend/src/auth/application/use-cases/refresh-token.use-case.ts)
- [`backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts`](../backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts)

### Reuse detection and global revocation

If a token that has already been revoked is used again, the system treats it as
possible token theft or replay:

1. all active refresh tokens for the same user are revoked;
2. the request fails.

Relevant code:

- [`backend/src/auth/application/use-cases/refresh-token.use-case.ts`](../backend/src/auth/application/use-cases/refresh-token.use-case.ts)
- [`backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts`](../backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts)

### Important nuance

The controller intentionally maps both `RefreshTokenInvalidError` and
`RefreshTokenReusedError` to the same HTTP message: `Invalid refresh token`.

This avoids leaking too much detail to the client about the server-side token
state.

Relevant code:

- [`backend/src/auth/presentation/auth.controller.ts`](../backend/src/auth/presentation/auth.controller.ts)

## Error mapping summary

### Login

- invalid email or credentials -> `401 Invalid credentials`

### Refresh

- expired JWT at guard level -> `401 Refresh token expired`
- expired persisted token at use-case level -> `401 Refresh token expired`
- invalid token, missing DB row, subject mismatch, hash mismatch -> `401 Invalid refresh token`
- reuse detected -> `401 Invalid refresh token`

## Current limitations

- No explicit logout route exists yet.
- No explicit admin or user-facing session listing exists yet.
- Access tokens are not revoked server-side once issued.
- Expired or revoked refresh-token rows require periodic cleanup later.

## Planned extension: logout

When logout is added, this document should be extended with:

- the logout endpoint contract;
- whether logout revokes one session or all sessions;
- how the client supplies the refresh token for revocation;
- whether logout is idempotent;
- whether access tokens remain stateless after logout.

## Related files

- [`backend/src/auth/auth.module.ts`](../backend/src/auth/auth.module.ts)
- [`backend/src/auth/presentation/auth.controller.ts`](../backend/src/auth/presentation/auth.controller.ts)
- [`backend/src/auth/application/use-cases/login.use-case.ts`](../backend/src/auth/application/use-cases/login.use-case.ts)
- [`backend/src/auth/application/use-cases/issue-auth-tokens.use-case.ts`](../backend/src/auth/application/use-cases/issue-auth-tokens.use-case.ts)
- [`backend/src/auth/application/use-cases/refresh-token.use-case.ts`](../backend/src/auth/application/use-cases/refresh-token.use-case.ts)
- [`backend/src/auth/infrastructure/passport/local.strategy.ts`](../backend/src/auth/infrastructure/passport/local.strategy.ts)
- [`backend/src/auth/infrastructure/passport/jwt.strategy.ts`](../backend/src/auth/infrastructure/passport/jwt.strategy.ts)
- [`backend/src/auth/infrastructure/passport/refresh-token.strategy.ts`](../backend/src/auth/infrastructure/passport/refresh-token.strategy.ts)
- [`backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts`](../backend/src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts)
- [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
