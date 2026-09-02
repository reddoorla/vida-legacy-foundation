<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { isFilled } from "@prismicio/client";
  import type { Content } from "@prismicio/client";

  let { slice }: { slice: Content.IconColumnsSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));
  let hasBody = $derived(isFilled.richText(slice.primary.body));
  let columns = $derived((slice.items ?? []).filter((i) => i.title || i.description));
</script>

<!--
  Figma 5249:1133. Two columns on the #263b02 ground:
    left   297.5px (20.66%), STICKY — it holds while the right column scrolls
    right  the icon card (#172303 + the site's grain at 20% plus-lighter),
           rounded at the top, with the feature photo joined beneath it so the
           pair reads as one rounded block

  The grain is the same file the hero uses (verified byte-identical to the
  comp's own card texture), so it costs no extra bytes here.

  Contrast on #172303, measured:
    #9cbf5b titles   7.84:1
    #fdf5e8 body    15.18:1
-->
<section
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="bg-green-btn w-full"
>
  <div
    class="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 pb-16 md:flex-row md:items-start md:px-20 md:pb-30"
  >
    {#if slice.primary.eyebrow || hasBody}
      <div
        class="intro text-background flex flex-col gap-5 pt-16 md:w-[20.66%] md:shrink-0 md:py-30"
      >
        {#if slice.primary.eyebrow}
          <h2
            class="font-heading text-[clamp(0.9375rem,1.25vw,1.125rem)] tracking-[1.5px] uppercase"
          >
            {slice.primary.eyebrow}
          </h2>
        {/if}
        {#if hasBody}
          <div class="richtext-block text-base leading-6">
            <RichTextBody field={slice.primary.body} />
          </div>
        {/if}
      </div>
    {/if}

    <div class="flex min-w-0 flex-1 flex-col md:pt-30">
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
                    class="h-[133px] w-[133px] object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                {/if}
                {#if col.title}
                  <p class="text-green font-heading text-[0.75rem] tracking-[1.5px] uppercase">
                    {col.title}
                  </p>
                {/if}
                {#if col.description}
                  <p class="text-background text-base leading-6">{col.description}</p>
                {/if}
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
  </div>
</section>

<style>
  .icon-card {
    background-color: var(--color-green-deep);
  }

  /* The comp holds the intro column while the cards scroll past it. Sticky is
     opt-in at md+ only: on a single-column phone layout there is nothing to
     scroll past, and a sticky block there just eats the viewport. */
  @media (min-width: 768px) {
    .intro {
      position: sticky;
      top: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .intro {
      position: static;
    }
  }
</style>
