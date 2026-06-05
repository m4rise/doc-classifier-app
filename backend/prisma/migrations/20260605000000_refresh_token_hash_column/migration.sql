-- Refresh tokens are stored hashed only; no plaintext token is persisted.
ALTER TABLE "refresh_tokens" RENAME COLUMN "token" TO "tokenHash";
