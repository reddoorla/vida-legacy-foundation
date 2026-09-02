<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import {
    buttonBaseClasses,
    buttonSkinClasses,
    buttonSkinInverseClasses,
  } from "$lib/components/DefaultButton.svelte";
  import { PrismicLink } from "@prismicio/svelte";
  import { isFilled, type Content } from "@prismicio/client";

  type Props = { slice: Content.CtaBannerSlice };
  let { slice }: Props = $props();

  // onDark is the VLF "Compassion in Action" band (Figma 5249:1232): the same
  // one-headline-one-link idea as the default, but on the night-blue ground
  // with an eyebrow and a supporting paragraph. It is an EXPLICIT branch: its
  // primary has no `background` select — the variation IS the ground.
  let navy = $derived(slice.variation === "onDark");
  // slice.primary is a union across variations, so eyebrow/body are not
  // reachable without narrowing. Narrow once here rather than at each use site.
  let dark = $derived(
    slice.variation === "onDark" ? (slice.primary as Content.CtaBannerSliceOnDarkPrimary) : null,
  );
  // `background` belongs to the default variation only.
  const background = $derived(
    ("background" in slice.primary ? slice.primary.background : null) ?? "light",
  );
  const onDarkGround = $derived(background === "dark");

  // Full literal class strings so the Tailwind scanner keeps them. The palette
  // is the starter's placeholder theme (app.css `@theme`) — swap the tokens
  // per project, not the markup.
  const groundClass = $derived(
    (
      {
        light: "bg-light text-primary",
        dark: "bg-dark text-white",
        white: "bg-white text-primary",
      } as Record<string, string>
    )[background] ?? "bg-light text-primary",
  );

  const hasButton = $derived(
    isFilled.link(slice.primary.buttonLink) && !!slice.primary.buttonLabel,
  );
  // PrismicLink emits a plain <a> (with target/rel when the field asks for
  // them) wearing the shared button skin. Never a <button> inside a link —
  // that is axe's `nested-interactive` violation.
  const buttonClass = $derived(
    `${buttonBaseClasses} ${onDarkGround ? buttonSkinInverseClasses : buttonSkinClasses} shrink-0`,
  );
</script>

{#if navy && dark}
  <!--
    Figma 5249:1232. A left-aligned block centred in the 1440 frame on #01263f.
    Contrast measured on that ground:
      #9cbf5b eyebrow    7.42:1
      #fdf5e8 copy      14.37:1
      button #263b02 + #9cbf5b — the design's couple, 5.86:1

    Vertical rhythm: the comp runs pt-80 / gap-60 / pb-60 across this band AND
    the stats card below it, which ships as its own slice so an author can drop
    either one alone. The 60px gap is therefore split 30/30 across the facing
    edges — this pays pb-[30px], StatsBand pays pt-[30px].
  -->
  <ContentBand
    sliceType={slice.slice_type}
    variation={slice.variation}
    sectionClass="bg-dark"
    contentClass="flex max-w-[1440px] flex-col items-center px-6 pt-16 pb-[30px] md:px-20 md:pt-20"
  >
    <div class="flex w-full max-w-[680px] flex-col items-start gap-5">
      {#if dark.eyebrow}
        <!-- A label, NOT the section heading: unlike LeadText/IconColumns this
             variation carries a real heading sentence below, and promoting the
             eyebrow too would put two h2s in one section. -->
        <p class="text-green font-heading text-xs tracking-[1.5px] uppercase">
          {dark.eyebrow}
        </p>
      {/if}
      {#if isFilled.richText(slice.primary.heading)}
        <div
          class="cta-statement text-background font-heading text-[clamp(1.25rem,1.67vw,1.5rem)] leading-[1.45]"
        >
          <RichTextBody field={slice.primary.heading} />
        </div>
      {/if}
      {#if isFilled.richText(dark.body)}
        <div class="richtext-block text-background max-w-[578px] text-base leading-6">
          <RichTextBody field={dark.body} />
        </div>
      {/if}
      {#if hasButton}
        <PrismicLink
          field={slice.primary.buttonLink}
          class="bg-green-btn text-green font-button inline-flex h-10 w-fit items-center justify-center rounded-full px-3.75 text-[10px] tracking-[1px] uppercase"
        >
          {slice.primary.buttonLabel}
        </PrismicLink>
      {/if}
    </div>
  </ContentBand>
{:else}
  <!-- A closing call-to-action band: one headline, one link. Deliberately
     unstyled beyond the theme tokens — the heading's size comes from the
     project's own h2 rule (app.css leaves the type scale blank), and
     RichTextBody keeps the announced level gap-free without touching the tag,
     so the visual never drifts from the outline. -->
  <ContentBand
    sliceType={slice.slice_type}
    variation={slice.variation}
    sectionClass={groundClass}
    contentClass="flex max-w-5xl flex-col items-start gap-8 px-6 py-16 md:flex-row md:items-center md:justify-between"
  >
    {#if isFilled.richText(slice.primary.heading)}
      <div class="max-w-2xl">
        <RichTextBody field={slice.primary.heading} />
      </div>
    {/if}

    {#if hasButton}
      <PrismicLink field={slice.primary.buttonLink} class={buttonClass}>
        {slice.primary.buttonLabel}
      </PrismicLink>
    {/if}
  </ContentBand>
{/if}

<style>
  /* The statement is a real h2/h3 for document structure, but the comp sets it
     at the H3 body scale rather than the page's heading scale — so the
     typographic scale is overridden here rather than the element downgraded. */
  .cta-statement :global(h2),
  .cta-statement :global(h3) {
    font-size: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    font-weight: 400;
  }
</style>
