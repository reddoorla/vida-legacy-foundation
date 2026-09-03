<script lang="ts">
  import { PrismicPreview } from "@prismicio/svelte/kit";
  import { page } from "$app/state";
  import { afterNavigate, beforeNavigate, onNavigate } from "$app/navigation";
  import { repositoryName } from "$lib/prismicio";
  import "../app.css";
  import Seo from "$lib/components/Seo.svelte";
  import { composeTitle, DEFAULT_OG_IMAGE } from "$lib/seo";
  import LandscapeModal from "$lib/components/LandscapeModal.svelte";
  import ContactModal from "$lib/components/ContactModal.svelte";
  import { contactModal } from "$lib/contact-modal.svelte";
  import TransitionOverlay from "$lib/components/TransitionOverlay.svelte";
  import Nav from "$lib/components/Nav.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { loadSiteConfig, footerColumns } from "$lib/site-config";
  import { navToneFor } from "$lib/nav-tone";
  import { LANGS, LOCALES, langFromParam, localizePath, switchTarget } from "$lib/locale";
  import { ui } from "$lib/ui-copy";
  import { disableSmoothScroll, restoreSmoothScroll } from "$lib/utils/instantNavScroll";
  import { stickyCovers } from "$lib/actions/stickyCover";
  import { prefersReducedMotion } from "$lib/transitions";

  let { data, children } = $props();

  // The locale comes from the URL prefix ("/es/…"), so it is known on every
  // route — Prismic pages, the static contact page and the dev pages alike.
  const lang = $derived(langFromParam(page.params.lang));

  // Site chrome from src/lib/site-config.json (empty stub → logo-only Nav +
  // placeholder Footer), in the page's locale. A route's own page data takes
  // precedence in each chrome component.
  const siteConfig = $derived(loadSiteConfig(lang, data.publishedPages));

  // The chrome's own words — the skip link here, the rest inside the
  // components that own them (see $lib/ui-copy).
  const copy = $derived(ui(lang));

  // hreflang needs absolute URLs; loaders hand over root-relative paths.
  const alternates = $derived(
    (page.data.alternates ?? []).map((a: { lang: string; href: string }) => ({
      lang: a.lang,
      href: new URL(a.href, page.url.origin).href,
    })),
  );
  const switchTo = $derived(switchTarget(lang, page.data.alternates, page.url.pathname));

  // The one navigation that is not a page change: the same page in the other
  // language (see onNavigate below, and LangToggle).
  const isLanguageSwitch = (to: URL | null | undefined) =>
    !!to && !!switchTo && to.pathname === switchTo.href;

  // Any link to the contact route opens the contact modal instead of
  // navigating — the nav's "Contact Us", a footer row, a Prismic link field.
  // Intercepted in the router (the PreNavTransition idea: cancel, then do
  // something else) rather than with a click listener, which would race
  // Kit's own document click handler for the same anchor. The href stays the
  // real route, so without scripts (and for the crawler) the link is the
  // contact page, which renders the same panel in-flow; modified clicks open
  // it in a new tab as usual, since those never reach the router.
  //
  // The language switch is the exception: /contact and /es/contact are BOTH
  // in this set, so without the guard the toggle on the contact page cancelled
  // itself and reopened the modal in the language you were already reading.
  const CONTACT_PATHS = new Set(LANGS.map((l) => localizePath("/contact", l)));
  beforeNavigate((nav) => {
    if (nav.type !== "link" || !nav.to || !CONTACT_PATHS.has(nav.to.url.pathname)) return;
    if (isLanguageSwitch(nav.to.url)) return;
    nav.cancel();
    contactModal.open = true;
  });

  // Kit's own post-nav scroll (top / hash anchor / popstate restore) runs
  // instantly instead of gliding under app.css's smooth-scroll. See the util.
  beforeNavigate(disableSmoothScroll);
  afterNavigate(restoreSmoothScroll);

  // The language switch is the one navigation that skips the overlay: it is
  // the same page in the other language, so it crossfades in place — the
  // browser's view transition (a crossfade of the whole document, the
  // duration in app.css) wrapped around Kit's DOM swap, which runs once the
  // other locale's data has loaded. The toggle links carry
  // data-sveltekit-noscroll, so the reader keeps their place while the copy
  // changes under them. Skipped where the API is missing and under reduced
  // motion, where the swap is simply instant.
  onNavigate((nav) => {
    if (!isLanguageSwitch(nav.to?.url) || prefersReducedMotion()) return;
    const start = (document as Document & { startViewTransition?: unknown }).startViewTransition;
    if (typeof start !== "function") return;
    return new Promise<void>((resolve) => {
      start.call(document, async () => {
        resolve();
        await nav.complete;
      });
    });
  });

  // The server stamps <html lang> per request (hooks.server.ts); a client-side
  // language switch has to restamp it, or the document keeps announcing the
  // old language to assistive tech.
  $effect(() => {
    document.documentElement.lang = LOCALES[lang].html;
  });
</script>

<!-- Single head source for the whole app. Static routes feed their title
     (and optional description/image) through `page.data`; per-page <svelte:head>
     title overrides would desync og:title, so pages set data, not tags. -->
<Seo
  title={composeTitle(page.data.meta_title || page.data.title)}
  description={page.data.meta_description}
  image={page.data.meta_image || DEFAULT_OG_IMAGE || undefined}
  imageAlt={page.data.meta_image_alt}
  url={page.url}
  locale={page.data.ogLocale ?? LOCALES[lang].og}
  {alternates}
/>
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:bg-white focus:text-primary focus:px-4 focus:py-2 focus:rounded focus:shadow"
>
  {copy.skipToContent}
</a>
<!-- Chrome renders from page data when a route supplies navLinks/footerColumns,
     else from the site-config stub. Each component applies its own
     page-data-over-config precedence. -->
<div class="flex flex-col min-h-screen">
  <!-- The bar is transparent over the page's first slice, so its colouring
       comes from that slice's ground (see $lib/nav-tone); the route closes the
       menu and re-measures on navigation. -->
  <Nav
    navLinks={page.data.navLinks}
    items={siteConfig.nav.items}
    tone={navToneFor(page.data.page?.data?.slices)}
    pathname={page.url.pathname}
    {lang}
    {switchTo}
  />

  <!-- use:stickyCovers keeps the slide-over bands' pin offsets measured
       (see $lib/actions/stickyCover and the rule in app.css). -->
  <main id="main-content" tabindex="-1" class="flex-1" use:stickyCovers>
    {@render children?.()}
  </main>

  <Footer
    columns={footerColumns(page.data.footerColumns, siteConfig)}
    socials={siteConfig.footer.socials}
    text={siteConfig.footer.text}
  />
</div>
<!-- The page fade goes through the menu's textured dark green, not black —
     #172303 under the site's grain at 20% plus-lighter, as NavMenu paints it.
     It leaves the contact link alone (cancelled above into the modal, so
     afterNavigate would never take it down) and the language switch (which
     crossfades in place instead — see onNavigate). -->
<TransitionOverlay
  class="fixed top-0 left-0 z-50 h-screen w-screen bg-green-deep"
  skip={(nav) =>
    (!!nav.to && CONTACT_PATHS.has(nav.to.url.pathname)) || isLanguageSwitch(nav.to?.url)}
>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-plus-lighter"
    style="background-image: url('/texture-grain.webp')"
  ></div>
</TransitionOverlay>
<LandscapeModal {lang} />
<ContactModal {lang} />
{#if data.isPreviewSession}
  <PrismicPreview {repositoryName} />
{/if}
