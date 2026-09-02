<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import { PrismicImage, PrismicLink, PrismicRichText } from "@prismicio/svelte";
  import { isFilled, type Content } from "@prismicio/client";
  import { cappedWidths } from "@reddoorla/maintenance/images";

  let { slice }: { slice: Content.SectionGridSlice } = $props();

  // onDark is the VLF TOSA x Vida grid (Figma 5249:1133): uniform text-only
  // cards on the textured dark ground, closing with a note and a CTA. It is an
  // EXPLICIT branch rather than a fifth entry in the mode heuristic below —
  // that heuristic infers layout from what the items carry (media vs text), and
  // these items carry text only, which it would read as "copy" (a stacked
  // column, not a card grid).
  let onDark = $derived(slice.variation === "onDark");
  // slice.primary is a union across variations, so outro/cta_* are not
  // reachable without narrowing. Narrow once here rather than casting at each
  // use site.
  let dark = $derived(
    slice.variation === "onDark" ? (slice.primary as Content.SectionGridSliceOnDarkPrimary) : null,
  );
  // `columns` belongs to the default variation only — onDark lays out on a
  // fixed card width, so it has no column count to honour.
  let columns = $derived("columns" in slice.primary ? (slice.primary.columns ?? 3) : 3);
  const colClass: Record<number, string> = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  type Item = Content.SectionGridSliceDefaultItem;
  const hasText = (i: Item) => isFilled.richText(i.item_heading) || isFilled.richText(i.item_body);
  const hasMedia = (i: Item) => isFilled.image(i.item_media);

  let items = $derived(slice.items as Item[]);

  // Four layouts, chosen by what the items carry (mirrors the original's
  // archetypes): all bare images → tile strip; all image+text → card grid;
  // text plus bare-image items → magazine split; no bare-image items → copy.
  let textItems = $derived(items.filter((i) => hasText(i) || !hasMedia(i)));
  let mediaItems = $derived(items.filter((i) => hasMedia(i) && !hasText(i)));
  let mode = $derived(
    items.length > 0 && items.every((i) => hasMedia(i) && !hasText(i))
      ? "tiles"
      : items.length > 0 && items.every((i) => hasMedia(i) && hasText(i))
        ? "cards"
        : mediaItems.length === 0
          ? "copy"
          : "split",
  );
  // Small images (rule ornaments, logos) render at natural size; photos fill.
  const isSmall = (i: Item) => (i.item_media?.dimensions?.width ?? 9999) < 480;
</script>

<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass={onDark ? "bg-green-btn" : ""}
  contentClass={onDark ? "max-w-[1440px] px-6 pb-30 md:px-20" : "max-w-7xl px-6 py-16"}
