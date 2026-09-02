<script lang="ts">
  import { trapFocus } from "$lib/actions/trapFocus";
  import { fade } from "$lib/transitions";
  import type { NavItem } from "$lib/site-config";
  import type { SwitchTarget } from "$lib/locale";

  interface Props {
    entries: NavItem[];
    onClose: () => void;
    /** Where focus returns on close — Nav hands over its trigger. */
    restoreFocus?: () => HTMLElement | null | undefined;
    /** In-flow rendering for the a11y fixtures page: absolute inside a
     * relative container instead of fixed over the viewport, and no focus
     * trap — trapping focus in a page section would itself be a keyboard
     * trap. */
    inline?: boolean;
    /** The other locale's version of this page; rendered under the entries
     * when present (see Nav). */
    switchTo?: SwitchTarget;
  }

  let { entries, onClose, restoreFocus, inline = false, switchTo }: Props = $props();

  // Only http(s) links open in a new tab; a route stays same-tab. The same
  // shape as Footer's, so target/rel cannot drift between the two.
  const isExternal = (href: string) => /^https?:\/\//i.test(href);
  const linkAttrs = (href: string) => ({
    href,
    target: isExternal(href) ? "_blank" : undefined,
    rel: isExternal(href) ? "noopener noreferrer" : undefined,
  });
</script>

<!-- Figma 5314:1679 — the open menu. The viewport goes to the textured dark
     green (#172303 under the hero's grain at 20% plus-lighter), the lockup row
     stays where the bar had it, and the entries stack at the left in the
     display size: 60px Pragmatica Extended, 1.35 line height, 40px apart.
     An entry's arrow (Figma 5314:1719) appears only on hover/focus, when the
     label goes green. Measured on #172303: cream label 15.18:1, green label
     7.84:1 — both well past AA at this size. -->
<div
  role="dialog"
  aria-modal={inline ? undefined : "true"}
  aria-label="Menu"
  class="{inline
    ? 'absolute'
    : 'fixed'} bg-green-deep inset-0 isolate z-60 flex flex-col overflow-y-auto"
  transition:fade={{ duration: 200 }}
  use:trapFocus={{ enabled: !inline, onEscape: onClose, restoreFocus }}
>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-20 mix-blend-plus-lighter"
    style="background-image: url('/texture-grain.webp')"
  ></div>

  <div
    class="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-10 px-6 pt-5 pb-[100px] md:px-20"
  >
    <div class="flex h-[30px] items-center justify-between">
      <a href="/" onclick={onClose} class="flex items-center">
        <img
          src="/logo-lockup-on-dark.svg"
          alt="Vida Legacy Foundation home"
          width="242"
          height="38"
          class="h-[30px] w-auto"
        />
      </a>
      <!-- The comp's 20px close glyph (Figma 5314:1706) in a 44px target. -->
      <button
        type="button"
        class="text-green -mr-3 flex h-11 w-11 items-center justify-center"
        aria-label="Close menu"
        onclick={onClose}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            d="M17.7606 15.5001L12.1208 9.86028L17.7606 4.22048C18.0004 3.98064 18.0004 3.60016 17.7606 3.38064L16.0606 1.68064L10.0004 7.74004L3.92076 1.66044L2.22076 3.36044C1.98092 3.60028 1.98092 3.98076 2.22076 4.20028L7.86057 9.84008L2.24017 15.5003C2.00032 15.7401 2.00032 16.1206 2.24017 16.3401L3.94016 18.0401L10.0004 11.9799L16.08 18.0595L17.78 16.3595C18.0003 16.1205 18.0004 15.7399 17.7606 15.5001Z"
          />
        </svg>
      </button>
    </div>

    <!-- Keyed by index: labels and hrefs are not unique (two empty hrefs would
         collide and throw each_key_duplicate at hydration). -->
    <ul class="flex flex-1 flex-col items-start justify-center gap-10">
      {#each entries as entry, i (i)}
        <li class="flex flex-col items-start gap-4">
          {#if entry.href}
            <a {...linkAttrs(entry.href)} onclick={onClose} class="group flex items-center gap-5">
              {@render label(entry.label, true)}
              <svg
                class="h-[33px] w-11 shrink-0 text-green opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity"
                viewBox="0 0 44 32.9408"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M24.0891 3.4431L34.6599 14.0116L6.12462e-07 14.0116L8.27426e-07 18.9294L34.6599 18.9294L24.0891 29.4978L27.532 32.9408L44 16.4704L27.532 1.14131e-06L24.0891 3.4431Z"
                />
              </svg>
            </a>
          {:else}
            {@render label(entry.label, false)}
          {/if}

          {#if entry.children && entry.children.length > 0}
            <ul class="flex flex-col gap-3">
              {#each entry.children as child, ci (ci)}
                <li>
                  {#if child.href}
                    <a
                      {...linkAttrs(child.href)}
                      onclick={onClose}
                      class="text-background font-heading text-2xl hover:text-green focus-visible:text-green"
                    >
                      {child.label}
                    </a>
                  {:else}
                    <span class="text-background font-heading text-2xl">{child.label}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
    </ul>

    {#if switchTo}
      <a
        href={switchTo.href}
        hreflang={switchTo.lang}
        lang={switchTo.lang}
        onclick={onClose}
        class="text-background font-heading w-fit text-2xl hover:text-green focus-visible:text-green"
      >
        {switchTo.label}
      </a>
    {/if}
  </div>
</div>

{#snippet label(text: string, interactive: boolean)}
  <span
    class="menu-label text-background font-heading font-light leading-[1.35] {interactive
      ? 'group-hover:text-green group-focus-visible:text-green motion-safe:transition-colors'
      : ''}"
  >
    {text}
  </span>
{/snippet}

<style>
  /* 60px at the comp's 1440 (4.17vw), floored for phones. */
  .menu-label {
    font-size: clamp(2rem, 4.17vw, 3.75rem);
  }
</style>
