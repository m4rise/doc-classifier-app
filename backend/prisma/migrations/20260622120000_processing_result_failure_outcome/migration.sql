-- ProcessingResult represents the terminal outcome of a processing attempt.
-- Successful outcomes populate all analysis fields; failed outcomes populate
-- errorMessage and leave analysis fields NULL.
ALTER TABLE "processing_results"
  ALTER COLUMN "extractedText" DROP NOT NULL,
  ALTER COLUMN "classification" DROP NOT NULL,
  ALTER COLUMN "summary" DROP NOT NULL,
  ALTER COLUMN "confidenceScore" DROP NOT NULL,
  ALTER COLUMN "language" DROP NOT NULL;
