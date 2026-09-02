<script lang="ts">
  import ContactModal from "$lib/components/ContactModal.svelte";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<!--
  The contact page is the contact modal's panel in-flow: the no-JS fallback
  and the crawler's target for every "/contact" link (the layout intercepts
  those into the dialog when scripts run). Same form, same action — this
  route's — so the two can never drift. It has no slice, so the nav sits on
  the cream in its default tone; pt-30 pays for the bar over it, as the
  donation page does.
-->
<div class="bg-background">
  <div class="mx-auto w-full max-w-[1440px] px-6 pt-30 pb-15 md:px-20">
    <div class="md:ml-auto md:w-[74.4%]">
      <ContactModal inline headingLevel={1} lang={data.lang} ts={data.formTs} result={form} />
    </div>
  </div>
</div>
