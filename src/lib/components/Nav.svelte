<script lang="ts">
  import type { NavItem } from "$lib/site-config";
  import type { NavTone } from "$lib/nav-tone";
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
  }

  let { navLinks = [], items = [], tone = "default", pathname = "/" }: Props = $props();

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
    <a href="/" class="flex items-center">
      <img
        src={LOCKUP[effectiveTone]}
        alt="Vida Legacy Foundation home"
        width="242"
        height="38"
        class="h-[30px] w-auto"
      />
    </a>

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
</nav>

{#if isMenuOpen}
  <NavMenu {entries} onClose={() => (isMenuOpen = false)} restoreFocus={() => triggerEl} />
{/if}
