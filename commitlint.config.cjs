module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        // Vertical slices — business domain
        "auth",
        "users",
        "documents",
        "ai-pipeline",
        "search",
        "admin",
        "mcp",
        "rgpd",
        // Clean Architecture transverse layers
        "domain",
        "application",
        "shared",
        "health",
        "observability",
        // Apps
        "frontend",
        "backend",
        // Repo root
        "root",
        // DevOps / tooling
        "ci-cd",
        "infra",
        "db",
        "docker",
        "dependencies",
        "release",
        "workspace",
        // Other
        "types",
        "docs",
        "tests",
      ],
    ],
  },
};
