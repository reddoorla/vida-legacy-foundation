// Site chrome (navigation + footer) from a checked-in JSON stub. The starter
// ships it empty, so a fresh site renders the logo-only Nav + placeholder
// Footer; a site fills it in, or swaps this module for a Prismic
// `settings`-document loader behind the same exports.
import config from "./site-config.json";

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
};

/** The checked-in site config (empty on a fresh site). */
export function loadSiteConfig(): SiteConfig {
  return config as SiteConfig;
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
