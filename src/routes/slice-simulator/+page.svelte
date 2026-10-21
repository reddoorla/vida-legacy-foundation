<script lang="ts">
  import { SliceSimulator, SliceZone } from "@prismicio/svelte";
  import { components } from "$lib/slices";
</script>

<!-- Internal tooling, not a page of the site. robots.txt disallows these
     paths, but that is a CRAWL directive: a disallowed URL still gets indexed
     if anything external links to it, and the self-referencing canonical is
     the only index signal otherwise present. This is the index directive.
     netlify.toml sends the same thing as a header, so the two hold whether or
     not this page's HTML is what a crawler reads. -->
<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- @prismicio/svelte 3 hands the slices to a `children` snippet; it has no slot. -->
<SliceSimulator>
  {#snippet children({ slices })}
    <SliceZone {slices} {components} />
  {/snippet}
</SliceSimulator>
