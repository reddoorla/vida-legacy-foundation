<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.PersonGridSlice } = $props();

  let hasHeading = $derived(isFilled.richText(slice.primary.heading));
  let people = $derived((slice.items ?? []).filter((p) => p.name || isFilled.image(p.headshot)));

  // Heading levels shift with the content, because this slice appears twice on
  // the Who We Are page and only the FIRST carries the display heading. Fixing
  // the label at h3 would leave the second group starting at h3 under the page
  // h1 — a skipped level, which axe flags as heading-order.
  let labelTag = $derived(hasHeading ? "h3" : "h2");
  let nameTag = $derived(hasHeading ? "h4" : "h3");

  // Which person's bio is open. null = closed. Index rather than object so the
  // dialog survives an items reorder without pointing at stale content.
  let openIndex: number | null = $state(null);
  let open = $derived(openIndex !== null);
  let current = $derived(openIndex === null ? null : people[openIndex]);

  function close() {
    openIndex = null;
  }
</script>

<!--
  Figma 5312:1270 (Leadership) and 5328:1557 (Board of Directors) — the same
  slice twice, which is why the display heading is optional.

  Card ground is #172303 under the site's grain at 20% mix-blend-plus-lighter —
  the same treatment and the same texture-grain.webp as IconColumns' card (the
  comp's fill downloads byte-identical to it).

  Contrast on #172303, measured:
    #9cbf5b names and email  7.84:1
    #fdf5e8 roles and bio   15.18:1

  The "+" badge is a real <button>, not a decorated div: it opens the bio and
  therefore has to be reachable by keyboard and announced. It is drawn only
  when a bio is authored, so the affordance never lies.
-->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass="bg-background"
  contentClass="max-w-[1440px] px-6 py-10 md:px-20 md:py-15"
>
  {#if hasHeading}
    <div
      class="person-heading text-green-btn font-heading mb-15 leading-[1.35] md:ml-auto md:w-[74.4%]"
    >
      <RichTextBody field={slice.primary.heading} />
    </div>
  {/if}

  <div class="flex flex-col gap-[30px] md:flex-row md:items-start">
    <div class="text-green-btn flex flex-col gap-5 md:w-[297.5px] md:shrink-0 md:py-5">
      {#if slice.primary.label}
        <svelte:element this={labelTag} class="font-heading text-lg tracking-[1.5px] uppercase">
          {slice.primary.label}
        </svelte:element>
      {/if}
      {#if isFilled.richText(slice.primary.intro)}
        <div class="richtext-block text-base leading-6">
          <RichTextBody field={slice.primary.intro} />
        </div>
      {/if}
    </div>

    {#if people.length}
      <ul class="flex min-w-0 flex-1 flex-wrap gap-[30px]">
        {#each people as person, i (i)}
          <li
            class="bg-green-deep relative flex w-full flex-col overflow-hidden rounded-[20px] sm:w-[296px]"
          >
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-plus-lighter"
              style="background-image: url('/texture-grain.webp')"
            ></div>

            <div class="relative aspect-square w-full overflow-hidden">
              {#if isFilled.image(person.headshot)}
                <HeroBackgroundImage
                  image={person.headshot}
                  preload={false}
                  class="h-full w-full object-cover"
                />
              {/if}
              {#if isFilled.richText(person.bio)}
                <button
                  type="button"
                  onclick={() => (openIndex = i)}
                  class="absolute right-4 bottom-4 inline-flex h-11 w-11 items-center justify-center rounded-full"
                >
                  <img src="/icons/plus-circle.svg" alt="" aria-hidden="true" class="h-6 w-6" />
                  <span class="sr-only">Read the bio for {person.name || "this person"}</span>
                </button>
              {/if}
            </div>

            <div class="relative flex flex-col gap-2.5 p-5">
              {#if person.name}
                <svelte:element
                  this={nameTag}
                  class="text-green font-heading text-lg tracking-[1.5px] uppercase"
                >
                  {person.name}
                </svelte:element>
              {/if}
              {#if person.role}
                <p class="text-background text-base leading-6">{person.role}</p>
              {/if}
              {#if person.email}
                <!-- The CMS stores the bare address; the component makes the
                     mailto:, so a typo cannot produce a broken scheme. -->
                <a
                  href="mailto:{person.email}"
                  class="text-green font-button inline-flex w-fit items-center gap-2.5 text-[10px] tracking-[1px] uppercase hover:opacity-70"
                >
                  {person.email}
                  <img
                    src="/icons/arrow-right.svg"
                    alt=""
                    aria-hidden="true"
                    class="h-3.5 w-2.5 -rotate-90"
                  />
                </a>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</ContentBand>

{#if current}
  <Modal
    {open}
    onclose={close}
    dialogClass="max-w-[1200px]"
    class="bg-green-deep relative overflow-hidden rounded-[20px]"
    closeClass="text-green hover:text-background"
    bodyClass="p-[30px]"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-plus-lighter"
      style="background-image: url('/texture-grain.webp')"
    ></div>
    <div class="relative flex flex-col gap-[30px] md:flex-row md:items-start">
      {#if isFilled.image(current.headshot)}
        <div class="aspect-square w-full shrink-0 overflow-hidden rounded-[20px] md:w-[296px]">
          <HeroBackgroundImage
            image={current.headshot}
            preload={false}
            class="h-full w-full object-cover"
          />
        </div>
      {/if}
      <div class="flex min-w-0 flex-col gap-10 md:p-5">
        <div class="flex flex-col gap-2.5">
          {#if current.name}
            <h2 class="text-green font-heading text-lg tracking-[1.5px] uppercase">
              {current.name}
            </h2>
          {/if}
          {#if current.role}
            <p class="text-background text-base leading-6">{current.role}</p>
          {/if}
          {#if current.email}
            <a
              href="mailto:{current.email}"
              class="text-green font-button inline-flex w-fit items-center gap-2.5 text-[10px] tracking-[1px] uppercase hover:opacity-70"
            >
              {current.email}
              <img
                src="/icons/arrow-right.svg"
                alt=""
                aria-hidden="true"
                class="h-3.5 w-2.5 -rotate-90"
              />
            </a>
          {/if}
        </div>
        <div class="richtext-block text-background text-base leading-6">
          <RichTextBody field={current.bio} />
        </div>
      </div>
    </div>
  </Modal>
{/if}

<style>
  /* The display heading carries the page's largest type, with `highlight`
     picking out the closing phrase — the same idiom as LeadText statement and
     CtaBanner onCream. #527e01 is 4.47:1 on cream: safe here ONLY because the
     clamp floor is 2rem (32px), which is WCAG large. */
  .person-heading :global(h2) {
    font-size: clamp(2rem, 4.17vw, 3.75rem);
    line-height: inherit;
    letter-spacing: 0;
    font-weight: 300;
  }

  .person-heading :global(.highlight) {
    color: var(--color-green-mid);
  }
</style>
