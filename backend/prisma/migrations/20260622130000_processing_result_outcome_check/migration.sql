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
    AND "errorMessage" IS NULL
  )
  OR
  (
    "extractedText" IS NULL
    AND "classification" IS NULL
    AND "summary" IS NULL
    AND "confidenceScore" IS NULL
    AND "language" IS NULL
    AND "errorMessage" IS NOT NULL
    AND length(btrim("errorMessage")) > 0
  )
);
