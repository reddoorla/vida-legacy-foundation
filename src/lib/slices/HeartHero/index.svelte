<script lang="ts">
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { isFilled } from "@prismicio/client";
  import type { Content } from "@prismicio/client";
  import { TEXTURE_LQIP } from "./texture-lqip";

  let { slice }: { slice: Content.HeartHeroSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));

  const TEXTURE_FULL = "/texture-grain.webp";

  // Walk the grain up in quality after first paint. The inlined LQIP ships in
  // the HTML so the ground is never flat green; the full file fades over it
  // once decoded.
  //
  // Deliberately an Image() in an $effect and NOT `<img onload=...>`: this
  // site's CSP grants script-src nonces WITHOUT 'unsafe-inline', and a nonce
  // never authorises an inline handler — the swap would be silently blocked
  // and the texture would stay at LQIP forever with no console error on the
  // happy path. See "Two CSP traps" in CLAUDE.md.
  let textureReady = $state(false);

  $effect(() => {
    const img = new Image();
    let cancelled = false;
    const done = () => {
      if (!cancelled) textureReady = true;
    };
    img.addEventListener("load", done);
    // On error we still reveal: the LQIP underneath stays visible either way,
    // and leaving the layer at opacity 0 forever costs nothing but is untidy.
    img.addEventListener("error", done);
    img.src = TEXTURE_FULL;
    if (img.complete) done();
    return () => {
      cancelled = true;
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  });
</script>

<!--
  The homepage masthead: a heart-masked photo centred on the brand green.

  Proportions are the comp's (Figma 5249:1132, 1440x860), kept as percentages
  so the band scales instead of pinning to desktop pixels:
    heart 669.436 x 584 at left 438.615, top 173.167
        -> 46.49% wide, top 20.13%, aspect 669.436/584

  The heart is a real exported asset (static/heart-mask.png) used as a CSS
  mask, NOT a hand-drawn path — see the "never redraw an asset" rule in
  CLAUDE.md.
-->
<section
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="bg-green relative isolate w-full overflow-hidden"
  style="aspect-ratio: 1440 / 860; min-height: 60vh"
>
  <!-- Decorative grain. The blend + opacity live on the wrapper so they are
       applied ONCE to the composited result — putting them on both layers
       would double-lighten during the cross-fade. -->
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 opacity-20 mix-blend-plus-lighter"
  >
    <div
      class="absolute inset-0 bg-cover bg-center"
      style="background-image: url('{TEXTURE_LQIP}')"
    ></div>
    <div
      class="texture-full absolute inset-0 bg-cover bg-center"
      class:is-ready={textureReady}
      style="background-image: url('{TEXTURE_FULL}')"
    ></div>
  </div>

  {#if hasImage}
    <div
      class="heart-mask absolute top-[20.13%] left-1/2 w-[46.49%] -translate-x-1/2"
      style="aspect-ratio: 669.436 / 584"
    >
      <HeroBackgroundImage image={slice.primary.image} class="h-full w-full object-cover" />
    </div>
  {/if}
</section>

<style>
  /* Masking is set here rather than inline so the -webkit- prefix survives:
     Safari still needs -webkit-mask-* for image masks. */
  .heart-mask {
    -webkit-mask-image: url("/heart-mask.png");
    mask-image: url("/heart-mask.png");
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }

  .texture-full {
    opacity: 0;
    transition: opacity 600ms ease-out;
  }

  .texture-full.is-ready {
    opacity: 1;
  }

  /* The upgrade must still happen without motion — only the fade is dropped.
     Both layers are the same texture at different resolutions, so an instant
     swap is imperceptible anyway. */
  @media (prefers-reduced-motion: reduce) {
    .texture-full {
      transition: none;
    }
  }
</style>
