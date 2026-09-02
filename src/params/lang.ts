import type { ParamMatcher } from "@sveltejs/kit";
import { isLangPrefix } from "$lib/locale";

// `[[lang=lang]]` — only "es" is a locale prefix; English is the bare path.
export const match: ParamMatcher = (param) => isLangPrefix(param);
