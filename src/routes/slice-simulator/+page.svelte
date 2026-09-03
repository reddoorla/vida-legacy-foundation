<script lang="ts">
  import { SliceSimulator } from "@slicemachine/adapter-sveltekit/simulator";
  import { SliceZone } from "@prismicio/svelte";
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

<!-- Slot syntax is used for backward compatibility with Svelte <=4. -->
<SliceSimulator let:slices>
  <SliceZone {slices} {components} />
</SliceSimulator>
