import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { compile } from "tailwindcss";

/**
 * WCAG contrast for unit tests, computed from the stylesheet the site really
 * ships, so a test can hold AA without pinning WHICH colour a designer picked.
 *
 * jsdom applies no CSS, so this does the browser's job for the part a test
 * needs. It compiles app.css with Tailwind (the same `@theme` tokens, the same
 * utility order the build emits) for every class in the rendered document,
 * then runs the cascade over the rules that match an element by one class or
 * one tag: `!important` first, then layer (theme < base < components <
 * utilities < unlayered), then specificity, then source order. So two
 * utilities fighting over one property on the same element resolve the way the
 * browser resolves them, and `bg-x!` beats a `bg-white` a child component sets
 * on the same element, while plain `bg-x` loses to it. Reading class names
 * instead is the hole an earlier version of this file had: it stripped the `!`
 * and saw only the token it was looking for.
 *
 * `opacity` is modelled the way a browser composites it: an element and its
 * whole subtree are drawn at the product of their own and every ancestor's
 * opacity. Text and borders take that product into their alpha, so ink at
 * `opacity-30` is laid over its ground at 30%. A background drawn inside a
 * faded element is the one case that alpha cannot express (the faded group
 * would cover its own ground and what lies under it at once), so `groundOf`
 * throws there rather than answer.
 *
 * What it does not model: variants (`hover:`, `md:` — only declarations made
 * directly in a rule count, see `declaredAnywhere` for the rest), compound
 * selectors, and Svelte's scoped component styles, which vitest does not load:
 * a ground a component sets in its own `<style>` block is invisible, so text
 * on it is measured against the nearest utility ground outside it. Nor UA
 * styles beyond `body`: a `<dialog>`'s UA `color: CanvasText` is not seen, so
 * text that inherits through a dialog without its own colour is measured as
 * inheriting from outside it. The page's own text colour, which nothing on
 * this site sets, is the UA's black.
 */

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const twDir = dirname(require.resolve("tailwindcss/package.json"));

