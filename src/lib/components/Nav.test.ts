import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import Nav from "./Nav.svelte";

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
function mountMain(bottom: () => number) {
  const main = document.createElement("main");
  main.id = "main-content";
  const first = document.createElement("section");
  main.appendChild(first);
  document.body.appendChild(main);
  vi.spyOn(first, "getBoundingClientRect").mockImplementation(
    () => ({ bottom: bottom() }) as DOMRect,
  );
  return main;
}

describe("Nav — the bar", () => {
  it("links the lockup home and renders no menu button without entries", () => {
    const { getByAltText, queryByLabelText } = render(Nav);
    const img = getByAltText("Vida Legacy Foundation home");
    expect(img.closest("a")?.getAttribute("href")).toBe("/");
    expect(queryByLabelText("Open menu")).toBeNull();
  });

  it("is transparent with the page's tone over the first slice", () => {
    const { container, getByAltText, getByLabelText } = render(Nav, {
      items,
      tone: "onGreen",
    });
    const nav = container.querySelector("nav")!;
    expect(nav.dataset.tone).toBe("onGreen");
    expect(nav.dataset.scrolled).toBe("false");
    expect(nav.className).toContain("bg-transparent");
    expect(getByAltText("Vida Legacy Foundation home").getAttribute("src")).toBe(
      "/logo-lockup-cream.svg",
    );
    // The comp's cream hamburger on the green hero is 1.93:1 — the control
    // takes the design's dark-on-green pairing instead.
    expect(getByLabelText("Open menu").className).toContain("text-green-btn");
  });

  it("uses the cream-and-green lockup and a cream hamburger on the dark ground", () => {
    const { getByAltText, getByLabelText } = render(Nav, { items, tone: "onDark" });
    expect(getByAltText("Vida Legacy Foundation home").getAttribute("src")).toBe(
      "/logo-lockup-on-dark.svg",
    );
    expect(getByLabelText("Open menu").className).toContain("text-background");
  });

  it("defaults to the blue lockup on cream", () => {
    const { getByAltText, getByLabelText } = render(Nav, { items });
    expect(getByAltText("Vida Legacy Foundation home").getAttribute("src")).toBe(
      "/logo-lockup.svg",
    );
    expect(getByLabelText("Open menu").className).toContain("text-primary");
  });

  it("becomes the cream bar with the default lockup once the first slice scrolls under it", async () => {
    let bottom = 800;
    mountMain(() => bottom);
    const { container, getByAltText } = render(Nav, { items, tone: "onGreen" });
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
    expect(nav.className).toContain("bg-background/95");
    expect(getByAltText("Vida Legacy Foundation home").getAttribute("src")).toBe(
      "/logo-lockup.svg",
    );
  });

  it("renders the language switch only when given a target", async () => {
    const { container, rerender, getByLabelText } = render(Nav, { items, tone: "onDark" });
    expect(container.querySelector("a[hreflang]")).toBeNull();

    await rerender({
      items,
      tone: "onDark",
      switchTo: { lang: "es", href: "/es/about", label: "Español", short: "ES" },
    });
    const link = getByLabelText("Español");
    expect(link.getAttribute("href")).toBe("/es/about");
    expect(link.getAttribute("hreflang")).toBe("es");
    expect(link.getAttribute("lang")).toBe("es");
    expect(link.textContent?.trim()).toBe("ES");
    // Same colouring as the hamburger on that ground.
    expect(link.className).toContain("text-background");
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
    const { getByLabelText, getByText } = render(Nav, { items });
    await fireEvent.click(getByLabelText("Open menu"));
    const donate = getByText("Donate").closest("a")!;
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(donate.getAttribute("rel")).toBe("noopener noreferrer");
    const contact = getByText("Contact Us").closest("a")!;
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

  it("offers the language switch under the entries, by its full name", async () => {
    const { getByLabelText, getByRole, queryByRole } = render(Nav, {
      items,
      switchTo: { lang: "es", href: "/es", label: "Español", short: "ES" },
    });
    await fireEvent.click(getByLabelText("Open menu"));
    const link = Array.from(getByRole("dialog").querySelectorAll("a")).find(
      (a) => a.getAttribute("hreflang") === "es",
    )!;
    expect(link.textContent?.trim()).toBe("Español");
    expect(link.getAttribute("href")).toBe("/es");
    await fireEvent.click(link);
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
