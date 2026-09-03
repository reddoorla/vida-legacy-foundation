<script lang="ts">
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { PORTRAIT_HERO_ASPECT } from "$lib/utils/image";
  import { PrismicLink, PrismicRichText } from "@prismicio/svelte";
  import { isFilled } from "@prismicio/client";
  import type { Content } from "@prismicio/client";
  import { TEXTURE_LQIP } from "./texture-lqip";
  import { heartEndPct } from "./heart";

  let { slice }: { slice: Content.HeartHeroSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));
  let hasHeading = $derived(isFilled.richText(slice.primary.heading));
  let ctas = $derived((slice.items ?? []).filter((i) => i.cta_label && isFilled.link(i.cta_link)));

  const TEXTURE_FULL = "/texture-grain.webp";

  // Walk the grain up in quality after first paint. The inlined LQIP ships in
  // the HTML so the ground is never flat green; the full file fades over it.
  //
  // Deliberately an Image() in an $effect and NOT `<img onload=...>`: this
  // site's CSP grants script-src nonces WITHOUT 'unsafe-inline', so an inline
  // handler is silently blocked and the texture would stay at LQIP forever with
  // no console error. See "Two CSP traps" in CLAUDE.md.
  let textureReady = $state(false);

  $effect(() => {
    const img = new Image();
    let cancelled = false;
    const done = () => {
      if (!cancelled) textureReady = true;
    };
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    img.src = TEXTURE_FULL;
    if (img.complete) done();
    return () => {
      cancelled = true;
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  });

  // The four Figma variants of Masthead #2 (5155:1491) ARE the animation spec:
  //   Property 1=1        heart at rest on the green ground
  //   Property 1=2        heart fully open, photo full-bleed
  //   Property 1=Variant3 eyebrow + heading revealed
  //   Property 1=Variant4 CTAs + scroll bar revealed
  //
  // Nothing is keyframed in Figma's motion system (get_motion_context returns
  // an empty set even recursively), so the frames carry the states and the
  // timing between them is ours — modelled on reddoor-website's
  // OpeningAnimation, which stages its reveal the same way through its
  // showCompelling / showButtons thresholds.
  //
  // The heart's two sizes ARE specified: the mask is 669.436px wide at rest and
  // 2696.08px in Variant4, against a 1440px band — 46.49% opening to 187.2%.
  // So is where it sits: at rest its top is at 173 of 860 (the mask's 584px
  // leaves 276 to place, and 173 of that is 62.7%); open, it is centred.
  const HEART_START_PCT = 46.49;
  const HEART_START_Y = 62.7;
  const HEART_END_Y = 50;
  const HEART_OPEN_THROUGH = 0.55; // heart fully open this far through the runway
  const COPY_AT = 0.6;
  const CTAS_AT = 0.74;

  let sectionEl: HTMLElement | undefined = $state();
  let stageEl: HTMLElement | undefined = $state();
  let stageW = $state(0);
  let stageH = $state(0);
  let progress = $state(0);
  let reducedMotion = $state(false);
  let frame = 0;

  const update = () => {
    const el = sectionEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    // Unmeasurable runway (rect still 0 pre-layout, or a viewport taller than
    // the section) falls back to 0 — the closed, resting heart — so the hero
    // never flashes open before the first scroll corrects it.
    progress = scrollable <= 0 ? 0 : Math.min(Math.max(-rect.top / scrollable, 0), 1);
  };

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  $effect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = mq.matches;
    const onMQ = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (!e.matches) update();
    };
    mq.addEventListener("change", onMQ);

    if (!mq.matches) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      update();
    }

    return () => {
      mq.removeEventListener("change", onMQ);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  });

  // Reduced motion lands on the FINAL frame, not the first. The hero carries
  // the page's heading and its primary calls to action; leaving a
  // reduced-motion visitor on frame 1 would be a green field with no message
  // and nothing to act on. This is the opposite of what the image-only version
  // of this slice did — correct then, wrong the moment the hero gained copy.
  // The open size: the comp's, or whatever this stage's shape needs — see
  // ./heart.ts. Measured rather than chosen by a media query, because it
  // follows the stage's aspect, and measured in BOTH modes since reduced
  // motion lands on the open frame.
  let endPct = $derived(heartEndPct(stageW, stageH));

  $effect(() => {
    const el = stageEl;
    if (!el) return;
    const measureStage = () => {
      stageW = el.offsetWidth;
      stageH = el.offsetHeight;
    };
    measureStage();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureStage);
      return () => window.removeEventListener("resize", measureStage);
    }
    const ro = new ResizeObserver(measureStage);
    ro.observe(el);
    return () => ro.disconnect();
  });

  let heartSize = $derived(
    reducedMotion
      ? endPct
      : HEART_START_PCT + Math.min(progress / HEART_OPEN_THROUGH, 1) * (endPct - HEART_START_PCT),
  );
  let heartY = $derived(
    reducedMotion
      ? HEART_END_Y
      : HEART_START_Y + Math.min(progress / HEART_OPEN_THROUGH, 1) * (HEART_END_Y - HEART_START_Y),
  );
  let copyIn = $derived(reducedMotion || progress >= COPY_AT);
  // The bar arrives with the calls to action: Variant3 holds it just below
  // the frame (y=860 of 860) and Variant4 has it in place — at rest the hero
  // is the full viewport of green and heart, nothing else.
  let ctasIn = $derived(reducedMotion || progress >= CTAS_AT);
