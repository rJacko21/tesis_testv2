// Mensajes de commit con Conventional Commits (feat:, fix:, docs:, perf:, a11y:…).
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
        "a11y",
        "i18n",
      ],
    ],
  },
};

export default config;
