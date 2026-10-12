module.exports = {
  dryRun: "full",
  requireConfig: "ignored",
  onboarding: false,
  extends: ["github>reddoorla/.github:renovate-config"],
  schedule: ["at any time"],
  lockFileMaintenance: {
    schedule: ["at any time"],
  },
};
