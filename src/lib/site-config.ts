// Site chrome (navigation + footer) from a checked-in JSON stub. The starter
// ships it empty, so a fresh site renders the logo-only Nav + placeholder
// Footer; a site fills it in, or swaps this module for a Prismic
// `settings`-document loader behind the same exports.
import config from "./site-config.json";
import { DEFAULT_LANG, pathForDoc, type Lang } from "$lib/locale";

/** A nav entry. `href` is the target; an empty string renders the label
 *  without a link. `page` names a Prismic page by uid instead: the item links
 *  to that page only once it is published in the item's locale, and until
 *  then falls back to `href` (or to no link). That lets the chrome reference
 *  a page before it exists without the loud-fail prerender following the
 *  link into a 404 — resolved by `loadSiteConfig(lang, publishedUids)`. */
export type NavItem = { label: string; href: string; page?: string; children?: NavItem[] };
export type FooterSocial = { network: string; href?: string };

// A footer column row: a text line (optionally linked — tel:/mailto:/http(s))
// or an image (a footer logo). Shared so the type flows from site-config
// through the layout into Footer as one source of truth.
export type FooterText = {
  text: string;
  href?: string;
  /** A Prismic page uid — same contract as `NavItem.page`: linked once the
   *  page is published in this locale, `href` (or no link) until then. */
  page?: string;
  /** Hug the row above instead of taking the full inter-row gap — for a group
   *  of detail lines under a label ("Contact us" → phone → address). */
  tight?: boolean;
  /** Typographic role. Default is a nav-scale label; "detail" is the same
   *  scale in the link colour (contact details); "fine" is the small print
   *  (a copyright line). Colour only — see app.css for the measured ratios. */
  tone?: "detail" | "fine";
};
export type FooterImage = {
  image: { url: string; maxWidth?: string; alt?: string };
  href?: string;
};
export type FooterItem = FooterText | FooterImage;
export type FooterColumn = { items: FooterItem[] };

export type SiteConfig = {
  nav: {
    logo?: { url: string; maxWidth?: string };
    items: NavItem[];
  };
  footer: {
    socials: FooterSocial[];
    text?: string;
    // Optional footer columns — text, link, or image rows. Absent on the stub.
    columns?: FooterColumn[];
  };
  /** Per-locale chrome for a site with more than one language: a locale
   *  entry replaces `nav` and/or `footer` wholesale (labels AND hrefs, so a
   *  Spanish item can point at "/es/contact"). Absent on a single-locale
   *  site, and never consulted for the default locale. */
  locales?: Partial<Record<Lang, Partial<Pick<SiteConfig, "nav" | "footer">>>>;
};

/** The checked-in site config (empty on a fresh site), for a locale. The
 *  default locale is the config itself; another locale gets its overrides
 *  from `locales`, falling back to the default per section.
 *
 *  With `publishedUids` — the page documents live in that locale, from the
 *  layout loader — every `page` reference resolves to its localized path when
 *  the page is published and to its fallback `href` when it is not. Without
 *  the list nothing resolves: the items keep their fallbacks. */
export function loadSiteConfig(
  lang: Lang = DEFAULT_LANG,
  publishedUids?: Iterable<string>,
): SiteConfig {
  const base = config as SiteConfig;
  const overrides = lang === DEFAULT_LANG ? undefined : base.locales?.[lang];
  const localized = overrides
    ? { ...base, nav: overrides.nav ?? base.nav, footer: overrides.footer ?? base.footer }
    : base;
  return publishedUids ? resolvePages(localized, lang, new Set(publishedUids)) : localized;
}

/** Replace `page` references with hrefs for the pages that exist. An item
 *  whose page is not (yet) published keeps its `href` fallback — an empty
 *  href on a nav item and a missing one on a footer row both render the
 *  label unlinked. The reference itself is dropped either way: downstream,
 *  Nav and Footer only ever see hrefs. */
function resolvePages(cfg: SiteConfig, lang: Lang, published: ReadonlySet<string>): SiteConfig {
  const resolveNav = (item: NavItem): NavItem => {
    const { page, children, ...rest } = item;
    return {
      ...rest,
      href: page && published.has(page) ? pathForDoc(page, lang) : rest.href,
      ...(children ? { children: children.map(resolveNav) } : {}),
    };
  };
  const resolveFooter = (item: FooterItem): FooterItem => {
    if ("image" in item || !item.page) return item;
    const { page, ...rest } = item;
    return published.has(page) ? { ...rest, href: pathForDoc(page, lang) } : rest;
  };
  return {
    ...cfg,
    nav: { ...cfg.nav, items: cfg.nav.items.map(resolveNav) },
    footer: cfg.footer.columns
      ? {
          ...cfg.footer,
          columns: cfg.footer.columns.map((c) => ({ ...c, items: c.items.map(resolveFooter) })),
        }
      : cfg.footer,
  };
}

/** Resolve the footer columns for a route: per-route page data wins, else the
 *  site-config defaults. Undefined when neither supplies columns — <Footer>
 *  renders its placeholder. */
export function footerColumns(
  pageColumns: FooterColumn[] | undefined,
  siteConfig: SiteConfig = loadSiteConfig(),
): FooterColumn[] | undefined {
  return pageColumns ?? siteConfig.footer.columns;
}
