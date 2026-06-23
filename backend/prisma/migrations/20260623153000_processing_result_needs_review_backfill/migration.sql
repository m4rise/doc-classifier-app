UPDATE "processing_results"
SET "needsReview" = CASE
  WHEN "confidenceScore" IS NOT NULL AND "confidenceScore" < 0.70 THEN TRUE
  ELSE FALSE
END
WHERE "needsReview" IS NULL;

ALTER TABLE "processing_results"
ALTER COLUMN "needsReview" SET DEFAULT FALSE,
ALTER COLUMN "needsReview" SET NOT NULL;

ALTER TABLE "processing_results"
DROP CONSTRAINT "processing_results_outcome_shape_check";

ALTER TABLE "processing_results"
ADD CONSTRAINT "processing_results_outcome_shape_check"
CHECK (
  (
    "extractedText" IS NOT NULL
    AND "classification" IS NOT NULL
    AND "summary" IS NOT NULL
    AND "confidenceScore" IS NOT NULL
    AND "confidenceScore" >= 0
    AND "confidenceScore" <= 1
    AND "language" IS NOT NULL
    AND "needsReview" IS NOT NULL
    AND "errorMessage" IS NULL
  )
  OR
  (
    "extractedText" IS NULL
    AND "classification" IS NULL
    AND "summary" IS NULL
    AND "confidenceScore" IS NULL
    AND "language" IS NULL
    AND "needsReview" = FALSE
    AND "errorMessage" IS NOT NULL
    AND length(btrim("errorMessage")) > 0
  )
);
