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

  // onCream is the page's closing panel (Figma 5249:1286): the same
  // eyebrow/statement/button parts as onDark, but at display scale on the
  // cream ground, and it draws the 80px rounded top that lifts the whole
  // closing region (this + the testimonial row + the footer) off the dark
  // band above it. Only this slice paints that corner — the sections beneath
  // it are flat cream and stack into the same panel.
  let cream = $derived(slice.variation === "onCream");
  let light = $derived(
    slice.variation === "onCream" ? (slice.primary as Content.CtaBannerSliceOnCreamPrimary) : null,
  );
  // The comp sets both VLF variations in the page's right-hand column
  // (955 of the 1280 grid, from x=405); `layout` lets an author fill the
  // grid instead. Float right is the default because it is the comp, and a
  // document authored before the field reads the same way.
  const fill = $derived(("layout" in slice.primary ? slice.primary.layout : null) === "fill");

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
    edges — this pays pb-[30px], StatsBand pays pt-[30px]. Inside the column
    the block is 20px apart throughout, with the statement capped at the
    comp's 680 and the paragraph at its 578.
  -->
  <ContentBand
    sliceType={slice.slice_type}
    variation={slice.variation}
    sectionClass="bg-dark"
    contentClass="max-w-[1440px] px-6 pt-16 pb-[30px] md:px-20 md:pt-20"
  >
    <div class="flex flex-col items-start gap-5 {fill ? 'w-full' : 'md:ml-auto md:w-[74.4%]'}">
      {#if dark.eyebrow}
        <!-- A label, NOT the section heading: unlike LeadText/IconColumns this
             variation carries a real heading sentence below, and promoting the
             eyebrow too would put two h2s in one section. -->
        <p class="t-label text-green">
          {dark.eyebrow}
        </p>
      {/if}
      {#if isFilled.richText(slice.primary.heading)}
        <div class="cta-statement t-lead text-background max-w-[680px]">
          <RichTextBody field={slice.primary.heading} />
        </div>
      {/if}
      {#if isFilled.richText(dark.body)}
        <div class="richtext-block t-body text-background max-w-[578px]">
          <RichTextBody field={dark.body} />
        </div>
      {/if}
      {#if hasButton}
        <PrismicLink field={slice.primary.buttonLink} class="vlf-pill vlf-pill--dark">
          {slice.primary.buttonLabel}
        </PrismicLink>
      {/if}
    </div>
  </ContentBand>
{:else if cream && light}
  <!--
    Figma 5249:1286. The page's closing panel: full-bleed cream with the 80px
    rounded top, sliding up over the band before it (that band is pinned by
    app.css's slide-over rule, and this section is TRANSPARENT so the corners
    show the pinned band through — navy on the homepage, the lighter cream of
    the board section on Who We Are). The panel is the full viewport width,
    not the 1440 content box: on a wider screen the comp's ground runs edge
    to edge, and only the copy sits on the grid.

    Contrast on #fdf5e8, measured:
      #263b02 eyebrow + statement  11.35:1
      #527e01 highlight             4.47:1 — LARGE TEXT ONLY (it misses AA body
        by 0.03), which is why the highlight is scoped to this display-scale
        heading and nowhere else on cream.
      button #9cbf5b + #263b02 — the design's couple inverted, still 5.86:1

    Pays pt-25 (the comp's 100) and pb-10 (40px): the comp's 80px gap to the
    testimonial row below is split 40/40, since the two ship as separate
    slices.
  -->
  <section
    data-slice-type={slice.slice_type}
    data-slice-variation={slice.variation}
    class="w-full bg-transparent"
  >
    <div class="closing-panel bg-background w-full rounded-t-[40px] md:rounded-t-[80px]">
      <div class="mx-auto w-full max-w-[1440px] px-6 pt-16 pb-10 md:px-20 md:pt-25">
        <div class="flex flex-col items-start gap-10 {fill ? 'w-full' : 'md:ml-auto md:w-[74.6%]'}">
          {#if light.eyebrow}
            <!-- A label, not the section heading — same call as onDark: the
                 statement below is the real h2. -->
            <p class="t-label text-green-btn">
              {light.eyebrow}
            </p>
          {/if}
          {#if isFilled.richText(slice.primary.heading)}
            <div class="cta-display t-display text-green-btn">
              <RichTextBody field={slice.primary.heading} />
            </div>
          {/if}
          {#if hasButton}
            <PrismicLink field={slice.primary.buttonLink} class="vlf-pill">
              {slice.primary.buttonLabel}
            </PrismicLink>
          {/if}
        </div>
      </div>
    </div>
  </section>
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
  /* The statements are real h2/h3s for document structure at the comp's lead
     and display styles — `t-lead` / `t-display` give the style to whichever
     element carries the text. #527e01 on cream is 4.47:1 — large text only.
     It is safe HERE because this heading is display scale and nothing else
     on the cream ground uses it. */
  .cta-display :global(.highlight) {
    color: var(--color-green-mid);
  }
</style>
