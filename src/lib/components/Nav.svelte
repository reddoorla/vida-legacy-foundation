<script lang="ts">
  import { untrack } from "svelte";
  import type { NavItem } from "$lib/site-config";
  import type { NavTone } from "$lib/nav-tone";
  import { DEFAULT_LANG, localizePath, type Lang, type SwitchTarget } from "$lib/locale";
  import { ui } from "$lib/ui-copy";
  import NavMenu from "./NavMenu.svelte";
  import LangToggle from "./LangToggle.svelte";

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

  // The bar's own words (the lockup's alt, the menu button) in the page's
  // language — see $lib/ui-copy.
  const copy = $derived(ui(lang));

  // Only http(s) links open in a new tab; a route stays same-tab. The same
  // shape NavMenu and Footer use, so target/rel cannot drift between them.
  const isExternal = (href: string) => /^https?:\/\//i.test(href);
  const linkAttrs = (href: string) => ({
    href,
    target: isExternal(href) ? "_blank" : undefined,
    rel: isExternal(href) ? "noopener noreferrer" : undefined,
  });

  const entries = $derived<NavItem[]>(
    navLinks.length > 0 ? navLinks.map((l) => ({ label: l.text, href: l.href })) : items,
  );

  let isMenuOpen = $state(false);
  let triggerEl = $state<HTMLButtonElement>();
  let scrolled = $state(false);

  // The comp's bar is 70px tall (Figma 5314:2013).
  const NAV_HEIGHT = 70;

  // Below md the bar LEAVES once the first section is behind you: these pages
  // are short and few, and a fixed bar costs a tenth of a phone screen the
  // whole way down. It comes back on any upward scroll, at the top of the
  // page, and whenever something inside it takes focus (the CSS below) — so a
  // keyboard visitor is never left tabbing to an off-screen control.
  // `translate` (not `transform`) is the property Tailwind v4 animates for
  // -translate-y-full, and it is what the bar's transition names.
  const MOBILE_QUERY = "(max-width: 767px)";
  const SCROLL_EPSILON = 4;
  let hiddenBar = $state(false);
  // Seeded on mount from the real offset: a back-navigation restores the
  // scroll position, and against a 0 seed that reads as one huge downward
  // gesture, hiding the bar before the visitor has touched anything.
  let lastY = 0;

  // Transparent over the page's first slice (whose ground `tone` was chosen
  // for), and the cream bar with the default lockup from the moment that
  // slice's bottom edge passes under it. Measured from the DOM, not a fixed
  // scroll offset: the first slice's height varies — HeartHero is a 260vh
  // scroll runway, PageMasthead is about 650px — and the swap must not happen
  // while the masthead is still on screen.
  function measure() {
    const main = document.getElementById("main-content");
    const first = main?.firstElementChild;
    // A page that IS one section — /donate and /contact, whose single slice
    // runs the whole page — has no "first slice bottom" to pass under the
    // bar, so the DOM test never fired: the bar stayed transparent over the
    // copy for the whole page, and (below md) never went away either. Those
    // pages fall back to the scroll offset. A page with slices keeps the
    // measured test, which is what stops the swap firing mid-hero.
    const single = main ? main.children.length < 2 : true;
    // The edge the bar is waiting for is the one the visitor SEES the first
    // slice leave by — which is not the section's bottom when that section is
    // a runway. HeartHero is 260vh of scroll driving a stage pinned at the
    // top of the screen: its own bottom edge does not reach the bar until the
    // stage has been gone for a screen and a half, and all that time the bar
    // still wore the hero's cream lockup — over the cream headline of the
    // section after it, cream on cream. So a first slice taller than the
    // viewport is measured by where its stage releases (bottom, less one
    // screen); anything shorter keeps its own bottom edge, which is the same
    // number for it.
    const box = first?.getBoundingClientRect();
    const vh = window.innerHeight;
    const release = box ? (box.height > vh ? box.bottom - vh : box.bottom) : 0;
    scrolled = first && !single ? release <= NAV_HEIGHT : window.scrollY > NAV_HEIGHT;

    const y = window.scrollY;
    const narrow = window.matchMedia?.(MOBILE_QUERY).matches ?? false;
    if (!narrow || !scrolled) {
      hiddenBar = false;
    } else if (y > lastY + SCROLL_EPSILON) {
      hiddenBar = true;
    } else if (y < lastY - SCROLL_EPSILON) {
      hiddenBar = false;
    }
    if (Math.abs(y - lastY) > SCROLL_EPSILON) lastY = y;
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
    lastY = window.scrollY;
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
  // when the pathname prop changes. Except the language switch: that is the
  // same page in the other language, crossfaded in place, and a visitor who
  // pressed the toggle inside the menu keeps the menu — its entries simply
  // change language under them. A switch is a change to the path the toggle
  // was offering; `switchTo` is read untracked so only the path re-runs this.
  let seen = untrack(() => ({ pathname, switchHref: switchTo?.href }));
  $effect(() => {
    const isSwitch = pathname !== seen.pathname && pathname === seen.switchHref;
    seen = { pathname, switchHref: untrack(() => switchTo?.href) };
    if (!isSwitch) isMenuOpen = false;
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
  data-hidden={hiddenBar}
  class="fixed top-0 left-0 z-50 w-full focus-within:translate-y-0 motion-safe:transition-[background-color,translate] motion-safe:duration-300 {scrolled
    ? 'bg-background/95 backdrop-blur-sm'
    : 'bg-transparent'} {hiddenBar ? '-translate-y-full' : ''}"
>
  <div
    class="mx-auto flex h-[70px] w-full max-w-[1440px] items-center justify-between px-6 md:px-20"
  >
    <a href={localizePath("/", lang)} class="flex items-center">
      <img
        src={LOCKUP[effectiveTone]}
        alt={copy.homeLink}
        width="242"
        height="38"
        class="h-[30px] w-auto"
      />
    </a>

    <div class="flex items-center gap-4">
      <!-- The EN | ES toggle (LangToggle) — the same control the open menu
           carries. -->
      <LangToggle {lang} {switchTo} tone={effectiveTone} viewName="lang-pill-bar" />

      {#if entries.length > 0}
        <!-- A 44px hit target around the comp's 20x16 glyph (Figma 5314:1993);
             the negative margin keeps the glyph on the grid's right edge. -->
        <button
          bind:this={triggerEl}
          type="button"
          data-nav-toggle
          class="-mr-3 flex h-11 w-11 items-center justify-center {ICON[effectiveTone]}"
          aria-label={copy.openMenu}
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

  {#if entries.length > 0}
    <!-- Without scripts the hamburger is an inert control: it announces a
         menu and does nothing, because NavMenu is not in the DOM until it is
         clicked. So the entries are always rendered here and always hidden,
         and the <noscript> block below reveals them and hides the button that
         cannot work.

         The rule that reveals it is a <noscript><style> in app.html, not
         here: Svelte treats a <style> anywhere in a component as a style
         block and empties it out of the markup, and real elements inside a
         <noscript> would not survive hydration either — a browser running
         scripts parses that content as raw text. -->
    <ul
      class="nav-nojs mx-auto w-full max-w-[1440px] flex-wrap items-center justify-end gap-x-6 gap-y-2 px-6 pb-4 md:px-20"
    >
      {#each entries as entry, i (i)}
        {#if entry.href}
          <li>
            <a
              {...linkAttrs(entry.href)}
              class="font-button text-[10px] tracking-[1.5px] uppercase {ICON[effectiveTone]}"
            >
              {entry.label}
            </a>
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
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
