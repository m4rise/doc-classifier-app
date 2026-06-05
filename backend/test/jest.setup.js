// Load local .env for tests without overriding CI-provided environment variables.
// dotenv's default behavior does not override existing env vars, but we set
// `override: false` explicitly for clarity.
try {
  require('dotenv').config({ override: false });
} catch (e) {
  // If dotenv is not available for some reason, tests can still run using CI env.
  // Swallow the error to avoid failing the setup phase.
}
