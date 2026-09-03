<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { companionSticky } from "$lib/actions/companionRun";
  import { isFilled } from "@prismicio/client";
  import type { Content } from "@prismicio/client";

  let { slice }: { slice: Content.IconColumnsSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));
  let hasBody = $derived(isFilled.richText(slice.primary.body));
  let columns = $derived((slice.items ?? []).filter((i) => i.title || i.description));
</script>

<!--
  Figma 5249:1133. Two columns on the #263b02 ground, 40px apart:
    left   297.5px (23.24% of the 1280 grid), STICKY — it holds while the
           right column scrolls, and on past it for the length of the
           float-right slices that follow (the TOSA boxes, Compassion in
           Action), which leave the left column empty
    right  942.5px: the icon card (#172303 + the site's grain at 20%
           plus-lighter), rounded at the top, with the feature photo joined
           beneath it so the pair reads as one rounded block

  In the comp the TOSA grid (SectionGrid onDark) sits 40px under the photo
  inside this same band, and the band pays 120 below it. Split across the two
  slices: this pays the 40, the grid pays the 120.

  The hold past the band's end is $lib/actions/companionRun: the band grows
  by the measured height of the run (the spacer row below the columns) and a
  negative bottom margin pulls the run back up over the spacer, so the intro's
  grid area — its sticky range — reaches the run's end. Without JS the intro
  holds for this band alone.

  The grain is the same file the hero uses (verified byte-identical to the
  comp's own card texture), so it costs no extra bytes here.

  Contrast on #172303, measured:
    #9cbf5b titles   7.84:1
    #fdf5e8 body    15.18:1
-->
<section
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="companion-band bg-green-btn w-full"
  use:companionSticky
>
  <div class="companion mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 pb-10 md:px-20">
    {#if slice.primary.eyebrow || hasBody}
      <div class="intro text-background flex flex-col gap-5 pt-16 md:py-30">
        {#if slice.primary.eyebrow}
          <h2 class="t-label-lg">
            {slice.primary.eyebrow}
          </h2>
        {/if}
        {#if hasBody}
          <div class="richtext-block t-body">
            <RichTextBody field={slice.primary.body} />
          </div>
        {/if}
      </div>
    {/if}

    <div class="columns flex min-w-0 flex-col md:pt-30">
      {#if columns.length}
        <!-- Rounded only at the top: the photo below completes the block. -->
        <div class="icon-card relative overflow-hidden rounded-t-[20px]">
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-plus-lighter"
            style="background-image: url('/texture-grain.webp')"
          ></div>
          <div class="relative grid gap-[30px] p-[30px] sm:grid-cols-3">
            {#each columns as col, i (i)}
              <div class="flex flex-col items-center gap-5 text-center">
                {#if isFilled.image(col.icon)}
                  <!-- A plain <img>, not <PrismicImage>: these are flat SVG
                       glyphs, so an imgix srcset ladder buys nothing, and
                       PrismicImage's asImageWidthSrcSet throws "Invalid URL"
                       on the relative paths the mocks and fixtures use. -->
                  <img
                    src={col.icon.url}
                    alt=""
                    aria-hidden="true"
                    class="h-24 w-24 object-contain sm:h-[133px] sm:w-[133px]"
                    loading="lazy"
                    decoding="async"
                  />
                {/if}
                <!-- 20 under the icon, 10 between the title and its copy. -->
                <div class="flex flex-col gap-2.5">
                  {#if col.title}
                    <p class="t-label text-green">
                      {col.title}
                    </p>
                  {/if}
                  {#if col.description}
                    <p class="t-body text-background">{col.description}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if hasImage}
        <div class="relative aspect-[943/528] w-full overflow-hidden rounded-b-[20px]">
          <HeroBackgroundImage
            image={slice.primary.image}
            preload={false}
            class="h-full w-full object-cover"
          />
        </div>
      {/if}
    </div>

    <!-- The spacer row: the comp's 40 under the photo, plus the run the intro
         holds through. Empty and decorative; nothing lands in it, the run's
         sections are pulled up over it. -->
    <div aria-hidden="true" class="run-spacer"></div>
  </div>
</section>

<style>
  .icon-card {
    background-color: var(--color-green-deep);
  }

  /* One column below md, and no hold: on a phone there is nothing to scroll
     past, and a sticky block just eats the viewport. */
  .run-spacer {
    display: none;
  }

  @media (min-width: 768px) {
    .companion {
      display: grid;
      grid-template-columns: 23.24% minmax(0, 1fr);
      grid-template-rows: auto auto;
      column-gap: 40px;
      row-gap: 0;
      align-items: start;
      padding-bottom: 0;
    }

    /* Rows 1 and 2: the sticky range is the grid area, so the intro holds
       until the spacer's bottom — the run's end. z-index puts it over the
       run's sections, which are positioned later siblings of this band. */
    .intro {
      grid-column: 1;
      grid-row: 1 / span 2;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .columns {
      grid-column: 2;
      grid-row: 1;
    }

    .run-spacer {
      display: block;
      grid-column: 1 / -1;
      grid-row: 2;
      height: calc(40px + var(--companion-run, 0px));
    }

    .companion-band {
      margin-bottom: calc(-1 * var(--companion-run, 0px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .intro {
      position: static;
    }
  }
</style>
