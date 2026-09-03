<script lang="ts">
  import ContentBand from "$lib/components/ContentBand.svelte";
  import { PrismicImage } from "@prismicio/svelte";
  import { isFilled, type Content, type ImageField } from "@prismicio/client";
  import { cappedWidths } from "@reddoorla/maintenance/images";
  import { resolveAvatarAlt } from "./avatarAlt";

  type Props = { slice: Content.TestimonialSlice };
  let { slice }: Props = $props();

  // onCream is the VLF closing quote (Figma 5249:1292): a narrow quote column
  // beside a row of photographs, inside the cream panel the CtaBanner onCream
  // above it rounds off. It has no avatar and no label — an EXPLICIT branch,
  // because the default's figcaption/avatar machinery has nothing to read.
  let cream = $derived(slice.variation === "onCream");
  let photos = $derived(
    cream ? (slice.items as { image: ImageField }[]).filter((i) => isFilled.image(i.image)) : [],
  );

  // slice.primary is a union across variations, so label/role/avatar are not
  // reachable without narrowing — onCream has none of them. Narrow once here
  // rather than casting at each use site. `quote` and `name` are on both.
  let base = $derived(cream ? null : (slice.primary as Content.TestimonialSliceDefaultPrimary));

  const avatar = $derived(base?.avatar ?? null);
  const hasAvatar = $derived(isFilled.image(avatar));
  // PrismicImage takes its alt off the field, so the name fallback is written
  // back onto the field rather than passed as a prop (see ./avatarAlt.ts).
  const avatarAlt = $derived(resolveAvatarAlt(avatar?.alt, slice.primary.name));
  const avatarField = $derived({ ...avatar, alt: avatarAlt } as ImageField);
  const hasCredit = $derived(Boolean(slice.primary.name || base?.role || hasAvatar));
  // A filled avatar with nothing beside it naming the person is the one case
  // where the credit carries no text at all — give assistive tech the resolved
  // alt as visually-hidden text so the figure is never a bare, silent image.
  const needsSrName = $derived(hasAvatar && !slice.primary.name && !base?.role && !!avatarAlt);
</script>

{#if cream}
  <!--
    Figma 5249:1292. Flat cream — the rounded top and the panel ground are the
    CtaBanner onCream's job; this stacks into the same panel.

    Contrast on #fdf5e8, measured:
      #065184 quote        7.71:1
      #01263f attribution 14.37:1

    The comp draws NO quote marks here (the default variation's ::before/::after
    are scoped to .quote and deliberately not reused), and pt-10/pb-10 are the
    two halves of the 80px gaps to the CTA above and the footer below.
  -->
  <ContentBand
    sliceType={slice.slice_type}
    variation={slice.variation}
    sectionClass="bg-background"
    contentClass="max-w-[1440px] px-6 py-10 md:px-20"
  >
    <div class="flex flex-col gap-5 md:flex-row md:items-stretch">
      {#if slice.primary.quote || slice.primary.name}
        <figure class="flex flex-col justify-center gap-5 md:w-[23.7%] md:shrink-0 md:py-5">
          {#if slice.primary.quote}
            <blockquote class="t-lead text-primary">
              <p>{slice.primary.quote}</p>
            </blockquote>
          {/if}
          {#if slice.primary.name}
            <!-- The em dash is chrome, so the CMS stores the name bare and
                 every attribution is punctuated identically. -->
            <figcaption class="t-body text-dark">— {slice.primary.name}</figcaption>
          {/if}
        </figure>
      {/if}

      {#if photos.length}
        <ul class="grid min-w-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
          {#each photos as photo, i (i)}
            <li class="overflow-hidden rounded-[20px]">
              <!-- Half of the ~76% media column at md+, so ~480px there. -->
              <PrismicImage
                field={photo.image}
                fallbackAlt=""
                widths={cappedWidths(photo.image)}
                sizes="(min-width: 768px) 480px, calc(100vw - 3rem)"
                loading="lazy"
                decoding="async"
                class="aspect-465/314 h-full w-full object-cover"
              />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </ContentBand>
{:else}
  <!-- An attributed pull quote. figure/blockquote/figcaption is the semantic
     pattern; the credited name is deliberately NOT a heading (it does not title
     a section, and marking it as one would both break the page outline and pick
     up whatever type scale the project defines for headings). The optional
     label DOES name the section, so it is the h2 — same call as LeadText. -->
  <ContentBand
    sliceType={slice.slice_type}
    variation={slice.variation}
    contentClass="max-w-3xl px-6 py-10"
  >
    {#if base?.label}
      <h2 class="mb-3 text-sm font-semibold tracking-wide text-secondary uppercase">
        {base.label}
      </h2>
    {/if}

    {#if slice.primary.quote || hasCredit}
      <figure>
        {#if slice.primary.quote}
          <blockquote>
            <p class="quote text-lg leading-relaxed text-primary">
              {slice.primary.quote}
            </p>
          </blockquote>
        {/if}

        {#if hasCredit}
          <figcaption class="flex items-center gap-4 {slice.primary.quote ? 'mt-6' : ''}">
            {#if hasAvatar}
              <PrismicImage
                field={avatarField}
                fallbackAlt=""
                imgixParams={{ auto: ["format", "compress"] }}
                widths={[64, 128, 160, 320]}
                sizes="(min-width: 768px) 80px, 64px"
                loading="lazy"
                decoding="async"
                class="h-16 w-16 shrink-0 rounded-full object-cover md:h-20 md:w-20"
              />
            {/if}
            <div class="min-w-0">
              {#if slice.primary.name}
                <p class="font-semibold text-primary">{slice.primary.name}</p>
              {/if}
              {#if base?.role}
                <p class="text-sm text-secondary">{base.role}</p>
              {/if}
              {#if needsSrName}
                <p class="sr-only">{avatarAlt}</p>
              {/if}
            </div>
          </figcaption>
        {/if}
      </figure>
    {/if}
  </ContentBand>
{/if}

<style>
  /* The curly marks are chrome, not content: the CMS stores the quote bare so
     every testimonial gets identical punctuation. The second `content`
     declaration adds the alternative-text form (`"…" / ""`), which marks the
     generated glyph decorative for screen readers; browsers that don't parse
     it keep the first declaration and still draw the mark. */
  .quote::before {
    content: "\201C";
    content: "\201C" / "";
  }
  .quote::after {
    content: "\201D";
    content: "\201D" / "";
  }
</style>
