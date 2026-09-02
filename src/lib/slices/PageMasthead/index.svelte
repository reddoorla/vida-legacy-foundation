<script lang="ts">
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.PageMastheadSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));
</script>

<!--
  Figma 5312:1216 / 5180:1063 — the Who We Are masthead. A 1280x390 photograph
  inset on the #172303 ground, rounded, with the fixed nav sitting over the top
  of the band.

  pt-[70px] is not decoration: $lib/components/Nav is `fixed top-0`, so it does
  NOT take space in the flow and the first slice on a page has to reserve it.
  A mid-page band (ImageBand) must not, which is why this is its own slice
  rather than a variation of that one.

  The comp's copy block is set to opacity-0 — the design ships this masthead
  photo-only — so eyebrow and title are optional and render nothing when
  unauthored. They are modelled anyway because the page template renders ONLY
  the slice zone: nothing else on an interior page can supply an <h1>, and this
  is the slice that should own it.

  Contrast on #172303, measured:
    #f2eadd eyebrow  13.76:1
    #fffbf4 title    15.93:1
-->
<section
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="bg-green-deep w-full"
>
  <div class="mx-auto w-full max-w-[1440px] px-6 pt-[70px] pb-16 md:px-20 md:pb-[187px]">
    {#if hasImage}
      <div class="relative aspect-1280/390 w-full overflow-hidden rounded-[20px]">
        <HeroBackgroundImage
          image={slice.primary.image}
          preload={true}
          class="h-full w-full object-cover"
        />
        <!-- The comp's own gradient: nothing sits on the photo, so this is
             tonal, not a legibility scrim. -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-[12%] to-black/20 to-[87%]"
        ></div>
      </div>
    {/if}

    {#if slice.primary.eyebrow || slice.primary.title}
      <div class="mt-[30px] flex flex-col gap-[30px]">
        {#if slice.primary.eyebrow}
          <p class="text-light font-heading text-lg leading-[2] tracking-[1px] uppercase">
            {slice.primary.eyebrow}
          </p>
        {/if}
        {#if slice.primary.title}
          <!-- The page's h1. The slice zone is the whole page, so no other
               component is in a position to provide one. -->
          <h1 class="text-cream font-heading text-[clamp(2.5rem,5.56vw,5rem)] leading-[1.15]">
            {slice.primary.title}
          </h1>
        {/if}
      </div>
    {/if}
  </div>
</section>
