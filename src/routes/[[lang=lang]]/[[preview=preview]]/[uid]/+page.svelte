<script lang="ts">
  import { SliceZone } from "@prismicio/svelte";
  import { components } from "$lib/slices";

  let { data } = $props();
</script>

<!-- `context` reaches every slice; DonationForm reads the locale from it
     for its field labels. -->
<SliceZone slices={data.page.data.slices} {components} context={{ lang: data.lang }} />
