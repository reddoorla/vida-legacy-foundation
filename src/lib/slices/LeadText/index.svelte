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
        layout?: "float right" | "fill" | null;
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

  // The comp sets both VLF variations in the page's right-hand column —
  // 952.5px of the 1280 grid, from x=407.5 — and `layout` lets an author
  // fill the grid instead. Float right is the default because it is the
  // comp; a missing value (a document authored before the field) reads
  // the same way.
  let fill = $derived(slice.primary.layout === "fill");
  let column = $derived(fill ? "w-full" : "md:ml-auto md:w-[74.4%]");
</script>

<!-- A labelled lead paragraph: a small eyebrow above the opening copy. Plain,
     token-driven styling so a site can restyle it freely.

     Both VLF variations are `sticky-cover` bands: the comp pins them
     ("sticky scrolls") while the next band slides up over them — see the
     slide-over note in app.css. The comp's vertical rhythm is 60px above
     the paragraph and none below it for onDark (the columns band that
     follows pays its own 120), and 60 above / 120 below for the statement. -->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass={statement ? "bg-dark sticky-cover" : onDark ? "bg-green-btn sticky-cover" : ""}
  contentClass={statement
    ? "max-w-[1440px] px-6 pt-10 pb-16 md:px-20 md:pt-[60px] md:pb-30"
    : onDark
      ? "max-w-[1440px] px-6 pt-10 md:px-20 md:pt-[60px]"
      : "richtext-block max-w-2xl px-6 py-10"}
>
  {#if slice.primary.eyebrow}
    <!-- The eyebrow names the section → it's the section heading (h2). -->
    <h2
      class={onDark
        ? `t-label text-light mb-5 ${column}`
        : "text-secondary mb-3 text-sm font-semibold tracking-wide uppercase"}
    >
      {slice.primary.eyebrow}
    </h2>
  {/if}
  <div
    class={statement
      ? `lead-statement t-display text-background ${column}`
      : onDark
        ? `lead-on-dark richtext-block t-lead text-background ${column}`
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

  /* The comp breaks the line exactly at the highlight, so the highlight is the
     break: a block-level span both colours the phrase and starts its own line,
     which keeps the break editorial instead of hard-coded. The statement's
     copy IS the section heading — a real h2 (or a paragraph, if the author
     typed one) at the display style, which `t-display` gives whichever
     element carries it. */
  .lead-statement :global(.highlight) {
    color: var(--color-green);
    display: block;
  }
</style>
