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
        "ai",
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
        // Frontend
        "frontend",
        // DevOps / tooling
        "ci-cd",
        "infra",
        "db",
        "docker",
        "deps",
        "release",
        "workspace",
      ],
    ],
  },
};
