<script lang="ts">
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { isFilled } from "@prismicio/client";
  import type { Content } from "@prismicio/client";
  import { TEXTURE_LQIP } from "./texture-lqip";

  let { slice }: { slice: Content.HeartHeroSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));

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

  // Scroll-driven heart reveal, modelled on reddoor-website's OpeningAnimation:
  // a mask that scales with scroll progress so the shape opens and reveals the
  // photo behind it.
  //
  // Two deliberate differences from that component:
  //
  //  1. sticky, not fixed. OpeningAnimation is a page-level component used once
  //     at the top of the homepage, so a `fixed` full-viewport layer is safe
  //     there. This is a Prismic slice with siblings after it (and it renders on
  //     the a11y fixtures page alongside every other slice) — `fixed` would
  //     cover all of them. `sticky` inside a tall section gives the same effect,
  //     contained.
  //  2. a CSS mask-image, not an <svg><clipPath><path>. We have the heart as an
  //     exported alpha PNG, not path data, and hand-authoring the path would be
  //     redrawing an asset we already have. Scaling `mask-size` is equivalent.
  //
  // Figma carries NO motion data for this node — get_motion_context returns an
  // empty set recursively — so the timing below is the reddoor precedent
  // translated, not a spec. Tunable via the three constants.
  const HEART_START_PCT = 46.49; // the comp's resting heart width, % of viewport
  const HEART_END_PCT = 620; // large enough to clear the viewport corners
  const REVEAL_THROUGH = 0.85; // fraction of the runway used for the reveal

  let sectionEl: HTMLElement | undefined = $state();
  let heartSize = $state(HEART_START_PCT);
  let reducedMotion = $state(false);
  let frame = 0;

  const update = () => {
    const el = sectionEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    // Unmeasurable runway (rect still 0 pre-layout, or a viewport taller than
    // the section) falls back to 0 — the CLOSED, resting heart. reddoor's
    // OpeningAnimation falls back to fully-revealed, which is right for it
    // because revealed is its end state; here the resting heart is the
    // designed composition, and defaulting open flashes a full-bleed photo
    // before the first scroll corrects it.
    const pct = scrollable <= 0 ? 0 : Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const eased = Math.min(pct / REVEAL_THROUGH, 1);
    heartSize = HEART_START_PCT + eased * (HEART_END_PCT - HEART_START_PCT);
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
      // Back to the comp's resting frame; the CSS drops the runway to match.
      if (e.matches) heartSize = HEART_START_PCT;
      else update();
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

  // Reduced motion keeps the comp's static composition rather than reddoor's
  // "jump to the final frame": here the resting heart IS the designed hero, so
  // the end frame (a full-bleed photo) would be the wrong thing to land on.
  let maskSize = $derived(reducedMotion ? HEART_START_PCT : heartSize);
</script>

<!--
  Homepage masthead. Proportions are the comp's (Figma 5249:1132, 1440x860):
  heart 669.436 x 584 -> 46.49% of the band width, aspect 669.436/584.

  The heart is the comp's own exported asset used as a CSS mask
  (static/heart-mask.png), NOT a hand-drawn path — see "never redraw an asset"
  in CLAUDE.md.
-->
<section
  bind:this={sectionEl}
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="heart-hero bg-green relative isolate w-full"
>
  <div class="heart-hero-stage relative w-full overflow-hidden">
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
      <div class="heart-mask absolute inset-0" style="--heart-size: {maskSize}%">
        <HeroBackgroundImage image={slice.primary.image} class="h-full w-full object-cover" />
      </div>
    {/if}
  </div>
</section>

<style>
  /* The scroll runway. Only exists when motion is allowed — under reduced
     motion the section collapses to the comp's static band, set in CSS rather
     than JS so the first paint is already correct and nothing shifts. */
  .heart-hero {
    min-height: 220vh;
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
    -webkit-mask-position: center;
    mask-position: center;
    /* Width drives it; height follows the mask's own 669.436/584 aspect. */
    -webkit-mask-size: var(--heart-size) auto;
    mask-size: var(--heart-size) auto;
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

    .heart-hero-stage {
      position: static;
      height: 100%;
    }

    .texture-full {
      transition: none;
    }
  }
</style>
