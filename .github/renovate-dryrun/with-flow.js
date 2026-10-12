module.exports = {
  dryRun: "full",
  requireConfig: "ignored",
  onboarding: false,
  extends: ["github>reddoorla/.github:renovate-config"],
  schedule: ["at any time"],
  lockFileMaintenance: {
    schedule: ["at any time"],
  },
  baseBranchPatterns: ["main", "staging"],
  packageRules: [
    {
      description: "On main: only patches and minors.",
      matchBaseBranches: ["main"],
      matchUpdateTypes: [
        "major",
        "lockFileMaintenance",
        "pin",
        "pinDigest",
        "digest",
        "rollback",
        "bump",
        "replacement",
      ],
      enabled: false,
    },
    {
      description: "On staging: everything but patches and minors, which already go to main.",
      matchBaseBranches: ["staging"],
      matchUpdateTypes: ["patch", "minor"],
      enabled: false,
    },
    {
      description: "The mark main-gate reads. Only this rule adds it.",
      matchBaseBranches: ["main"],
      matchUpdateTypes: ["patch", "minor"],
      addLabels: ["fast-track"],
    },
  ],
};
