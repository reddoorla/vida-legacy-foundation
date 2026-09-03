<script lang="ts">
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.ImageBandSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));
</script>

<!--
  Figma 5249:1223 and 5249:1282 — the two full-bleed photographs that break up
  the homepage between content bands. 1440x860 in the comps, so the band holds
  a 1440/860 box and the photo covers it; the crop, not the height, is what
  gives on a narrow screen.

  There is no copy over these, which is the whole point: nothing here needs a
  legibility scrim, and none of the palette's contrast rules apply. If a future
  variation puts text on one, it needs both.

  preload={false} deliberately. HeroBackgroundImage injects a
  fetchpriority=high <link rel=preload> when preloading, and exactly ONE
  above-the-fold image per page should do that — on the homepage that is
  HeartHero. These sit mid-page; preloading them would make two more images
  fight the real LCP for bandwidth.

  `sticky-cover`: the comp pins the photograph ("sticky scrolls" on
  5249:1223) and the navy band after it slides up over it — the slide-over
  note in app.css. On a viewport shorter than the band, the action holds it
  by its bottom edge, so the crop that shows is the photograph's lower part.

  `sticky-cover--clear` says the band that slides over this one has to finish
  the job before the section after IT arrives: app.css gives that band a
  viewport of minimum height. Without it the 318px navy band could only ever
  cover 318px of the photograph per screen, so for ~580px of scrolling the
  photograph stayed as a shrinking strip across the top while "By the
  numbers" was already up — "feels weird it stops at her forehead" (client
  review, round 4).
-->
{#if hasImage}
  <section
    data-slice-type={slice.slice_type}
    data-slice-variation={slice.variation}
    class="sticky-cover sticky-cover--clear aspect-1440/860 w-full overflow-hidden"
  >
    <HeroBackgroundImage
      image={slice.primary.image}
      preload={false}
      class="h-full w-full object-cover"
    />
  </section>
{/if}
