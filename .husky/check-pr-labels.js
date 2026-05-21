#!/usr/bin/env node

/**
 * Husky pre-push hook: block push if PR contains non-authorized labels
 * Usage: add to .husky/pre-push
 */

const { execSync } = require("child_process");

// Dynamically fetch allowed labels from the GitHub repository
function getAllowedLabels() {
  try {
    const raw = execSync(
      'gh label list --json name --jq ".[].name"',
    ).toString();
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (e) {
    console.error(
      "\n❌ Push blocked: Could not fetch allowed labels from GitHub.\n",
      e.message,
    );
    process.exit(1);
  }
}

const allowedLabels = getAllowedLabels();

try {
  // Get current branch
  const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  // Get PR number for this branch (if any)
  const pr = execSync(
    `gh pr list --head ${branch} --json number --jq '.[0].number'`,
  )
    .toString()
    .trim();
  if (!pr) {
    process.exit(0); // No PR, skip label check
  }
  // Get labels for the PR
  const labels = execSync(
    `gh pr view ${pr} --json labels --jq '.labels[].name'`,
  )
    .toString()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!labels.length) {
    console.error("\n❌ Push blocked: PR must have at least one label.\n");
    process.exit(1);
  }
  const unauthorized = labels.filter((l) => !allowedLabels.includes(l));
  if (unauthorized.length) {
    console.error(
      `\n❌ Push blocked: Unauthorized labels detected: ${unauthorized.join(", ")}\nAllowed labels: ${allowedLabels.join(", ")}\n`,
    );
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  console.error("\n❌ Push blocked: Error checking PR labels.\n", e.message);
  process.exit(1);
}
