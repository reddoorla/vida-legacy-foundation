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
</script>

<!-- A labelled lead paragraph: a small eyebrow above the opening copy. Plain,
     token-driven styling so a site can restyle it freely. -->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass={onDark ? "bg-green-btn" : ""}
  contentClass={onDark
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
    class={onDark
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
</style>
