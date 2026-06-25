-- Bind cursor identity to document ownership and the stable list sort key.
-- The existing globally unique id makes this additive constraint safe for all rows.
CREATE UNIQUE INDEX "documents_userId_createdAt_id_key"
ON "documents"("userId", "createdAt", "id");
