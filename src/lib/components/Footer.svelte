<script lang="ts">
  import BrandIcon from "./BrandIcon.svelte";
  import type {
    FooterSocial,
    FooterItem,
    FooterImage,
    FooterText,
    FooterColumn,
  } from "$lib/site-config";

  interface Props {
    /** Optional per-route override of the `$lib/site-config.json` footer (no
     * route in the bare template supplies this). When present they take
     * precedence over the site-config socials/text chrome. */
    columns?: FooterColumn[];
    /** Social links from the site config (empty → none rendered). */
    socials?: FooterSocial[];
    /** The copyright / rights line; falls back to a generic notice. */
    text?: string;
  }

  // Placeholder styling — restyle per project. `columns` (a per-route
  // override) wins when a route supplies it; otherwise the site-config
  // socials + rights line render (the fleet default chrome).
  let { columns, socials = [], text }: Props = $props();

  const isImage = (i: FooterItem): i is FooterImage => "image" in i;

  // Only http(s) links open in a new tab; tel:/mailto: stay same-tab.
  // Consistent shape — Svelte drops undefined attributes — so target/rel
  // can't drift between the text- and image-link branches.
  const isExternal = (href: string) => /^https?:\/\//i.test(href);
  const linkAttrs = (href: string) => ({
    href,
    target: isExternal(href) ? "_blank" : undefined,
    rel: isExternal(href) ? "noopener noreferrer" : undefined,
  });

  // Social network id (from site-config) → the BrandIcon glyph + an
  // accessible label. Networks BrandIcon can't draw are dropped rather than
  // rendered as an empty link.
  const NETWORK: Record<string, { platform: string; label: string }> = {
    facebook: { platform: "facebook", label: "Facebook" },
    twitter: { platform: "twitter", label: "Twitter" }, // BrandIcon aliases → X
    x: { platform: "x", label: "X" },
    instagram: { platform: "instagram", label: "Instagram" },
    linkedin: { platform: "linkedin", label: "LinkedIn" },
    "linkedin-company": { platform: "linkedin", label: "LinkedIn" },
    pinterest: { platform: "pinterest", label: "Pinterest" },
    youtube: { platform: "youtube", label: "YouTube" },
    reddit: { platform: "reddit", label: "Reddit" },
  };

  // Typographic role → classes. Colour only; every value is measured against
  // the cream ground in app.css. `fine` uses --color-green-mid-aa, NOT the
  // design's #527e01, which is 4.47:1 and fails AA at this size.
  const TONE: Record<string, string> = {
    detail: "text-primary font-heading text-xs tracking-[1.5px] uppercase",
    fine: "text-green-mid-aa font-button text-[10px] leading-[1.5] tracking-[1px] uppercase",
  };
  const toneClass = (item: FooterText) =>
    (item.tone && TONE[item.tone]) ?? "text-dark font-heading text-xs tracking-[1.5px] uppercase";

  // Rows sit 30px apart, except a `tight` row which hugs the one above at 15px
  // so a label and its detail lines read as one group. The first row in a
  // column never takes a top margin.
  const rowClass = (item: FooterItem, i: number) =>
    i === 0 ? "" : !isImage(item) && item.tight ? "mt-[15px]" : "mt-[30px]";

  const known = $derived(
    socials
      // `Object.hasOwn` guard: a network literally named "toString" or
      // "constructor" would otherwise resolve to an inherited Object.prototype
      // member (truthy) and slip past the filter, then crash on `.platform`.
      .map((s) => ({
        ...s,
        meta: Object.hasOwn(NETWORK, s.network) ? NETWORK[s.network] : undefined,
      }))
      .filter((s): s is typeof s & { meta: { platform: string; label: string } } => !!s.meta),
  );
</script>

{#snippet logo(img: FooterImage["image"])}
  <img
    src={img.url}
    alt={img.alt ?? ""}
    style={img.maxWidth ? `max-width:${img.maxWidth}` : undefined}
  />
{/snippet}

<!-- The ground is the page ground (--color-background), so the footer continues
     whatever panel sits above it rather than restarting on its own colour. The
     columns branch pays its own padding; the placeholder branch keeps the
     template's. -->
<footer class="bg-background mt-auto w-full {columns?.length ? '' : 'px-8 py-12'}">
  {#if columns?.length}
    <!-- Figma 5249:1320. The last tenant of the cream closing panel that
         CtaBanner onCream rounds off, so the ground continues rather than
         restarting. Its pt-10 is the second half of the comp's 80px gap to
         the testimonial row above. The first column stretches so its logo and
         copyright sit at opposite ends, as in the comp. -->
    <div
      class="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 pt-10 pb-15 md:flex-row md:gap-5 md:px-20"
    >
      {#each columns as col, colIndex (colIndex)}
        <div
          class="flex flex-col md:w-[304px] md:shrink-0 {colIndex === 0
            ? 'gap-10 md:justify-between md:gap-0 md:self-stretch'
            : ''}"
        >
          {#each col.items as item, itemIndex (itemIndex)}
            {#if isImage(item)}
              <div class={rowClass(item, itemIndex)}>
                {#if item.href}
                  <a {...linkAttrs(item.href)} class="inline-block">{@render logo(item.image)}</a>
                {:else}
                  {@render logo(item.image)}
                {/if}
              </div>
            {:else if item.href}
              <a
                {...linkAttrs(item.href)}
                class="{toneClass(item)} {rowClass(item, itemIndex)} w-fit hover:opacity-70"
              >
                {item.text}
              </a>
            {:else}
              <p class="{toneClass(item)} {rowClass(item, itemIndex)}">{item.text}</p>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
      {#if known.length > 0}
        <ul class="flex items-center gap-4">
          <!-- Keyed by index: a network can repeat across footer blocks, and a
               duplicate key throws each_key_duplicate at hydration. -->
          {#each known as social, i (i)}
            <li>
              {#if social.href}
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.meta.label}
                  class="inline-flex min-h-11 min-w-11 items-center justify-center hover:opacity-70"
                >
                  <BrandIcon platform={social.meta.platform} class="h-5 w-5" />
                </a>
              {:else}
                <!-- No recovered url — render the glyph, but not as a dead link. -->
                <span
                  class="inline-flex min-h-11 min-w-11 items-center justify-center"
                  aria-label={social.meta.label}
                  role="img"
                >
                  <BrandIcon platform={social.meta.platform} class="h-5 w-5" />
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      <p class="text-sm text-secondary">
        {text ?? `© ${new Date().getFullYear()} Company Name`}
      </p>
    </div>
  {/if}
</footer>
