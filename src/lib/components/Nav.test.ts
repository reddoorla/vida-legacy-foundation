import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, within } from "@testing-library/svelte";
import Nav from "./Nav.svelte";
import {
  colourOf,
  computed,
  contrast,
  groundOf,
  svgMainFill,
  textColour,
} from "../../test/theme-contrast";

// jsdom has no WAAPI (Element.animate), so we report reduced motion: the
// $lib/transitions wrappers then collapse durations to 0 and Svelte skips the
// animation machinery entirely. This is the same path real reduced-motion
// users hit in production.
function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

// jsdom performs no layout — treat connected elements as visible so
// trapFocus's getClientRects() filter keeps them.
beforeEach(() => {
  mockMatchMedia(true);
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return (this.isConnected ? [{}] : []) as unknown as DOMRectList;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const frame = () => new Promise((r) => requestAnimationFrame(r));

// The real site-config shape: one entry still waiting on its Prismic page
// (empty href), one external, one route. Hash/route hrefs keep jsdom from
// attempting (unimplemented) page navigation.
const items = [
  { label: "Who We Are", href: "" },
  { label: "Donate", href: "https://donate.example/form" },
  { label: "Contact Us", href: "/contact" },
];

// Flat `navLinks` — a per-route override of the site-config nav.
const navLinks = [
  { text: "Services", href: "#services" },
  { text: "About", href: "#about" },
];

/** A stand-in for the layout's <main>: Nav measures its first child to decide
 *  when the bar has scrolled onto its own ground. */
function mountMain(bottom: () => number, height = 0) {
  // Only one at a time: Nav reads getElementById("main-content"), so a
  // left-over from an earlier test in the same file would be the one it
  // measures.
  document.getElementById("main-content")?.remove();
  const main = document.createElement("main");
  main.id = "main-content";
  const first = document.createElement("section");
  // Two sections, as a real slice zone has: Nav only measures the first
  // slice's bottom edge when there IS more than one, because a page that is
  // a single section (/donate, /contact) has no first slice to pass under
  // the bar and falls back to the scroll offset instead.
  main.append(first, document.createElement("section"));
  document.body.appendChild(main);
  vi.spyOn(first, "getBoundingClientRect").mockImplementation(
    () => ({ bottom: bottom(), height }) as DOMRect,
  );
  return main;
}

/**
 * Everything that must be visible on the bar, measured from the compiled
 * stylesheet against `under`, the ground beneath the bar. Controls hold WCAG
 * 1.4.11's 3:1, the toggle's 10px labels 1.4.3's 4.5:1. The lockup is a
 * logotype, which 1.4.3 exempts, and the comp itself draws it cream on the
 * green hero at 1.94:1, so there it only has to stand off its ground (1.5:1);
 * on every other ground it holds 3:1 like a control, because it is the home
 * link's only content. The active locale must differ from the ground it sits
 * on, or nothing shows which language is on.
 */
function barProblems(nav: HTMLElement, under: string): string[] {
  const out: string[] = [];
  const at = (el: Element) => groundOf(el, { within: nav, under });
  const need = (what: string, ratio: number, min: number) => {
    if (ratio < min) out.push(`${what}: ${ratio.toFixed(2)}:1, needs ${min}`);
  };
  const ground = at(nav);
  const logo = nav.querySelector("a > img")!;
  need(
    `lockup ${logo.getAttribute("src")}`,
    contrast(svgMainFill(logo.getAttribute("src")!), ground),
    nav.dataset.tone === "onGreen" ? 1.5 : 3,
  );
  const button = nav.querySelector("[data-nav-toggle]");
  if (button) need("menu button", contrast(textColour(button), at(button)), 3);
  out.push(...toggleProblems(nav.querySelector('[role="group"]')!, at));
  return out;
}

function toggleProblems(group: Element, at: (el: Element) => ReturnType<typeof groundOf>) {
  const out: string[] = [];
  const need = (what: string, ratio: number, min: number) => {
    if (ratio < min) out.push(`${what}: ${ratio.toFixed(2)}:1, needs ${min}`);
  };
  const track = group.firstElementChild!;
  const ground = at(track);
  need("toggle outline", contrast(colourOf(track, "border-color")!, ground), 3);
  for (const seg of track.querySelectorAll("span")) {
    const name = `toggle "${seg.textContent?.trim()}"`;
    need(name, contrast(textColour(seg), at(seg)), 4.5);
    if (seg.hasAttribute("aria-current")) need(`${name} pill`, contrast(at(seg), ground), 1.5);
  }
  return out;
}

describe("Nav — the bar", () => {
  it("links the lockup home and renders no menu button without entries", () => {
    const { getByAltText, queryByLabelText } = render(Nav);
    const img = getByAltText("Vida Legacy Foundation home");
    expect(img.closest("a")?.getAttribute("href")).toBe("/");
    expect(queryByLabelText("Open menu")).toBeNull();
  });

  it("takes the page's tone over the first slice", () => {
    const { container, getByLabelText } = render(Nav, {
      items,
      tone: "onGreen",
    });
    const nav = container.querySelector("nav")!;
    expect(nav.dataset.tone).toBe("onGreen");
    expect(nav.dataset.scrolled).toBe("false");
    // The comp's cream hamburger on the green hero is 1.93:1. An icon is not
    // text, so axe's color-contrast never sees it: hold WCAG 1.4.11's 3:1 for
    // whatever colour the control wears against the hero's green ground.
    const icon = textColour(getByLabelText("Open menu"));
    expect(contrast(icon, "green")).toBeGreaterThanOrEqual(3);
  });

  // Each tone is chosen for the ground the page's first slice paints under the
  // still-transparent bar ($lib/nav-tone): HeartHero's green, PageMasthead's
  // deep green, the page cream everywhere else.
  const TONE_GROUND = { default: "background", onDark: "green-deep", onGreen: "green" } as const;
  const SWITCH = { lang: "es", href: "/es", label: "Español", short: "ES" } as const;

  for (const tone of ["default", "onDark", "onGreen"] as const) {
    for (const switchTo of [SWITCH, undefined]) {
      it(`keeps the lockup, the menu button and the toggle visible on the ${tone} ground${switchTo ? "" : " (no translation)"}`, () => {
        const { container } = render(Nav, { items, tone, switchTo });
        const nav = container.querySelector("nav")!;
        expect(nav.dataset.scrolled).toBe("false");
        expect(barProblems(nav, TONE_GROUND[tone])).toEqual([]);
      });
    }
  }

  it("takes the default tone once the first slice scrolls under it", async () => {
    let bottom = 800;
    mountMain(() => bottom);
    const { container } = render(Nav, { items, tone: "onGreen" });
    const nav = container.querySelector("nav")!;
    expect(nav.dataset.scrolled).toBe("false");

    // The hero is still on screen: a scroll does not flip the bar.
    bottom = 400;
    window.dispatchEvent(new Event("scroll"));
    await frame();
    expect(nav.dataset.scrolled).toBe("false");
    expect(nav.dataset.tone).toBe("onGreen");

    // Its bottom edge passes under the 70px bar.
    bottom = 40;
    window.dispatchEvent(new Event("scroll"));
    await frame();
    expect(nav.dataset.scrolled).toBe("true");
    expect(nav.dataset.tone).toBe("default");
    // Now the bar is over whatever scrolls beneath it, so it needs a ground of
    // its own: near-opaque, and everything on it visible against it even with
    // the darkest band on the site (night blue) showing through.
    expect(colourOf(nav, "background-color")?.a ?? 0).toBeGreaterThanOrEqual(0.9);
    expect(barProblems(nav, "dark")).toEqual([]);
  });

  it("marks the current locale on the toggle and links the other only when given a target", async () => {
    const { container, rerender, getByRole } = render(Nav, {
      items,
      tone: "onDark",
    });
    expect(container.querySelector("a[hreflang]")).toBeNull();
    // Without a target the other side is inert, but still shown: the visitor
    // can always see which version of the site they are on.
    const group = getByRole("group", { name: "Language" });
    expect(group.querySelector("[aria-current]")?.textContent?.trim()).toBe("EN");
    expect(group.querySelector("[aria-disabled]")?.textContent?.trim()).toBe("ES");

    await rerender({
      items,
      tone: "onDark",
      switchTo: { lang: "es", href: "/es/about", label: "Español", short: "ES" },
    });
    // Named by the "EN ES" it shows and described by where it goes, so the
    // accessible name never replaces the visible label (WCAG 2.5.3).
    const link = container.querySelector<HTMLAnchorElement>('[role="group"] a')!;
    expect(link.getAttribute("href")).toBe("/es/about");
    expect(link.getAttribute("hreflang")).toBe("es");
    expect(container.querySelector(`#${link.getAttribute("aria-describedby")}`)?.textContent).toBe(
      "Español",
    );
    // The link IS the track: press anywhere on the pill and you switch.
    expect(link.querySelectorAll("span")).toHaveLength(2);
    expect(link.querySelector("[aria-current]")?.textContent?.trim()).toBe("EN");
  });

  it("links the lockup to the locale's own home", () => {
    const { getByAltText } = render(Nav, { items, lang: "es" });
    expect(
      getByAltText("Inicio de Vida Legacy Foundation").closest("a")?.getAttribute("href"),
    ).toBe("/es");
  });

  it("marks ES as current on a Spanish page", () => {
    const { getByRole } = render(Nav, { items, lang: "es", tone: "onGreen" });
    const current = getByRole("group", { name: "Idioma" }).querySelector("[aria-current]");
    expect(current?.textContent?.trim()).toBe("ES");
    expect(current?.getAttribute("lang")).toBe("es");
  });

  it("exposes the menu state on the trigger", async () => {
    const { getByLabelText } = render(Nav, { items });
    const trigger = getByLabelText("Open menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("Nav — the menu", () => {
  it("opens as a modal dialog and moves focus to its first control", async () => {
    const { getByLabelText, getByRole } = render(Nav, { items });

    await fireEvent.click(getByLabelText("Open menu"));
    const dialog = getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    // DOM order is visual order: the lockup (a home link) leads the header
    // row, the close button follows it, then the entries.
    await frame();
    const first = dialog.querySelector("a, button")!;
    expect(first.getAttribute("href")).toBe("/");
    expect(document.activeElement).toBe(first);
  });

  it("lists the entries in order, from navLinks when a route supplies them", async () => {
    const { getByLabelText, getByRole } = render(Nav, { items, navLinks });
    await fireEvent.click(getByLabelText("Open menu"));
    const labels = Array.from(getByRole("dialog").querySelectorAll("li > a, li > span")).map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toEqual(["Services", "About"]);
  });

  it("renders an entry without an href as text, never as a dead link", async () => {
    const { getByLabelText, getByRole, getByText } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    const dialog = getByRole("dialog");
    expect(dialog.querySelector('a[href=""]')).toBeNull();
    expect(getByText("Who We Are").closest("a")).toBeNull();
  });

  it("opens external entries in a new tab and routes in the same one", async () => {
    // Scoped to the dialog: the bar also carries a hidden copy of the same
    // entries for a visitor without scripts.
    const { getByLabelText, getByRole } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    const menu = within(getByRole("dialog"));
    const donate = menu.getByText("Donate").closest("a")!;
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(donate.getAttribute("rel")).toBe("noopener noreferrer");
    const contact = menu.getByText("Contact Us").closest("a")!;
    expect(contact.getAttribute("href")).toBe("/contact");
    expect(contact.hasAttribute("target")).toBe(false);
  });

  it("wraps Tab from the last entry back to the first control", async () => {
    const { getByLabelText, getByRole } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    await frame();

    const dialog = getByRole("dialog");
    const links = Array.from(dialog.querySelectorAll("a"));
    const last = links[links.length - 1];
    last.focus();

    const e = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    last.dispatchEvent(e);

    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector("a, button"));
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { getByLabelText, getByRole, queryByRole } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    await frame();

    await fireEvent.keyDown(getByRole("dialog"), { key: "Escape" });
    expect(queryByRole("dialog")).toBeNull();

    // trapFocus restores focus one frame after the overlay unmounts.
    await frame();
    await frame();
    expect(document.activeElement).toBe(getByLabelText("Open menu"));
  });

  it("closes from its own close button", async () => {
    const { getByLabelText, queryByRole } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    await fireEvent.click(getByLabelText("Close menu"));
    expect(queryByRole("dialog")).toBeNull();
  });

  it("closes when an entry is activated", async () => {
    const { getByLabelText, getByRole, queryByRole } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    await frame();

    const link = Array.from(getByRole("dialog").querySelectorAll("a"))[0];
    await fireEvent.click(link);

    expect(queryByRole("dialog")).toBeNull();
  });

  it("closes when the route changes", async () => {
    const { getByLabelText, queryByRole, rerender } = render(Nav, { items, pathname: "/" });
    await fireEvent.click(getByLabelText("Open menu"));
    expect(queryByRole("dialog")).not.toBeNull();

    await rerender({ items, pathname: "/about" });
    expect(queryByRole("dialog")).toBeNull();
  });

  it("carries the same toggle in the menu, and pressing it keeps the menu", async () => {
    const { getByLabelText, getByRole, queryByRole } = render(Nav, {
      items,
      switchTo: { lang: "es", href: "/es", label: "Español", short: "ES" },
    });
    await fireEvent.click(getByLabelText("Open menu"));
    const dialog = getByRole("dialog");
    const group = dialog.querySelector('[role="group"][aria-label="Language"]')!;
    expect(group.querySelector("[aria-current]")?.textContent?.trim()).toBe("EN");
    const link = group.querySelector("a")!;
    expect(link.getAttribute("hreflang")).toBe("es");
    expect(link.getAttribute("href")).toBe("/es");
    // Legible on the menu's own ground, whatever colour that is.
    expect(toggleProblems(group, (el) => groundOf(el))).toEqual([]);
    await fireEvent.click(link);
    expect(queryByRole("dialog")).not.toBeNull();
  });

  it("keeps the menu open across a language switch, and closes it on any other route", async () => {
    const { getByLabelText, queryByRole, rerender } = render(Nav, {
      items,
      pathname: "/about",
      lang: "en",
      switchTo: { lang: "es", href: "/es/about", label: "Español", short: "ES" },
    });
    await fireEvent.click(getByLabelText("Open menu"));
    expect(queryByRole("dialog")).not.toBeNull();
    // The switch lands: the same page, the other locale.
    await rerender({
      items,
      pathname: "/es/about",
      lang: "es",
      switchTo: { lang: "en", href: "/about", label: "English", short: "EN" },
    });
    expect(queryByRole("dialog")).not.toBeNull();
    // A different page closes it.
    await rerender({ items, pathname: "/es", lang: "es" });
    expect(queryByRole("dialog")).toBeNull();
  });

  it("lists an entry's children beneath it", async () => {
    const { getByLabelText, getByRole } = render(Nav, {
      items: [
        {
          label: "Programs",
          href: "",
          children: [
            { label: "Grants", href: "#grants" },
            { label: "Education", href: "#education" },
          ],
        },
      ],
    });
    await fireEvent.click(getByLabelText("Open menu"));
    const nested = getByRole("dialog").querySelectorAll("li ul a");
    expect(Array.from(nested).map((a) => a.textContent?.trim())).toEqual(["Grants", "Education"]);
  });
});

describe("Nav on a phone", () => {
  // jsdom's matchMedia always answers false; stub it so the component sees a
  // narrow viewport, and drive scrollY by hand.
  function narrowViewport(narrow: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: narrow && query === "(width < 768px)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  async function scrollTo(y: number) {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    await frame();
  }

  afterEach(() => {
    // @ts-expect-error — restore jsdom's own implementation for other suites.
    delete window.matchMedia;
  });

  it("leaves on the way down once the first section is past, and returns on the way up", async () => {
    narrowViewport(true);
    // The first section still covers the bar, then scrolls behind it.
    let bottom = 500;
    mountMain(() => bottom);
    const { container } = render(Nav, { items });
    const nav = container.querySelector("nav")!;

    await scrollTo(200);
    expect(nav.dataset.hidden).toBe("false");

    bottom = -10;
    await scrollTo(400);
    expect(nav.dataset.hidden).toBe("true");
    // Hidden means moved UP, out of the viewport, not over the content.
    expect(computed(nav, "--tw-translate-y")).toMatch(/^-/);

    // Scrolling up brings it back.
    await scrollTo(300);
    expect(nav.dataset.hidden).toBe("false");
    expect(computed(nav, "--tw-translate-y")).toBeUndefined();

    // And it can never be caught off-screen by the keyboard.
    expect(nav.className).toContain("focus-within:translate-y-0");
  });

  it("falls back to the scroll offset on a page that is one section", async () => {
    // /donate and /contact are a single slice: there is no first slice whose
    // bottom passes under the bar, so the measured test never fired and the
    // bar stayed transparent over the copy the whole way down.
    const main = document.createElement("main");
    main.id = "main-content";
    const only = document.createElement("section");
    only.getBoundingClientRect = () => ({ bottom: 4000 }) as DOMRect;
    main.append(only);
    document.body.append(main);
    const { container } = render(Nav, { items });
    await scrollTo(400);
    expect(container.querySelector("nav")!.dataset.scrolled).toBe("true");
    main.remove();
  });

  it("keeps the bar on a wide viewport, however far down the page", async () => {
    narrowViewport(false);
    mountMain(() => -10);
    const { container } = render(Nav, { items });
    await scrollTo(400);
    await scrollTo(900);
    expect(container.querySelector("nav")!.dataset.hidden).toBe("false");
  });

  it("speaks the page's language, chrome included", async () => {
    // The entries come from Prismic already translated; these words are the
    // chrome's own, and on the Spanish site they were still English.
    const { getByLabelText, getByRole, container } = render(Nav, {
      items,
      lang: "es",
      switchTo: { lang: "en", href: "/about", label: "English", short: "EN" },
    });
    expect(getByRole("group", { name: "Idioma" })).toBeTruthy();
    expect(container.querySelector("img")!.getAttribute("alt")).toBe(
      "Inicio de Vida Legacy Foundation",
    );
    await fireEvent.click(getByLabelText("Abrir el menú"));
    const dialog = getByRole("dialog", { name: "Menú" });
    expect(dialog.querySelector('[aria-label="Cerrar el menú"]')).not.toBeNull();
  });

  it("renders the entries in the bar for a visitor without scripts", () => {
    // NavMenu is not in the DOM until the hamburger is clicked, so without
    // JavaScript the bar offered a control that announces a menu and does
    // nothing. The <noscript> block lists the entries instead and hides the
    // button that cannot work. (A browser running scripts never parses any
    // of this.)
    const { container } = render(Nav, { items });
    const fallback = container.querySelector(".nav-nojs")!;
    expect(fallback).not.toBeNull();
    const links = [...fallback.querySelectorAll("a")];
    expect(links.map((a) => a.textContent?.trim())).toEqual(
      items.filter((i) => i.href).map((i) => i.label),
    );
    expect(links.every((a) => a.getAttribute("href"))).toBe(true);
    // The rule that reveals the list lives in app.html (see the note in the
    // component); what this holds is that the list is rendered, hidden, and
    // complete.
    expect(fallback.className).toContain("nav-nojs");
  });

  it("opens links out of the site in a new tab in the no-JS list too", () => {
    const { container } = render(Nav, {
      items: [{ label: "Donate", href: "https://secure.lglforms.com/x" }],
    });
    const a = container.querySelector(".nav-nojs a")!;
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("swaps when a runway's stage releases, not when the runway ends", async () => {
    // HeartHero is 260vh of scroll driving a stage pinned at the top of the
    // screen. Waiting for the SECTION's bottom edge left the bar wearing the
    // hero's cream lockup for another screen and a half — over the cream
    // headline of the section after it. A first slice taller than the
    // viewport is measured by where its stage releases instead.
    let bottom = 2340;
    mountMain(() => bottom, 2340);
    const { container } = render(Nav, { items, tone: "default" });
    const nav = container.querySelector("nav")!;

    // The stage is still on screen (bottom 1200 - one 768px screen = 432).
    bottom = 1200;
    await scrollTo(1140);
    expect(nav.dataset.scrolled).toBe("false");

    // It has released: bottom 800 - 768 = 32, under the bar.
    bottom = 800;
    await scrollTo(1540);
    expect(nav.dataset.scrolled).toBe("true");
  });
});
