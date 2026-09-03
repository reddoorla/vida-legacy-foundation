<script lang="ts">
  import CountUp from "$lib/components/CountUp.svelte";
  import { PrismicLink } from "@prismicio/svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.StatsBandSlice } = $props();

  // Slice Machine writes Number fields back as strings often enough that the
  // repo's CLAUDE.md calls it out as a regen trap — coerce rather than trust,
  // and drop anything that still is not a number.
  const toNumber = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // A word-suffix ("people", "lives") reads as a separate word; a symbol
  // ("+", "%") sits tight against the digits. Authors type the bare token and
  // this decides the space, so nobody has to hide a leading space in a Text
  // field where it would be trimmed.
  const joinSuffix = (s: string | null | undefined) =>
    !s ? "" : /^[\p{L}]/u.test(s) ? ` ${s}` : s;

  let stats = $derived(
    (slice.items ?? [])
      .map((item) => ({ ...item, value: toNumber(item.value) }))
      .filter((item) => item.value !== null || item.description),
  );
  let hasCta = $derived(!!slice.primary.cta_label && isFilled.link(slice.primary.cta_link));
</script>

<!--
  Figma 5249:1243 — "By the numbers". A #004370 card raised off the #01263f
  band, wearing the site's grain at 15% mix-blend-difference (the same
  texture-grain.webp the hero and IconColumns use — verified byte-identical to
  the comp's own fill, so it costs no extra bytes).

  Contrast on #004370, measured:
    #fdf5e8 descriptions   9.53:1
    #9cbf5b figures        4.92:1
  The grain's brightest pixel (254) lifts the ground to #265575 at worst, which
  takes the figures to 3.80 — still AA for text this size (36px = large), and
  the only green on this ground. Do not add small green text here.

  The band's own pt-[30px] is the second half of the 60px gap the comp puts
  between this and the CtaBanner onDark above it, which pays the first half.

  Inside the card the comp is 40 from the eyebrow's cap to the figures' cap,
  20 between a figure, its copy and the button, and four 282.5px columns
  30 apart. The four columns hold only while the button fits one line, and
  that is true at the comp's own width and no narrower: 282.5px of column
  against a 279px pill at 1440, 242px at Tailwind's xl. So the grid goes 2x2
  below 1440 rather than wrapping the button — the round-1 note asked for
  exactly that ("go to a 2x2 grid before the register button wraps").
-->
<section
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="bg-dark w-full"
>
  <div class="mx-auto w-full max-w-[1440px] px-6 pt-[30px] pb-16 md:px-20 md:pb-[60px]">
    <div class="stats-card relative overflow-hidden rounded-[20px] p-[30px]">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15 mix-blend-difference"
        style="background-image: url('/texture-grain.webp')"
      ></div>

      <div class="relative flex flex-col gap-10">
        {#if slice.primary.eyebrow}
          <!-- The eyebrow names the section, and nothing else here is a
               heading (the figures are data), so it is the section's h2. -->
          <h2 class="t-label text-background">
            {slice.primary.eyebrow}
          </h2>
        {/if}

        {#if stats.length}
          <div class="grid gap-[30px] sm:grid-cols-2 wide:grid-cols-4">
            {#each stats as stat, i (i)}
              <div class="flex flex-col items-start gap-5">
                {#if stat.value !== null}
                  <p class="t-stat text-green">
                    <CountUp value={stat.value} suffix={joinSuffix(stat.suffix)} />
                  </p>
                {/if}
                {#if stat.description}
                  <p class="t-body text-background">{stat.description}</p>
                {/if}
                {#if hasCta && i === stats.length - 1}
                  <!-- The comp hangs the CTA off the last figure rather than
                       giving it its own cell, so it stays with the column even
                       when the grid reflows to 2-up or 1-up. -->
                  <PrismicLink field={slice.primary.cta_link} class="vlf-pill vlf-pill--dark">
                    {slice.primary.cta_label}
                    <img
                      src="/icons/arrow-right.svg"
                      alt=""
                      aria-hidden="true"
                      class="h-3.5 w-2.5 -rotate-90"
                    />
                  </PrismicLink>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  .stats-card {
    background-color: var(--color-blue-textured);
  }
</style>