const appCss = readFileSync(resolve(root, "src/app.css"), "utf8");
// Every token app.css declares, used or not; the build emits only the used ones.
const sourceVars = new Map(
  [...appCss.slice(appCss.indexOf("@theme")).matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map(
    ([, name, value]) => [name, value.trim()] as [string, string],
  ),
);

const compiler = await compile(appCss, {
  base: resolve(root, "src"),
  loadStylesheet: async (id: string, base: string) => {
    const path = id === "tailwindcss" ? resolve(twDir, "index.css") : resolve(base, id);
    return { path, base: dirname(path), content: readFileSync(path, "utf8") };
  },
});

// ---------------------------------------------------------------- the sheet

interface Decl {
  prop: string;
  value: string;
  important: boolean;
}
interface Node {
  prelude: string;
  decls: Decl[];
  children: Node[];
}

function parse(css: string): Node[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  function block(): { decls: Decl[]; children: Node[] } {
    const decls: Decl[] = [];
    const children: Node[] = [];
    let buf = "";
    while (i < src.length) {
      const ch = src[i++];
      if (ch === "{") {
        const prelude = buf.trim();
        buf = "";
        const inner = block();
        children.push({ prelude, ...inner });
      } else if (ch === "}") {
        break;
      } else if (ch === ";") {
        pushDecl(buf, decls, children);
        buf = "";
      } else {
        buf += ch;
      }
    }
    pushDecl(buf, decls, children);
    return { decls, children };
  }
  function pushDecl(text: string, decls: Decl[], children: Node[]) {
    const t = text.trim();
    if (!t) return;
    // A statement at-rule (`@layer a, b;`) is not a declaration.
    if (t.startsWith("@")) {
      children.push({ prelude: t, decls: [], children: [] });
      return;
    }
    const colon = t.indexOf(":");
    if (colon < 0) return;
    let value = t.slice(colon + 1).trim();
    const important = /!important$/.test(value);
    if (important) value = value.replace(/\s*!important$/, "");
    decls.push({ prop: t.slice(0, colon).trim(), value, important });
  }
  return block().children;
}

const LAYERS = ["theme", "base", "components", "utilities"];
const UNLAYERED = LAYERS.length;

interface Rule {
  /** One class name, unescaped, or one tag name, or `:root`. */
  key: string;
  specificity: number;
  layer: number;
  order: number;
  decls: Decl[];
  /** Declarations in nested blocks (`@media`, `&:hover`, `@supports`). */
  nested: Decl[];
}

const unescape = (s: string) =>
  s
    .replace(/\\([0-9a-f]{1,6}) ?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\(.)/g, "$1");

function flatten(nodes: Node[]): Decl[] {
  return nodes.flatMap((n) => [...n.decls, ...flatten(n.children)]);
}

function collect(nodes: Node[], layer: number, out: Rule[], conditional = false) {
  for (const n of nodes) {
    const layerAt = /^@layer\s+([\w-]+)$/.exec(n.prelude);
    if (layerAt) {
      collect(n.children, LAYERS.indexOf(layerAt[1]), out, conditional);
      continue;
    }
    // A rule inside a media or supports query applies only sometimes: its
    // declarations count for `declaredAnywhere`, never for `computed`.
    if (n.prelude.startsWith("@media") || n.prelude.startsWith("@supports")) {
      collect(n.children, layer, out, true);
      continue;
    }
    if (n.prelude.startsWith("@")) continue;
    for (const sel of n.prelude.split(/,(?![^(]*\))/).map((s) => s.trim())) {
      const cls = /^\.((?:\\.|[^\s.#:[>+~,]|\[[^\]]*\])+)$/.exec(sel);
      const tag = /^([a-z][a-z0-9]*|:root|:host)$/.exec(sel);
      if (!cls && !tag) continue;
      out.push({
        key: cls ? unescape(cls[1]) : tag![1],
        specificity: cls ? 10 : 1,
        layer: layer < 0 ? UNLAYERED : layer,
        order: out.length,
        decls: conditional ? [] : n.decls,
        nested: conditional ? [...n.decls, ...flatten(n.children)] : flatten(n.children),
      });
    }
  }
}

let cached: { size: number; byKey: Map<string, Rule[]>; vars: Map<string, string> } | undefined;
const seen = new Set<string>();

function sheet() {
  for (const el of document.querySelectorAll("[class]")) {
    for (const c of el.classList) seen.add(c);
  }
  if (cached && cached.size === seen.size) return cached;
  const rules: Rule[] = [];
  collect(parse(compiler.build([...seen])), UNLAYERED, rules);
  const byKey = new Map<string, Rule[]>();
  const vars = new Map<string, string>(sourceVars);
  for (const r of rules) {
    byKey.set(r.key, [...(byKey.get(r.key) ?? []), r]);
    if (r.key === ":root" || r.key === ":host") {
      for (const d of r.decls) if (d.prop.startsWith("--")) vars.set(d.prop, d.value);
    }
  }
  cached = { size: seen.size, byKey, vars };
  return cached;
}

function matching(el: Element): Rule[] {
  const { byKey } = sheet();
  const keys = [el.tagName.toLowerCase(), ...el.classList];
  if (el === document.documentElement) keys.push(":root");
  return keys.flatMap((k) => byKey.get(k) ?? []);
}

/**
 * The value the cascade gives `prop` on `el` itself, from the rules this
 * helper models plus the element's inline style; undefined when none of them
 * sets it (no inheritance — see `textColour` for that).
 */
export function computed(el: Element, prop: string): string | undefined {
  type Win = { value: string; key: number[] };
  let best: Win | undefined;
  const consider = (value: string, key: number[]) => {
    if (!best || compareKeys(key, best.key) > 0) best = { value, key };
  };
  for (const r of matching(el)) {
    for (const d of r.decls) {
      if (d.prop !== prop) continue;
      // Important declarations reverse the layer order.
      const layer = d.important ? UNLAYERED - r.layer : r.layer;
      consider(d.value, [d.important ? 1 : 0, 0, layer, r.specificity, r.order]);
    }
  }
  const inline = (el as HTMLElement).style?.getPropertyValue(prop);
  if (inline) {
    const important = (el as HTMLElement).style.getPropertyPriority(prop) === "important";
    consider(inline, [important ? 1 : 0, 1, 0, 0, 0]);
  }
  return best?.value;
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Every value any rule for one of `el`'s classes declares for `prop`,
 *  variants and media queries included. */
export function declaredAnywhere(el: Element, prop: string): string[] {
  return matching(el).flatMap((r) =>
    [...r.decls, ...r.nested].filter((d) => d.prop === prop).map((d) => d.value),
  );
}

// ---------------------------------------------------------------- colour

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, Rgba> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

function parseColour(raw: string, el: Element | null): Rgba {
  const v = raw.trim();
  const named = NAMED[v.toLowerCase()];
  if (named) return named;
  if (/^currentcolor$/i.test(v)) {
    if (!el) throw new Error("currentColor outside an element");
    return inkOf(el);
  }
  if (v === "inherit") {
    if (!el?.parentElement) return NAMED.black;
    return inkOf(el.parentElement);
  }
  const variable = /^var\((--[\w-]+)(?:,\s*(.+))?\)$/.exec(v);
  if (variable) {
    const value = sheet().vars.get(variable[1]) ?? variable[2];
    if (value === undefined) throw new Error(`${variable[1]} is not defined in the compiled theme`);
    return parseColour(value, el);
  }
  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const mix = /^color-mix\(in (?:srgb|oklab), (.+?) ([\d.]+)%, transparent\)$/.exec(v);
  if (mix) {
    const c = parseColour(mix[1], el);
    return { ...c, a: c.a * (Number(mix[2]) / 100) };
  }
  // The neutral greys are achromatic oklch: L³ is the linear luminance.
  const grey = /^oklch\(([\d.]+)% 0 0\)$/.exec(v);
  if (grey) {
    const lin = (Number(grey[1]) / 100) ** 3;
    const s = lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055;
    const c = Math.round(s * 255);
    return { r: c, g: c, b: c, a: 1 };
  }
  throw new Error(`theme-contrast cannot read the colour "${v}"`);
}

/** A theme token (`green-deep`) or any CSS colour the helper reads. */
export function themeColour(tokenOrColour: string): Rgba {
  const v =
    /^[a-z][\w-]*$/i.test(tokenOrColour) && !NAMED[tokenOrColour]
      ? `var(--color-${tokenOrColour})`
      : tokenOrColour;
  return parseColour(v, null);
}

/** The `color` value `el` inherits or sets, before any opacity. */
function inkOf(el: Element): Rgba {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const v = computed(n, "color");
    if (v !== undefined && v !== "inherit") return parseColour(v, n);
  }
  return NAMED.black;
}

/** `el`'s own `opacity` (a number or a percentage), 1 when unset. */
function opacityOwn(el: Element): number {
  const v = computed(el, "opacity")?.trim();
  if (v === undefined || v === "inherit" || v === "initial") return 1;
  const pct = /^([\d.]+)%$/.exec(v);
  const n = pct ? Number(pct[1]) / 100 : Number(v);
  if (!Number.isFinite(n)) throw new Error(`theme-contrast cannot read the opacity "${v}"`);
  return Math.min(1, Math.max(0, n));
}

/** The opacity `el` is drawn at: its own times every ancestor's. */
export function fadeOf(el: Element): number {
  let f = 1;
  for (let n: Element | null = el; n; n = n.parentElement) f *= opacityOwn(n);
  return f;
}

const faded = (c: Rgba, f: number): Rgba => (f === 1 ? c : { ...c, a: c.a * f });

/** The text colour `el` renders in: its own `color`, else its parent's, at
 *  the opacity `el` and its ancestors draw it. */
export function textColour(el: Element): Rgba {
  return faded(inkOf(el), fadeOf(el));
}

/** `prop`'s colour on `el` (a border, a fill) at `el`'s opacity, or
 *  undefined when unset. */
export function colourOf(el: Element, prop: string): Rgba | undefined {
  const v = computed(el, prop);
  return v === undefined ? undefined : faded(parseColour(v, el), fadeOf(el));
}

function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return NAMED.transparent;
  const ch = (k: "r" | "g" | "b") => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
  return { r: ch("r"), g: ch("g"), b: ch("b"), a };
}

/**
 * The ground `el` is drawn on: every background from `el` outwards,
 * composited, until one is opaque. `within` stops the walk at that ancestor
 * (inclusive) and lays what was found over `under` — for a fixed bar, whose
 * real ground is whatever the page scrolls beneath it, not its DOM parent.
 */
export function groundOf(
  el: Element,
  opts: { within?: Element; under?: Rgba | string } = {},
): Rgba {
  const layers: Rgba[] = [];
  for (let n: Element | null = el; n; n = n.parentElement) {
    const v = computed(n, "background-color");
    const bg = v === undefined ? undefined : parseColour(v, n);
    if (bg && bg.a > 0 && fadeOf(n) < 1) {
      throw new Error(
        `a ground drawn at opacity ${fadeOf(n).toFixed(2)} is not modelled (<${n.tagName.toLowerCase()} class="${n.className}">)`,
      );
    }
    if (bg && bg.a > 0) layers.push(bg);
    if (bg?.a === 1 || n === opts.within) break;
  }
  let base: Rgba;
  if (layers.at(-1)?.a === 1) {
    base = layers.pop()!;
  } else if (opts.under !== undefined) {
    base = typeof opts.under === "string" ? themeColour(opts.under) : opts.under;
  } else {
    throw new Error("no opaque ground found; pass `under`");
  }
  return layers.reduceRight((acc, layer) => over(layer, acc), base);
}

function luminance({ r, g, b }: Rgba): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast. Strings are theme tokens or CSS colours. A translucent
 *  foreground is laid over the ground first. */
export function contrast(fg: Rgba | string, bg: Rgba | string): number {
  const ground = typeof bg === "string" ? themeColour(bg) : bg;
  const ink = over(typeof fg === "string" ? themeColour(fg) : fg, ground);
  const [a, b] = [luminance(ink), luminance(ground)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The fill a shipped SVG draws most of its paths in — for a lockup, the
 *  wordmark. Read from the file in static/, so a swapped asset is measured. */
export function svgMainFill(src: string): Rgba {
  const svg = readFileSync(resolve(root, "static", src.replace(/^\//, "")), "utf8");
  const counts = new Map<string, number>();
  for (const [, fill] of svg.matchAll(/<path[^>]*\sfill="([^"]+)"/g)) {
    if (fill === "none") continue;
    counts.set(fill.toLowerCase(), (counts.get(fill.toLowerCase()) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (!top) throw new Error(`no filled path in ${src}`);
  return parseColour(top[0], null);
}
