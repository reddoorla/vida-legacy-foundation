<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "$lib/transitions";
  import type { Lang } from "$lib/locale";
  import { ui } from "$lib/ui-copy";

  // The cover is chrome — the one thing on the site a visitor reads that
  // Prismic does not write — so it takes the page's locale (see $lib/ui-copy).
  let { lang }: { lang?: Lang } = $props();
  const copy = $derived(ui(lang));

  let showLandscapeModal = $state(false);

  onMount(() => {
    // `pointer: coarse` avoids the false positives on touchscreen laptops that
    // a `maxTouchPoints > 0` check would produce.
    const coarse = window.matchMedia("(pointer: coarse)");
    const landscape = window.matchMedia("(orientation: landscape) and (max-width: 1023px)");

    const update = () => {
      showLandscapeModal = coarse.matches && landscape.matches;
    };

    update();
    coarse.addEventListener("change", update);
    landscape.addEventListener("change", update);
    return () => {
      coarse.removeEventListener("change", update);
      landscape.removeEventListener("change", update);
    };
  });
</script>

{#if showLandscapeModal}
  <div
    transition:fade
    role="dialog"
    aria-modal="true"
    aria-labelledby="landscape-heading"
    class="w-screen h-screen fixed bg-black flex justify-center items-center top-0 left-0 z-50"
  >
    <h3 id="landscape-heading" class="text-white">{copy.portraitPlease}</h3>
  </div>
{/if}
