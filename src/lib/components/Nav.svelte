<script lang="ts">
  import type { NavItem } from "$lib/site-config";
  import type { NavTone } from "$lib/nav-tone";
  import {
    DEFAULT_LANG,
    LANGS,
    LOCALES,
    localizePath,
    type Lang,
    type SwitchTarget,
  } from "$lib/locale";
  import NavMenu from "./NavMenu.svelte";

  interface NavLink {
    text: string;
    href: string;
  }

  interface Props {
    /** Optional per-route override of the `$lib/site-config.json` nav (no
     * route on this site supplies one). When non-empty they take precedence
     * over `items`. */
    navLinks?: NavLink[];
    /** Nav entries from site-config. An entry with an empty href renders as
     * plain text, not a dead link (see "Who we are" there, which waits on its
     * Prismic page); an entry with `children` lists them beneath it. Omit for
     * a lockup-only bar. */
    items?: NavItem[];
    /** Colouring for the ground the page's first slice paints under the bar —
     * see `$lib/nav-tone`. Ignored once the bar has scrolled onto its own
     * cream ground. */
    tone?: NavTone;
    /** The current route. A change closes the menu and re-measures the
     * ground. Passed in rather than read from $app/state so the component
     * stays a plain unit under test. */
    pathname?: string;
    /** The page's locale: names the active side of the language toggle and
     * localizes the lockup's home link. */
    lang?: Lang;
    /** The other locale's version of this page (see `switchTarget` in
     * $lib/locale). Omit when there is none — that side of the toggle then
     * renders inert, because a link to a page that does not exist fails the
     * prerender. */
    switchTo?: SwitchTarget;
  }

  let {
    navLinks = [],
    items = [],
    tone = "default",
    pathname = "/",
    lang = DEFAULT_LANG,
    switchTo,
  }: Props = $props();

  const entries = $derived<NavItem[]>(
    navLinks.length > 0 ? navLinks.map((l) => ({ label: l.text, href: l.href })) : items,
  );

  let isMenuOpen = $state(false);
  let triggerEl = $state<HTMLButtonElement>();
  let scrolled = $state(false);

  // The comp's bar is 70px tall (Figma 5314:2013).
  const NAV_HEIGHT = 70;

  // Transparent over the page's first slice (whose ground `tone` was chosen
  // for), and the cream bar with the default lockup from the moment that
  // slice's bottom edge passes under it. Measured from the DOM, not a fixed
  // scroll offset: the first slice's height varies — HeartHero is a 260vh
  // scroll runway, PageMasthead is about 650px — and the swap must not happen
  // while the masthead is still on screen.
  function measure() {
    const first = document.getElementById("main-content")?.firstElementChild;
    scrolled = first
      ? first.getBoundingClientRect().bottom <= NAV_HEIGHT
      : window.scrollY > NAV_HEIGHT;
  }

  $effect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  });

  // A route change closes the menu and re-measures against the new page once
  // it has rendered — next frame, because the new slices are not laid out yet
  // when the pathname prop changes.
  $effect(() => {
    void pathname;
    isMenuOpen = false;
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  });

  const effectiveTone = $derived<NavTone>(scrolled ? "default" : tone);

  // The three navbar variants' lockups (Figma 5314:2013 / 5314:1743 /
  // 5314:1744): the shipped lockup SVG carrying each variant's fills, not a
  // redraw. See static/.
  const LOCKUP: Record<NavTone, string> = {
    default: "/logo-lockup.svg",
    onDark: "/logo-lockup-on-dark.svg",
    onGreen: "/logo-lockup-cream.svg",
  };

  // Hamburger colour per tone. `onGreen` is the one departure from the comp:
  // navbar-white draws a cream hamburger on the green hero, and cream on
  // #9cbf5b is 1.93:1. A logo is exempt from contrast rules; a control is not
  // (WCAG 1.4.11 asks 3:1). #263b02 is the design's own dark-on-green pairing
  // at 5.86:1 — the same couple every button in the cream sections uses.
  const ICON: Record<NavTone, string> = {
    default: "text-primary",
    onDark: "text-background",
    onGreen: "text-green-btn",
  };

  // The language toggle — the one deliberate addition to the comp's bar. A
  // pill in the donate button's clothes, as a switch: the active locale
  // wears the button couple, the other side is a plain label in the tone's
  // control colour. On the green hero the couple flips to dark-on-green,
  // because green on green is no switch at all (both pairings 5.86:1).
  const TOGGLE: Record<NavTone, { track: string; active: string }> = {
    default: { track: "border-primary text-primary", active: "bg-green text-green-btn" },
    onDark: { track: "border-background text-background", active: "bg-green text-green-btn" },
    onGreen: { track: "border-green-btn text-green-btn", active: "bg-green-btn text-green" },
  };
  const SEGMENT =
    "font-button inline-flex h-6 min-w-9 items-center justify-center rounded-full px-2 pb-[1px] text-[10px] tracking-[1.5px] uppercase";
