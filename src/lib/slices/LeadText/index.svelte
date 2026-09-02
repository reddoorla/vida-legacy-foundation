<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import type { RichTextField } from "@prismicio/client";

  // Inline prop types keep this slice's contract readable at a glance; they
  // mirror the generated Content.LeadTextSlice shape.
  type Props = {
    slice: {
      slice_type: string;
      variation?: string;
      primary: {
        eyebrow?: string | null;
        body: RichTextField;
      };
    };
  };
  let { slice }: Props = $props();

  // onDark is the VLF homepage mission statement (Figma 5312:1565): the same
  // lead paragraph, set large on the dark green ground with the opening phrase
  // picked out in brand green.
  //
  // Contrast on #263b02 is measured, not assumed:
  //   #fdf5e8 body      11.35:1
  //   #9cbf5b highlight  5.86:1
  // Both clear AA for body text.
  let onDark = $derived(slice.variation === "onDark");

  // statement is the VLF homepage tagline (Figma 5249:1262): the same
  // highlight idiom set at page scale on the night-blue ground, with no
  // eyebrow. Contrast on #01263f: #fdf5e8 14.37:1, #9cbf5b 7.42:1.
  let statement = $derived(slice.variation === "statement");
</script>

<!-- A labelled lead paragraph: a small eyebrow above the opening copy. Plain,
     token-driven styling so a site can restyle it freely. -->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass={statement ? "bg-dark" : onDark ? "bg-green-btn" : ""}
  contentClass={statement
    ? "max-w-[1440px] px-6 pt-16 pb-24 md:px-20 md:pt-15 md:pb-30"
    : onDark
      ? "richtext-block max-w-5xl px-6 py-16 md:px-20 md:pt-[60px] md:pb-24"
      : "richtext-block max-w-2xl px-6 py-10"}
>
  {#if slice.primary.eyebrow}
    <!-- The eyebrow names the section → it's the section heading (h2). -->
    <h2
      class={onDark
        ? "text-light font-heading mb-6 text-sm tracking-[1.5px] uppercase"
        : "text-secondary mb-3 text-sm font-semibold tracking-wide uppercase"}
    >
      {slice.primary.eyebrow}
    </h2>
  {/if}
  <div
    class={statement
      ? "lead-statement text-background font-heading leading-[1.35] md:ml-auto md:w-[74.4%]"
      : onDark
        ? "lead-on-dark text-background font-heading text-[clamp(1.125rem,1.67vw,1.5rem)] leading-[1.45]"
        : "text-lg"}
  >
    <RichTextBody field={slice.primary.body} />
  </div>
</ContentBand>

<style>
  /* Prismic renders a rich-text label as <span class="<label>">. The comp
     colours the opening phrase in brand green; a label keeps that editorial
     rather than hard-coding which words are highlighted. */
  .lead-on-dark :global(.highlight) {
    color: var(--color-green);
  }

  /* The statement's copy IS the section heading, so it renders as a real h2 —
     but at the page's display scale rather than the h2 rule's. */
  .lead-statement :global(h2) {
    font-size: clamp(2rem, 4.17vw, 3.75rem);
    line-height: inherit;
    letter-spacing: 0;
    font-weight: 300;
  }

  /* The comp breaks the line exactly at the highlight, so the highlight is the
     break: a block-level span both colours the phrase and starts its own line,
     which keeps the break editorial instead of hard-coded. */
  .lead-statement :global(.highlight) {
    color: var(--color-green);
    display: block;
  }
</style>
