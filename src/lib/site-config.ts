// Site chrome (navigation + footer) from a checked-in JSON stub. The starter
// ships it empty, so a fresh site renders the logo-only Nav + placeholder
// Footer; a site fills it in, or swaps this module for a Prismic
// `settings`-document loader behind the same exports.
import config from "./site-config.json";
import { DEFAULT_LANG, type Lang } from "$lib/locale";

export type NavItem = { label: string; href: string; children?: NavItem[] };
export type FooterSocial = { network: string; href?: string };

// A footer column row: a text line (optionally linked — tel:/mailto:/http(s))
// or an image (a footer logo). Shared so the type flows from site-config
// through the layout into Footer as one source of truth.
export type FooterText = {
  text: string;
  href?: string;
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
 *  from `locales`, falling back to the default per section. */
export function loadSiteConfig(lang: Lang = DEFAULT_LANG): SiteConfig {
  const base = config as SiteConfig;
  const overrides = lang === DEFAULT_LANG ? undefined : base.locales?.[lang];
  if (!overrides) return base;
  return { ...base, nav: overrides.nav ?? base.nav, footer: overrides.footer ?? base.footer };
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