>
  {#if isFilled.richText(slice.primary.heading)}
    <div class="mb-10 text-center">
      <PrismicRichText field={slice.primary.heading} />
    </div>
  {/if}

  {#if onDark}
    <div class="flex flex-wrap gap-[30px]">
      {#each items as item (item)}
        <div
          class="grid-card relative flex w-full flex-col items-center overflow-hidden rounded-[20px] px-5 py-10 text-center sm:w-[294px]"
        >
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-plus-lighter"
            style="background-image: url('/texture-grain.webp')"
          ></div>
          <div class="relative flex flex-col gap-5">
            <div
              class="grid-card-heading text-green font-heading text-xs tracking-[1.5px] uppercase"
            >
              <PrismicRichText field={item.item_heading} />
            </div>
            <div class="text-background text-base leading-6">
              <RichTextBody field={item.item_body} />
            </div>
          </div>
        </div>
      {/each}

      {#if dark && (isFilled.richText(dark.outro) || dark.cta_label)}
        <!-- The closing cell is deliberately NOT a card: in the comp it sits in
             the grid flow but carries no ground, so the CTA reads as the end of
             the sequence rather than one more point in it. -->
        <div class="flex w-full flex-col justify-center gap-5 py-5 sm:w-[294px]">
          <div class="text-background text-base leading-6">
            <RichTextBody field={dark.outro} />
          </div>
          {#if dark.cta_label && isFilled.link(dark.cta_link)}
            <PrismicLink
              field={dark.cta_link}
              class="bg-green-deep text-green font-button inline-flex h-10 w-fit items-center justify-center gap-2.5 rounded-full px-3.75 text-[10px] tracking-[1px] uppercase"
            >
              {dark.cta_label}
              <img
                src="/icons/arrow-right.svg"
                alt=""
                aria-hidden="true"
                class="h-3.5 w-2.5 -rotate-90"
              />
            </PrismicLink>
          {/if}
        </div>
      {/if}
    </div>
  {:else if mode === "tiles"}
    <div class="grid grid-cols-2 gap-6 md:grid-cols-3">
      {#each items as item (item)}
        <PrismicLink field={item.item_link} class="flex items-center justify-center bg-surface p-8">
          <!-- Logo tile: capped at 4rem tall, so it never needs a wide candidate. -->
          <PrismicImage
            field={item.item_media}
            fallbackAlt=""
            widths={cappedWidths(item.item_media, [160, 320, 480])}
            sizes="(min-width: 768px) 320px, 45vw"
            loading="lazy"
            class="max-h-16 w-auto object-contain"
          />
        </PrismicLink>
      {/each}
    </div>
  {:else if mode === "cards"}
    <div
      data-grid-columns={columns}
      class="grid grid-cols-1 gap-10 {colClass[columns] ?? 'md:grid-cols-3'}"
    >
      {#each items as item (item)}
        <PrismicLink field={item.item_link} class="block">
          <!-- Card thumb: 3 columns of the 80rem band, so ~384px at md and up. -->
          <PrismicImage
            field={item.item_media}
            fallbackAlt=""
            widths={cappedWidths(item.item_media)}
            sizes="(min-width: 768px) 384px, calc(100vw - 3rem)"
            loading="lazy"
            class="mb-4 aspect-[4/3] w-full object-cover"
          />
          <PrismicRichText field={item.item_heading} />
          <RichTextBody field={item.item_body} />
        </PrismicLink>
      {/each}
    </div>
  {:else if mode === "copy"}
    <div class="flex max-w-3xl flex-col gap-6">
      {#each textItems as item (item)}
        <div>
          <PrismicRichText field={item.item_heading} />
          <RichTextBody field={item.item_body} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
      <div class="flex flex-col gap-6 lg:col-span-5">
        {#each textItems as item (item)}
          <div>
            <PrismicRichText field={item.item_heading} />
            {#if hasMedia(item)}
              <!-- Inline in the 5-of-12 copy column (~480px). -->
              <PrismicImage
                field={item.item_media}
                fallbackAlt=""
                widths={cappedWidths(item.item_media)}
                sizes="(min-width: 1024px) 480px, calc(100vw - 3rem)"
                loading="lazy"
                class="mt-2 h-auto w-auto"
              />
            {/if}
            <RichTextBody field={item.item_body} />
          </div>
        {/each}
      </div>
      <div class="flex flex-col gap-10 lg:col-span-7">
        {#each mediaItems as item, i (item)}
          <!-- Media column: 7 of 12 (~700px), every other one inset to 85%. -->
          <PrismicImage
            field={item.item_media}
            fallbackAlt=""
            widths={cappedWidths(item.item_media)}
            sizes="(min-width: 1024px) 700px, calc(100vw - 3rem)"
            loading="lazy"
            class="h-auto {isSmall(item) ? 'w-auto' : 'w-full'} {i % 2 === 1
              ? 'lg:ml-12 lg:max-w-[85%]'
              : ''}"
          />
        {/each}
      </div>
    </div>
  {/if}
</ContentBand>

<style>
  .grid-card {
    background-color: var(--color-green-deep);
  }

  /* The item heading is a real h3/h4 for document structure, but the comp sets
     it at the small tracked label size — so the typographic scale is overridden
     here rather than the element being downgraded to a <p>. */
  .grid-card-heading :global(h3),
  .grid-card-heading :global(h4) {
    font-size: inherit;
    line-height: 1.45;
    letter-spacing: inherit;
    text-transform: inherit;
    font-weight: 400;
  }
</style>
