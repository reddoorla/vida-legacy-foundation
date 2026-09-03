<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { isFilled, type Content } from "@prismicio/client";

  let { slice }: { slice: Content.PersonGridSlice } = $props();

  let hasHeading = $derived(isFilled.richText(slice.primary.heading));
  let people = $derived((slice.items ?? []).filter((p) => p.name || isFilled.image(p.headshot)));

  // The comp draws its two groups differently, and `style` picks which:
  //   leadership  cards on the page cream — headshot over a textured dark
  //               green box, name in brand green, the "+" that opens the bio
  //   board       the band on the lighter cream (#fffbf4), cards on the page
  //               cream with the grain, name in the dark green, no "+"
  // A document authored before the field reads as leadership.
  let board = $derived(slice.primary.style === "board");

  // Heading levels shift with the content, because this slice appears twice on
  // the Who We Are page and only the FIRST carries the display heading. Fixing
  // the label at h3 would leave the second group starting at h3 under the page
  // h1 — a skipped level, which axe flags as heading-order.
  let labelTag = $derived(hasHeading ? "h3" : "h2");
  let nameTag = $derived(hasHeading ? "h4" : "h3");

  // A leadership card opens its bio on click — the comp's "+" is on every
  // card, and a bio not yet written shows the name, role and address alone.
  // A board card has no "+" in the comp, so it opens only when a bio exists.
  type Person = Content.PersonGridSliceDefaultItem;
  const opens = (p: Person) => !board || isFilled.richText(p.bio);

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
  slice twice, which is why the display heading is optional and the card
  style is a field.

  Geometry, cap-to-baseline: the display heading at x=407.5, 100 above the
  row; the intro column 297.5 wide with 20 above and below; three cards of
  296 across the 952.5 column, 30 apart — sized as thirds so a classic
  scrollbar's 15px cannot push the third to a new row. A card is the square
  headshot over a 20px-padded block: name, 10, role, 10, address. The
  leadership band pays 60 above and below; the board band 80 above and 200
  below (the closing panel slides over it — see the slide-over note in
  app.css), with its cards centred in the row.

  Card grounds are the comp's fills: #172303 under the site's grain at 20%
  plus-lighter for leadership (the same treatment as IconColumns' card), the
  page cream under the grain at 25% difference for board.

  Contrast, measured:
    on #172303   #9cbf5b names and address 7.84:1, #fdf5e8 roles 15.18:1
    on #fdf5e8   #263b02 names 11.35:1; roles and the board intro take the
                 -aa green #507b01 at 4.65:1, not the comp's #527e01 (4.47,
                 which misses AA at body size — see app.css)

  The "+" is a real <button> — the whole headshot is the target — so the bio
  is reachable by keyboard and announced. It is the comp's 25px badge at the
  headshot's corner at half opacity, growing to 30 on hover.
-->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass={board ? "bg-cream" : "bg-background"}
  contentClass={board
    ? "max-w-[1440px] px-6 pt-16 pb-24 md:px-20 md:pt-20 md:pb-50"
    : "max-w-[1440px] px-6 py-10 md:px-20 md:py-15"}
