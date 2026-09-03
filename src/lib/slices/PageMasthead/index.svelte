<script lang="ts">
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.PageMastheadSlice } = $props();

  let hasImage = $derived(isFilled.image(slice.primary.image));
  let hasCopy = $derived(!!(slice.primary.eyebrow || slice.primary.title));

  // The homepage hero's mechanics with this page's shape. The comp
  // (5312:1216) holds the photograph in a rounded 1280x390 window at 80,70 of
  // the 1440 frame — under the fixed bar — while the image layer itself is
  // full-bleed (1440 wide, off the frame's top), exactly as the home hero's
  // photo sits behind its heart. So the window opens the same way the heart
  // does: a scroll runway, a sticky stage, the mask growing to the viewport,
  // then the copy. The timing is HeartHero's.
  const OPEN_THROUGH = 0.55;
  const COPY_AT = 0.6;

  let sectionEl: HTMLElement | undefined = $state();
  let progress = $state(0);
  let reducedMotion = $state(false);
  let frame = 0;

  const update = () => {
    const el = sectionEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
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

  // Reduced motion lands on the FINAL frame — the open photograph with the
  // page's heading on it — for the same reason HeartHero does: the heading
  // is the page's h1 and the first frame has no message.
  let opened = $derived(reducedMotion ? 1 : Math.min(progress / OPEN_THROUGH, 1));
  let copyIn = $derived(reducedMotion || progress >= COPY_AT);
</script>

<!--
  Figma 5312:1216 / 5180:1063 — the Who We Are masthead. The comp ships it
  photo-only (its copy block is opacity-0), so eyebrow and title are optional
  and render nothing when unauthored; they are modelled because the page
  template renders ONLY the slice zone and nothing else can supply the h1.
  When authored they arrive with the open photograph, at the home hero's
  copy position.

  Contrast: the eyebrow and title sit on the photograph, so the home hero's
  legibility scrim is reused under them — the comp's own gradient over the
  photo is tonal (#666→#000 at 20%), not a scrim.
-->
<section
  bind:this={sectionEl}
  data-slice-type={slice.slice_type}
  data-slice-variation={slice.variation}
  class="page-masthead bg-green-deep relative isolate w-full"
>
  <div class="page-masthead-stage relative w-full overflow-hidden" style="--opened: {opened}">
    {#if hasImage}
      <div class="masthead-window absolute inset-0">
        <HeroBackgroundImage
          image={slice.primary.image}
          preload={true}
          class="h-full w-full object-cover"
        />
        <!-- The comp's own gradient: tonal, not a legibility scrim. -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-[12%] to-black/20 to-[87%]"
        ></div>
        {#if hasCopy}
          <div aria-hidden="true" class="hero-scrim pointer-events-none absolute inset-0"></div>
        {/if}
      </div>
    {/if}

    {#if hasCopy}
      <div class="masthead-copy reveal absolute" class:is-in={copyIn}>
        {#if slice.primary.eyebrow}
          <p class="t-label-lg text-light">{slice.primary.eyebrow}</p>
        {/if}
        {#if slice.primary.title}
          <!-- The page's h1. The slice zone is the whole page, so no other
               component is in a position to provide one. -->
          <h1 class="masthead-title text-cream">{slice.primary.title}</h1>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  /* The scroll runway; the stage is the viewport, pinned while it runs. */
  .page-masthead {
    min-height: 260vh;
  }

  .page-masthead-stage {
    position: sticky;
    top: 0;
    height: 100vh;
  }

  /* The window, as insets on the full-bleed photograph: 70px under the bar,
     the grid's 80 (5.556vw) at the sides, and whatever is left of the
     viewport under the comp's 390-tall (27.08vw) photo — all shrinking to
     nothing, and the 20px corner with them, as `--opened` goes 0 → 1. */
  .masthead-window {
    --closed: calc(1 - var(--opened, 0));
    clip-path: inset(
      calc(70px * var(--closed)) calc(5.556vw * var(--closed))
        calc((100vh - 70px - clamp(200px, 27.08vw, 390px)) * var(--closed))
        calc(5.556vw * var(--closed)) round calc(20px * var(--closed))
    );
  }

  .hero-scrim {
    background: linear-gradient(
      to top,
      rgb(0 0 0 / 0.55) 0%,
      rgb(0 0 0 / 0.28) 34%,
      rgb(0 0 0 / 0) 62%
    );
  }

  /* The comp's copy block: 30 between eyebrow and title, at the home hero's
     position on the frame. */
  .masthead-copy {
    left: 5.53%;
    right: 5.53%;
    bottom: 26.05%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 30px;
  }

  /* 80/92 in the comp, Light, trimmed to the caps like every Extended style. */
  .masthead-title {
    font-family: var(--font-heading);
    font-weight: 300;
    font-size: clamp(2.5rem, 5.56vw, 5rem);
    line-height: 1.15;
    text-box: trim-both cap alphabetic;
  }

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

  @media (prefers-reduced-motion: reduce) {
    .page-masthead {
      min-height: 0;
      aspect-ratio: 1440 / 860;
    }

    .page-masthead-stage {
      position: static;
      height: 100%;
    }

    .reveal {
      transition: none;
    }
  }
</style>
