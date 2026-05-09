module.exports = {
  "*.{js,jsx,ts,tsx,cjs,mjs}": ["prettier --write"],
  "backend/**/*.{ts,js,json,md,yml,yaml}": [
    () => "npm --prefix backend run lint",
    "prettier --write",
  ],
  "frontend/**/*.{ts,tsx,js,jsx,vue,json,md,yml,yaml}": [
    () => "npm --prefix frontend run lint",
    "prettier --write",
  ],
};