>
  {#if hasHeading}
    <div class="person-heading t-display text-green-btn mb-16 md:mb-25 md:ml-auto md:w-[74.4%]">
      <RichTextBody field={slice.primary.heading} />
    </div>
  {/if}

  <div class="flex flex-col gap-[30px] md:flex-row md:items-start">
    <div
      class="flex flex-col gap-5 md:w-[23.24%] md:shrink-0 md:py-5 {board
        ? 'text-green-mid-aa'
        : 'text-green-btn'}"
    >
      {#if slice.primary.label}
        <svelte:element this={labelTag} class="t-label-lg">
          {slice.primary.label}
        </svelte:element>
      {/if}
      {#if isFilled.richText(slice.primary.intro)}
        <div class="richtext-block t-body">
          <RichTextBody field={slice.primary.intro} />
        </div>
      {/if}
    </div>

    {#if people.length}
      <ul class="flex min-w-0 flex-1 flex-wrap gap-[30px] {board ? 'md:items-center' : ''}">
        {#each people as person, i (i)}
          <li
            class="relative flex w-full flex-col overflow-hidden rounded-[20px] sm:w-[calc((100%-30px)/2)] md:w-[calc((100%-60px)/3)] {board
              ? 'bg-background'
              : 'bg-green-deep'}"
          >
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-cover bg-center {board
                ? 'opacity-25 mix-blend-difference'
                : 'opacity-20 mix-blend-plus-lighter'}"
              style="background-image: url('/texture-grain.webp')"
            ></div>

            {#if opens(person)}
              <button
                type="button"
                onclick={() => (openIndex = i)}
                class="group relative block aspect-square w-full cursor-pointer overflow-hidden"
              >
                {#if isFilled.image(person.headshot)}
                  <HeroBackgroundImage
                    image={person.headshot}
                    preload={false}
                    class="h-full w-full object-cover"
                  />
                {/if}
                <img
                  src="/icons/plus-circle.svg"
                  alt=""
                  aria-hidden="true"
                  class="absolute right-0 bottom-0 h-[25px] w-[25px] opacity-50 motion-safe:transition-[width,height] group-hover:h-[30px] group-hover:w-[30px] group-focus-visible:h-[30px] group-focus-visible:w-[30px]"
                />
                <span class="sr-only">Read the bio for {person.name || "this person"}</span>
              </button>
            {:else}
              <div class="relative aspect-square w-full overflow-hidden">
                {#if isFilled.image(person.headshot)}
                  <HeroBackgroundImage
                    image={person.headshot}
                    preload={false}
                    class="h-full w-full object-cover"
                  />
                {/if}
              </div>
            {/if}

            <div class="relative flex flex-col gap-2.5 p-5">
              {#if person.name}
                <svelte:element
                  this={nameTag}
                  class="t-label-lg {board ? 'text-green-btn' : 'text-green'}"
                >
                  {person.name}
                </svelte:element>
              {/if}
              {#if person.role}
                <p class="t-body {board ? 'text-green-mid-aa' : 'text-background'}">
                  {person.role}
                </p>
              {/if}
              {#if person.email}
                <!-- The CMS stores the bare address; the component makes the
                     mailto:, so a typo cannot produce a broken scheme. -->
                <a
                  href="mailto:{person.email}"
                  class="font-button inline-flex w-fit items-center gap-2.5 text-[10px] tracking-[1px] uppercase hover:opacity-70 {board
                    ? 'text-green-mid-aa'
                    : 'text-green'}"
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
  <!-- Figma 5312:1439, the bio pop-up: 1200 wide, 30 of padding, the
       headshot at 296 beside a 20px-padded column — name, role and address
       10 apart, the bio 40 below. Same ground as a leadership card. -->
  <!-- The ground and corner are `!`: Modal's own sheet sets bg-white and
       rounded-lg on the same element, and whichever utility the build emits
       last wins — the contact modal needs the same override. -->
  <Modal
    {open}
    onclose={close}
    dialogClass="max-w-[1200px]"
    class="bg-green-deep! relative overflow-hidden rounded-[20px]! shadow-none!"
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
            <h2 class="t-label-lg text-green">
              {current.name}
            </h2>
          {/if}
          {#if current.role}
            <p class="t-body text-background">{current.role}</p>
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
        {#if isFilled.richText(current.bio)}
          <div class="richtext-block t-body text-background">
            <RichTextBody field={current.bio} />
          </div>
        {/if}
      </div>
    </div>
  </Modal>
{/if}

<style>
  /* The display heading carries the page's largest type, with `highlight`
     picking out the closing phrase — the same idiom as LeadText statement and
     CtaBanner onCream. #527e01 is 4.47:1 on cream: safe here ONLY because the
     clamp floor is 2rem (32px), which is WCAG large. */
  .person-heading :global(.highlight) {
    color: var(--color-green-mid);
  }
</style>
