import { createEslintConfig } from "@reddoorla/maintenance/configs/eslint";
import svelteConfig from "./svelte.config.js";

export default [
  ...createEslintConfig({ svelteConfig }),
  // Mutation-audit output (docs/mutation-audit.md). Both are gitignored, but
  // `stryker run` leaves .stryker-tmp/ behind when a run is interrupted — and
  // it holds a full copy of src/, so `pnpm lint` then fails with hundreds of
  // parser errors against files that are not the source tree.
  { ignores: [".stryker-tmp/", "reports/"] },
];
