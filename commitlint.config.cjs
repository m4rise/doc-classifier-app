module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "documents",
        "ai",
        "users",
        "analytics",
        "auth",
        "admin",
        "mcp",
        "shared",
        "infra",
        "ci",
        "deps",
        "frontend",
      ],
    ],
  },
};
