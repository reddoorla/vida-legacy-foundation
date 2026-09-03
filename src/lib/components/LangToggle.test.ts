import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import LangToggle from "./LangToggle.svelte";

afterEach(() => cleanup());

const es = { lang: "es" as const, href: "/es/about", label: "Español", short: "ES" };

const toggle = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[role="group"][aria-label="Language"]')!;

describe("LangToggle", () => {
  it("marks the current locale and renders both sides inert without a target", () => {
    const { container } = render(LangToggle, { lang: "en" });
    const group = toggle(container);
    expect(group.querySelector("[aria-current]")?.textContent?.trim()).toBe("EN");
    expect(group.querySelector("[aria-disabled]")?.textContent?.trim()).toBe("ES");
    // A dead switch would send the prerender crawler into a 404.
    expect(group.querySelector("a")).toBeNull();
  });

  it("makes the WHOLE pill the switch, not just the other side", () => {
    const { container } = render(LangToggle, { lang: "en", switchTo: es, tone: "onDark" });
    const group = toggle(container);
    const link = group.querySelector("a")!;
    // The link is the track: both segments sit inside it, so a press anywhere
    // on the pill switches language.
    expect(link.querySelectorAll("span")).toHaveLength(2);
    expect(link.querySelector("[aria-current]")?.textContent?.trim()).toBe("EN");
    expect(link.getAttribute("href")).toBe("/es/about");
    expect(link.getAttribute("hreflang")).toBe("es");
    expect(link.hasAttribute("data-sveltekit-noscroll")).toBe(true);
    // Named by the language it leads to, not by the EN/ES inside it.
    expect(link.getAttribute("aria-label")).toBe("Español");
    expect(link.className).toContain("text-background");
  });

  it("flips the couple on the green hero", () => {
    const { container } = render(LangToggle, { lang: "es", tone: "onGreen" });
    const current = toggle(container).querySelector("[aria-current]");
    expect(current?.textContent?.trim()).toBe("ES");
    expect(current?.className).toContain("bg-green-btn");
  });

  it("names the marked pill so the view transition morphs it across", () => {
    const { container } = render(LangToggle, {
      lang: "en",
      switchTo: es,
      viewName: "lang-pill-bar",
    });
    const group = toggle(container);
    expect(group.querySelector("[aria-current]")?.getAttribute("style")).toContain(
      "view-transition-name: lang-pill-bar",
    );
    // Only the pill is named: a second name in the same snapshot aborts the
    // whole transition, and the inert side is not the thing that moves.
    expect(group.querySelectorAll("[style*='view-transition-name']")).toHaveLength(1);
  });

  it("leaves the pill unnamed when no name is given", () => {
    const { container } = render(LangToggle, { lang: "en", switchTo: es });
    expect(toggle(container).querySelector("[aria-current]")?.getAttribute("style")).toBeNull();
  });
});
