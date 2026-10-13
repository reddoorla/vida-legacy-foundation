import { defineParams } from "@sveltejs/kit/params";
import { isLangPrefix } from "./lib/locale.ts";

// Kit 3 reads every param matcher from this one file (kit 2: one file per
// matcher under src/params/). A matcher returns the value, or undefined for
// no match; any other value, `false` included, is a match whose value it is.
// `[[lang=lang]]`: only "es" is a locale prefix, English is the bare path.
// `[[preview=preview]]` matches only the literal segment "preview".
export const params = defineParams({
  lang: (param) => (isLangPrefix(param) ? param : undefined),
  preview: (param) => (param === "preview" ? param : undefined),
});
