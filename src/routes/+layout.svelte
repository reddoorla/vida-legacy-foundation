<script lang="ts">
  import { PrismicPreview } from "@prismicio/svelte/kit";
  import { page } from "$app/state";
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import { repositoryName } from "$lib/prismicio";
  import "../app.css";
  import Seo from "$lib/components/Seo.svelte";
  import { composeTitle, DEFAULT_OG_IMAGE } from "$lib/seo";
  import LandscapeModal from "$lib/components/LandscapeModal.svelte";
  import TransitionOverlay from "$lib/components/TransitionOverlay.svelte";
  import Nav from "$lib/components/Nav.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { loadSiteConfig, footerColumns } from "$lib/site-config";
  import { navToneFor } from "$lib/nav-tone";
  import { LOCALES, langFromParam, switchTarget } from "$lib/locale";
  import { disableSmoothScroll, restoreSmoothScroll } from "$lib/utils/instantNavScroll";

  let { data, children } = $props();

  // The locale comes from the URL prefix ("/es/…"), so it is known on every
  // route — Prismic pages, the static contact page and the dev pages alike.
  const lang = $derived(langFromParam(page.params.lang));

  // Site chrome from src/lib/site-config.json (empty stub → logo-only Nav +
  // placeholder Footer), in the page's locale. A route's own page data takes
  // precedence in each chrome component.
  const siteConfig = $derived(loadSiteConfig(lang, data.publishedPages));

  // hreflang needs absolute URLs; loaders hand over root-relative paths.
  const alternates = $derived(
    (page.data.alternates ?? []).map((a: { lang: string; href: string }) => ({
      lang: a.lang,
      href: new URL(a.href, page.url.origin).href,
    })),
  );
  const switchTo = $derived(switchTarget(lang, page.data.alternates, page.url.pathname));

  // Kit's own post-nav scroll (top / hash anchor / popstate restore) runs
  // instantly instead of gliding under app.css's smooth-scroll. See the util.
  beforeNavigate(disableSmoothScroll);
  afterNavigate(restoreSmoothScroll);
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
  Skip to main content
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
    {switchTo}
  />

  <main id="main-content" tabindex="-1" class="flex-1">
    {@render children?.()}
  </main>

  <Footer
    columns={footerColumns(page.data.footerColumns, siteConfig)}
    socials={siteConfig.footer.socials}
    text={siteConfig.footer.text}
  />
</div>
<TransitionOverlay />
<LandscapeModal />
{#if data.isPreviewSession}
  <PrismicPreview {repositoryName} />
{/if}
