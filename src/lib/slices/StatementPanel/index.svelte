<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.StatementPanelSlice } = $props();

  let hasStatement = $derived(isFilled.richText(slice.primary.statement));
  let hasBody = $derived(isFilled.richText(slice.primary.body));
</script>

<!--
  Figma 5312:1217 — the Who We Are mission band.

  The panel's ground is the SAME cream as the page (#fdf5e8); only the grain
  separates them, at 25% mix-blend-difference. That is deliberate in the comp,
  so there is no border and no shadow here — adding either would read as a
  different design.

  Contrast on #fdf5e8, measured:
    #263b02 body copy 11.35:1
    the statement uses --color-green-mid-aa #507b01 at 4.65:1, NOT the comp's
      #527e01 at 4.47. The comp sets this at 24px, where 4.47 clears AA large
      (≥24px) — but the type clamps to 20px on a phone, and 20px is body size,
      where it fails. The ratio changes with the viewport; the token does not.
      Using the -aa green makes the whole range compliant, and the two greens
      are indistinguishable side by side.
-->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass="bg-background"
  contentClass="max-w-[1440px] px-6 py-10 md:px-20 md:py-15"
>
  <div class="flex flex-col gap-[30px] md:flex-row md:items-start">
    {#if hasStatement}
      <div class="statement text-green-mid-aa font-heading flex-1 leading-[1.45] md:py-5">
        <RichTextBody field={slice.primary.statement} />
      </div>
    {/if}

    {#if hasBody}
      <div class="panel relative overflow-hidden rounded-[20px] p-[30px] md:w-[74.2%] md:shrink-0">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 mix-blend-difference"
          style="background-image: url('/texture-grain.webp')"
        ></div>
        <div class="richtext-block text-green-btn relative text-base leading-6">
          <RichTextBody field={slice.primary.body} />
        </div>
      </div>
    {/if}
  </div>
</ContentBand>

<style>
  .panel {
    background-color: var(--color-background);
  }

  /* The statement is a real h2 for document structure, but the comp sets it at
     the H3 scale rather than the page's heading scale. Note the lower bound:
     20px is body size, which is why the colour is the -aa green. */
  .statement :global(h2) {
    font-size: clamp(1.25rem, 1.67vw, 1.5rem);
    line-height: inherit;
    letter-spacing: 0;
    font-weight: 300;
  }
</style>
