<script lang="ts">
  import type { NavTone } from "$lib/nav-tone";
  import { DEFAULT_LANG, LANGS, LOCALES, type Lang, type SwitchTarget } from "$lib/locale";
  import { ui } from "$lib/ui-copy";

  interface Props {
    /** The page's locale — the marked side. */
    lang?: Lang;
    /** The other locale's version of this page (see `switchTarget` in
     * $lib/locale). Omit when there is none — the toggle then renders inert,
     * because a link to a page that does not exist fails the prerender. */
    switchTo?: SwitchTarget;
    /** The ground it sits on: the bar's tone, or `onDark` inside the menu. */
    tone?: NavTone;
    class?: string;
    /**
     * A `view-transition-name` for the marked pill, so the browser morphs it
     * from one side of the track to the other during the language switch's
     * view transition (started in +layout.svelte, timed in app.css) instead
     * of the pill jumping. It MUST be unique among the toggles rendered at
     * the same moment — a duplicate name aborts the whole transition — so the
     * bar and the open menu pass different ones. Omit it and the pill swaps.
     */
    viewName?: string;
  }

  let {
    lang = DEFAULT_LANG,
    switchTo,
    tone = "default",
    class: passedClasses = "",
    viewName,
  }: Props = $props();

  // The EN | ES toggle — the one deliberate addition to the comp's bar, and
  // the same control inside the open menu. A pill in the donate button's
  // clothes, as a switch: the active locale wears the button couple, the
  // other side is a plain label in the ground's control colour. On the green
  // hero the couple flips to dark-on-green, because green on green is no
  // switch at all (both pairings 5.86:1). The label colour is the hamburger's
  // on the same ground.
  const TOGGLE: Record<NavTone, { track: string; active: string; label: string }> = {
    default: {
      track: "border-primary text-primary",
      active: "bg-green text-green-btn",
      label: "text-primary",
    },
    onDark: {
      track: "border-background text-background",
      active: "bg-green text-green-btn",
      label: "text-background",
    },
    onGreen: {
      track: "border-green-btn text-green-btn",
      active: "bg-green-btn text-green",
      label: "text-green-btn",
    },
  };
  const SEGMENT =
    "font-button inline-flex h-6 min-w-9 items-center justify-center rounded-full px-2 pb-[1px] text-[10px] tracking-[1.5px] uppercase";
  const TRACK = "flex h-[30px] w-fit items-center gap-[2px] rounded-full border p-[2px]";
</script>

<!-- The whole control is the switch: with a target it IS the link, so a press
     anywhere on the pill — the marked side included — goes to the other
     language. (Only the inactive half used to be clickable.) The current
     locale is still marked with aria-current, and the link is named by the
     language it leads to rather than by the "EN"/"ES" inside it.

     Without a target — a page whose translation is not published, the dev
     pages — nothing is a link, because a dead switch would send the prerender
     crawler into a 404; the inert track still shows which version you are on.

     data-sveltekit-noscroll: the switch keeps the reader's place — the same
     page, the other text — and the layout crossfades it (see onNavigate). -->
{#snippet segments()}
  {#each LANGS as code (code)}
    {#if code === lang}
      <span
        aria-current="true"
        lang={LOCALES[code].html}
        class="{SEGMENT} {TOGGLE[tone].active}"
        style={viewName ? `view-transition-name: ${viewName}` : undefined}
      >
        {LOCALES[code].short}
      </span>
    {:else}
      <span
        lang={LOCALES[code].html}
        aria-disabled={switchTo ? undefined : "true"}
        class="{SEGMENT} {switchTo ? TOGGLE[tone].label : 'opacity-50'}"
      >
        {LOCALES[code].short}
      </span>
    {/if}
  {/each}
{/snippet}

<div role="group" aria-label={ui(lang).language} class="w-fit {passedClasses}">
  {#if switchTo}
    <a
      href={switchTo.href}
      hreflang={switchTo.lang}
      lang={switchTo.lang}
      aria-label={switchTo.label}
      data-sveltekit-noscroll
      class="{TRACK} {TOGGLE[tone].track} hover:opacity-80 motion-safe:transition-opacity"
    >
      {@render segments()}
    </a>
  {:else}
    <div class="{TRACK} {TOGGLE[tone].track}">
      {@render segments()}
    </div>
  {/if}
</div>
