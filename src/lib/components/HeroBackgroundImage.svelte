<script lang="ts">
  // LCP-optimized hero image. Three constraints drive the markup: the browser
  // must discover the image before hydration (hence the <link rel="preload">
  // in <svelte:head> — fixes Lighthouse "LCP request discovery"), it must
  // never download the full-resolution master (hence the imgix srcset
  // ladder), and on a phone a full-bleed hero is PORTRAIT while the master is
  // landscape (hence the optional art-directed <source>, see `portrait`).
  //
  // Multi-instance hazard: each preloading instance injects its own
  // fetchpriority=high <link>, so two hero-ish slices on one page would fight
  // for bandwidth at highest priority and slow the real LCP. Exactly one
  // above-the-fold hero per page should preload — pass `preload={false}` to
  // every other instance. (Deliberately NOT deduped via module state: module
  // scope is shared across requests during SSR, so a flag set by one request
  // would suppress the preload for every request after it.)
  import type { ImageField } from "@prismicio/client";
  import { imgix, srcset, portraitSrcset } from "$lib/utils/image";

  interface Props {
    image: ImageField;
    /** Used when the Prismic image has no alt text (satisfies image-alt for a11y + SEO). */
    altFallback?: string;
    class?: string;
    /**
     * Inject the fetchpriority=high <link rel="preload"> for this image.
     * Exactly ONE above-the-fold hero per page should preload; set false on
     * any additional instances (below-the-fold or secondary heroes).
     */
    preload?: boolean;
    /**
     * Art-direct a phone-shaped crop: the aspect (height ÷ width) to hand the
     * narrow viewport, cropped around any face imgix finds. Set it on a hero
     * whose box is as tall as the viewport on a phone; leave it off for a
     * band that keeps the comp's landscape shape at every width.
     */
    portrait?: number | null;
    /** Which viewports take the portrait source. Matches the `md` breakpoint. */
    portraitMedia?: string;
  }

  let {
    image,
    altFallback = "",
    class: passedClasses = "absolute bottom-0 left-0 h-full w-full object-cover",
    preload = true,
    portrait = null,
    portraitMedia = "(max-width: 767px)",
  }: Props = $props();

  const src = $derived(imgix(image?.url, { w: 1920 }));
  const candidates = $derived(srcset(image?.url));
  const portraitCandidates = $derived(portrait ? portraitSrcset(image?.url, portrait) : undefined);
  // The <img>'s own fallback src for a phone, so a browser that ignores the
  // <source> (or a preload racing it) still gets the cropped file.
  const portraitSrc = $derived(
    portrait
      ? imgix(image?.url, {
          w: 780,
          h: Math.round(780 * portrait),
          fit: "crop",
          crop: "faces,center",
        })
      : "",
  );
  const alt = $derived(image?.alt || altFallback);
</script>

<svelte:head>
  {#if preload && image?.url}
    <!-- One preload per source, each carrying its own media query, so the
         browser preloads exactly the file <picture> will choose. -->
    {#if portraitCandidates}
      <link
        rel="preload"
        as="image"
        href={portraitSrc}
        imagesrcset={portraitCandidates}
        imagesizes="100vw"
        media={portraitMedia}
        fetchpriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={src}
        imagesrcset={candidates}
        imagesizes="100vw"
        media="not all and {portraitMedia}"
        fetchpriority="high"
      />
    {:else}
      <link
        rel="preload"
        as="image"
        href={src}
        imagesrcset={candidates}
        imagesizes="100vw"
        fetchpriority="high"
      />
    {/if}
  {/if}
</svelte:head>

{#if image?.url}
  {#if portraitCandidates}
    <!-- display:contents — the <img> keeps h-full/absolute against the box the
         caller styled, not against an inline <picture> with no height. -->
    <picture class="contents">
      <source media={portraitMedia} srcset={portraitCandidates} sizes="100vw" />
      <img
        {src}
        srcset={candidates}
        sizes="100vw"
        width={image.dimensions?.width}
        height={image.dimensions?.height}
        {alt}
        fetchpriority="high"
        decoding="async"
        class={passedClasses}
      />
    </picture>
  {:else}
    <img
      {src}
      srcset={candidates}
      sizes="100vw"
      width={image.dimensions?.width}
      height={image.dimensions?.height}
      {alt}
      fetchpriority="high"
      decoding="async"
      class={passedClasses}
    />
  {/if}
{/if}