</script>

<!-- Figma 5314:2013 (navbar-default), 5314:1743 (navbar) and 5314:1744
     (navbar-white): one bar, three colourings. The lockup sits at 30px and the
     row aligns with the page's 1440px / 80px grid (px-6 below md, as the
     footer and mastheads do). -->
<nav
  data-tone={effectiveTone}
  data-scrolled={scrolled}
  class="fixed top-0 left-0 z-50 w-full motion-safe:transition-colors motion-safe:duration-300 {scrolled
    ? 'bg-background/95 backdrop-blur-sm'
    : 'bg-transparent'}"
>
  <div
    class="mx-auto flex h-[70px] w-full max-w-[1440px] items-center justify-between px-6 md:px-20"
  >
    <a href={localizePath("/", lang)} class="flex items-center">
      <img
        src={LOCKUP[effectiveTone]}
        alt="Vida Legacy Foundation home"
        width="242"
        height="38"
        class="h-[30px] w-auto"
      />
    </a>

    <div class="flex items-center gap-4">
      <!-- The EN | ES toggle. The current locale is marked, not linked; the
           other is a link only when its page exists (a dead switch would send
           the prerender crawler into a 404), and otherwise an inert label so
           the visitor still sees which version they are on. The visible label
           is the short code; the link's accessible name is the language. -->
      <div
        role="group"
        aria-label="Language"
        class="flex h-[30px] items-center gap-[2px] rounded-full border p-[2px] {TOGGLE[
          effectiveTone
        ].track}"
      >
        {#each LANGS as code (code)}
          {#if code === lang}
            <span
              aria-current="true"
              lang={LOCALES[code].html}
              class="{SEGMENT} {TOGGLE[effectiveTone].active}"
            >
              {LOCALES[code].short}
            </span>
          {:else if switchTo?.lang === code}
            <!-- data-sveltekit-noscroll: the switch keeps the reader's place —
                 the same page, the other text — and the layout crossfades it
                 in place (see onNavigate there). -->
            <a
              href={switchTo.href}
              hreflang={switchTo.lang}
              lang={switchTo.lang}
              aria-label={switchTo.label}
              data-sveltekit-noscroll
              class="{SEGMENT} hover:opacity-70 {ICON[effectiveTone]}"
            >
              {switchTo.short}
            </a>
          {:else}
            <span aria-disabled="true" lang={LOCALES[code].html} class="{SEGMENT} opacity-50">
              {LOCALES[code].short}
            </span>
          {/if}
        {/each}
      </div>

      {#if entries.length > 0}
        <!-- A 44px hit target around the comp's 20x16 glyph (Figma 5314:1993);
             the negative margin keeps the glyph on the grid's right edge. -->
        <button
          bind:this={triggerEl}
          type="button"
          class="-mr-3 flex h-11 w-11 items-center justify-center {ICON[effectiveTone]}"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          onclick={() => (isMenuOpen = true)}
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor" aria-hidden="true">
            <path
              d="M1.90735e-06 0.75001V3.75001H20V0.75001H1.90735e-06ZM1.90735e-06 6.50001V9.50001H20V6.50001H1.90735e-06ZM1.90735e-06 12.25V15.25H20V12.25H1.90735e-06Z"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</nav>

{#if isMenuOpen}
  <NavMenu
    {entries}
    {lang}
    {switchTo}
    onClose={() => (isMenuOpen = false)}
    restoreFocus={() => triggerEl}
  />
{/if}