</script>

<!--
  Homepage masthead. Geometry is the comp's (Figma 5155:1491, 1440x860):
    heart  669.436px wide at rest -> 46.49% of the band, opening to 187.2%
    copy   left 79.67px (5.53%), bottom 224px (26.05%), width 630.333px
    bar    100px tall (11.63%), #263b02, arrow 66.333px

  The heart and the arrow are the comp's own exported assets
  (static/heart-mask.png, static/arrow-down.svg), NOT hand-drawn — see "never
  redraw an asset" in CLAUDE.md.
-->
<section
  bind:this={sectionEl}
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="heart-hero bg-green relative isolate w-full"
>
  <div bind:this={stageEl} class="heart-hero-stage relative w-full overflow-hidden">
    <!-- Decorative grain. Blend + opacity live on the wrapper so they apply
         ONCE to the composited result — putting them on both layers would
         double-lighten during the cross-fade. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-20 mix-blend-plus-lighter"
    >
      <div
        class="absolute inset-0 bg-cover bg-center"
        style="background-image: url('{TEXTURE_LQIP}')"
      ></div>
      <div
        class="texture-full absolute inset-0 bg-cover bg-center"
        class:is-ready={textureReady}
        style="background-image: url('{TEXTURE_FULL}')"
      ></div>
    </div>

    {#if hasImage}
      <div
        class="heart-mask absolute inset-0"
        style="--heart-size: {heartSize}%; --heart-y: {heartY}%"
      >
        <!-- portrait: a phone gets a face-aware, phone-shaped crop instead of
             the landscape master magnified by object-cover. -->
        <HeroBackgroundImage
          image={slice.primary.image}
          portrait={PORTRAIT_HERO_ASPECT}
          portraitMedia="(max-width: 767px) and (prefers-reduced-motion: no-preference)"
          class="h-full w-full object-cover"
        />
      </div>
    {/if}

    <!-- Legibility scrim. NOT in the comp, which sets #fffbf4 copy straight onto
         the photograph — contrast there depends entirely on whichever image an
         editor uploads, and axe cannot measure text over an image. This keeps
         the designed colours while making them safe against any photo. -->
    <div aria-hidden="true" class="hero-scrim pointer-events-none absolute inset-0"></div>

    <div class="hero-copy reveal absolute" class:is-in={copyIn}>
      {#if slice.primary.eyebrow}
        <p class="t-label-lg text-light">
          {slice.primary.eyebrow}
        </p>
      {/if}
      {#if hasHeading}
        <div class="hero-heading text-cream font-heading">
          <PrismicRichText field={slice.primary.heading} />
        </div>
      {/if}
      {#if ctas.length}
        <div class="reveal flex flex-wrap gap-5" class:is-in={ctasIn}>
          {#each ctas as cta, i (i)}
            <PrismicLink field={cta.cta_link} class="vlf-pill vlf-pill--dark">
              {cta.cta_label}
            </PrismicLink>
          {/each}
        </div>
      {/if}
    </div>

    <div
      class="hero-bar bg-green-btn absolute inset-x-0 bottom-0 flex items-center justify-center"
      class:is-in={ctasIn}
    >
      <img src="/arrow-down.svg" alt="" aria-hidden="true" class="hero-arrow" />
    </div>
  </div>
</section>

<style>
  /* The scroll runway. Under reduced motion it collapses to the comp's band,
     set in CSS rather than JS so the first paint is already correct. */
  .heart-hero {
    min-height: 260vh;
  }

  .heart-hero-stage {
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .heart-mask {
    -webkit-mask-image: url("/heart-mask.png");
    mask-image: url("/heart-mask.png");
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center var(--heart-y, 50%);
    mask-position: center var(--heart-y, 50%);
    /* Width drives it; height follows the mask's own 669.436/584 aspect. */
    -webkit-mask-size: var(--heart-size) auto;
    mask-size: var(--heart-size) auto;
  }

  .hero-scrim {
    background: linear-gradient(
      to top,
      rgb(0 0 0 / 0.55) 0%,
      rgb(0 0 0 / 0.28) 34%,
      rgb(0 0 0 / 0) 62%
    );
  }

  .hero-copy {
    left: 5.53%;
    right: 5.53%;
    bottom: 26.05%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: clamp(1.25rem, 2.8vw, 2.5rem);
  }

  @media (min-width: 768px) {
    .hero-copy {
      right: auto;
      max-width: 43.8%;
    }
  }

  /* The comp's headline: 40/50, Light — its box trimmed to the caps like
     every Extended style in the comp, so the 40px gaps either side of it
     measure cap-to-baseline. */
  .hero-heading :global(h1),
  .hero-heading :global(h2) {
    font-size: clamp(1.5rem, 2.78vw, 2.5rem);
    line-height: 1.25;
    font-weight: 300;
    text-box: trim-both cap alphabetic;
  }

  /* Off the bottom edge until the calls to action are in, then it rises with
     them (the same 700ms as the copy). */
  .hero-bar {
    height: 11.63%;
    min-height: 3.5rem;
    transform: translateY(100%);
    transition: transform 700ms ease-out;
  }

  .hero-bar.is-in {
    transform: none;
  }

  .hero-arrow {
    width: clamp(2rem, 4.6vw, 4.146rem);
    height: auto;
  }

  /* Staged reveal. Opacity + translate only, never display/visibility, so the
     heading and links stay in the accessibility tree and the tab order the
     whole time. :focus-within is the escape hatch — a keyboard user who tabs
     to a CTA before scrolling gets it revealed rather than focusing something
     invisible. */
  .reveal {
    opacity: 0;
    transform: translateY(1.25rem);
    transition:
      opacity 700ms ease-out,
      transform 700ms ease-out;
  }

  .reveal.is-in,
  .reveal:focus-within {
    opacity: 1;
    transform: none;
  }

  .texture-full {
    opacity: 0;
    transition: opacity 600ms ease-out;
  }

  .texture-full.is-ready {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .heart-hero {
      min-height: 0;
      aspect-ratio: 1440 / 860;
    }

    /* Except on a phone, where the comp's landscape band is 224px tall and
       the copy inside it overflowed into the fixed bar. Reduce Motion is a
       mainstream setting; it must not cost the reader the headline. */
    @media (width < 48rem) {
      .heart-hero {
        aspect-ratio: auto;
        min-height: 100svh;
      }
    }

    .heart-hero-stage {
      position: static;
      height: 100%;
    }

    .reveal,
    .hero-bar,
    .texture-full {
      transition: none;
    }
  }
</style>
