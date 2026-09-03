<script lang="ts">
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import type { BeforeNavigate } from "@sveltejs/kit";
  import type { Snippet } from "svelte";
  import { fade } from "$lib/transitions";

  interface Props {
    /** How long a navigation may take before the overlay covers the wait.
     *  A prerendered page usually lands well inside it, and then nothing is
     *  shown at all — the overlay is a loading cover, not a page effect. */
    delay?: number;
    /** Once shown, the least time it stays, so a load that finishes just
     *  after `delay` does not flash it. */
    minVisible?: number;
    fadeOutDuration?: number;
    class?: string;
    /** Navigations the overlay must leave alone. Two kinds on this site: one
     *  the layout cancels (a link that opens a modal instead — afterNavigate
     *  never fires for it, so the overlay would come up and stay) and one it
     *  transitions another way (the language switch's crossfade). */
    skip?: (nav: BeforeNavigate) => boolean;
    /** Rendered inside the overlay — a texture over the ground colour. */
    children?: Snippet;
  }

  let {
    delay = 200,
    minVisible = 400,
    fadeOutDuration = 400,
    class: passedClasses = "h-screen w-screen fixed z-50 bg-black top-0 left-0",
    skip,
    children,
  }: Props = $props();

  let isTransitioning = $state(false);

  // A navigation is pending from beforeNavigate to afterNavigate. The overlay
  // appears only if it is still pending after `delay`, and then leaves
  // `minVisible` after it appeared or when the navigation lands, whichever is
  // later.
  //
  // A navigation that UNLOADS the page is out of scope, because `afterNavigate`
  // is never called for one and nothing would take the cover down. The
  // outgoing document stays alive and scriptable while the next one loads, so
  // an external link (a Prismic CTA out to LGL or PayPal) would raise the
  // cover and then be frozen into the back/forward cache with it up — and on
  // Back the page would come back dead, swallowing every tap. Hence both the
  // `willUnload` bail and the `pageshow` reset below.
  let pending = false;
  let shownAt = 0;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  beforeNavigate((nav) => {
    if (nav.willUnload || !nav.to || skip?.(nav)) return;
    pending = true;
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    showTimer = setTimeout(() => {
      if (!pending) return;
      isTransitioning = true;
      shownAt = Date.now();
    }, delay);
  });

  afterNavigate(() => {
    pending = false;
    clearTimeout(showTimer);
    if (!isTransitioning) return;
    const remaining = Math.max(0, minVisible - (Date.now() - shownAt));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      isTransitioning = false;
    }, remaining);
  });

  // A page restored from the back/forward cache is the document exactly as it
  // was left. Clear whatever was in flight then: nothing is navigating now.
  $effect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      pending = false;
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      isTransitioning = false;
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  });
</script>

{#if isTransitioning}
  <div
    data-overlay
    class={passedClasses}
    in:fade={{ duration: 150 }}
    out:fade={{ duration: fadeOutDuration }}
  >
    {@render children?.()}
  </div>
{/if}
