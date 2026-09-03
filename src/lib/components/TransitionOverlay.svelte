<script lang="ts">
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import type { BeforeNavigate } from "@sveltejs/kit";
  import type { Snippet } from "svelte";
  import { fade } from "$lib/transitions";

  interface Props {
    visibleDuration?: number;
    fadeOutDuration?: number;
    class?: string;
    /** Navigations the overlay must leave alone. Two kinds on this site: one
     *  the layout cancels (a link that opens a modal instead — afterNavigate
     *  never fires for it, so the overlay would stay up for good) and one it
     *  transitions another way (the language switch's crossfade). */
    skip?: (nav: BeforeNavigate) => boolean;
    /** Rendered inside the overlay — a texture over the ground colour. */
    children?: Snippet;
  }

  let {
    visibleDuration = 1050,
    fadeOutDuration = 700,
    class: passedClasses = "h-screen w-screen fixed z-50 bg-black top-0 left-0",
    skip,
    children,
  }: Props = $props();

  let isTransitioning = $state(false);

  beforeNavigate((nav) => {
    if (skip?.(nav)) return;
    isTransitioning = true;
  });

  afterNavigate(() => {
    setTimeout(() => {
      isTransitioning = false;
    }, visibleDuration);
  });
</script>

{#if isTransitioning}
  <div class={passedClasses} out:fade={{ duration: fadeOutDuration }}>
    {@render children?.()}
  </div>
{/if}
