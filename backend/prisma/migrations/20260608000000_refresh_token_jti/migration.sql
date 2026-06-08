-- Refresh token JWT identifier used for direct lookup before hash verification.
ALTER TABLE "refresh_tokens" ADD COLUMN "jti" TEXT;

UPDATE "refresh_tokens"
SET "jti" = 'legacy-' || "id"
WHERE "jti" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "jti" SET NOT NULL;

CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");
