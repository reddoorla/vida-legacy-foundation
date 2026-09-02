import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, beforeAll } from "vitest";
import type { Content } from "@prismicio/client";
import PersonGrid from "./index.svelte";

beforeAll(() => {
  // jsdom < v26 polyfill: ensure showModal/close exist (same shim Modal.test
  // uses) so opening a bio does not throw inside Modal's $effect.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

const headshot = (alt: string) => ({
  url: "https://img.example/headshot.jpg",
  alt,
  dimensions: { width: 592, height: 592 },
});

const person = (name: string, withBio = false) => ({
  headshot: headshot(name),
  name,
  role: "Executive Director",
  email: `${name.split(" ")[0].toLowerCase()}@vidalegacy.org`,
  bio: withBio ? [{ type: "paragraph", text: `${name} bio copy.`, spans: [] }] : [],
});

const make = (primary: Record<string, unknown> = {}, items?: unknown[]) =>
  ({
    slice_type: "person_grid",
    variation: "default",
    primary: {
      heading: [
        {
          type: "heading2",
          text: "A Team That Cares",
          spans: [{ type: "label", start: 12, end: 17, data: { label: "highlight" } }],
        },
      ],
      label: "Leadership",
      intro: [{ type: "paragraph", text: "Our staff is dedicated.", spans: [] }],
      ...primary,
    },
    items: items ?? [person("Brooke Perucki", true), person("Vilma Gonzalez")],
  }) as unknown as Content.PersonGridSlice;

// Queries are scoped to `container`, never the document: this suite has no
// auto-cleanup between renders, so an unscoped getBy* sees every earlier test's
// DOM too and fails on duplicates.
describe("PersonGrid slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    const section = container.querySelector("[data-slice-type='person_grid']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("shifts heading levels down when a display heading is present", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    expect(container.querySelector("h2")?.textContent).toContain("A Team That Cares");
    expect(container.querySelector("h3")?.textContent?.trim()).toBe("Leadership");
    expect(container.querySelector("h4")?.textContent?.trim()).toBe("Brooke Perucki");
  });

  it("promotes the label to h2 when there is no display heading", () => {
    // This slice appears twice on Who We Are and only the first carries the
    // display heading. Fixing the label at h3 would leave the second group
    // starting at h3 under the page h1 — a skipped level, which axe flags.
    const { container } = render(PersonGrid, { props: { slice: make({ heading: [] }) } });
    expect(container.querySelector("h2")?.textContent?.trim()).toBe("Leadership");
    expect(container.querySelector("h3")?.textContent?.trim()).toBe("Brooke Perucki");
    expect(container.querySelector("h4")).toBeNull();
  });

  it("draws the bio trigger only for people who have a bio", () => {
    // The affordance must never lie: a "+" with nothing behind it is worse
    // than no "+".
    const { container } = render(PersonGrid, { props: { slice: make() } });
    const triggers = container.querySelectorAll("li button");
    expect(triggers.length).toBe(1);
    expect(triggers[0].textContent).toContain("Brooke Perucki");
  });

  it("gives the bio trigger a real accessible name, not a bare icon", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    const trigger = container.querySelector("li button");
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.querySelector(".sr-only")?.textContent).toContain("Brooke Perucki");
    expect(trigger?.querySelector("img")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("opens the bio dialog with the dark ground actually applied", async () => {
    // Regression guard. The card ground was first written as a Svelte SCOPED
    // class and passed to <Modal> through its `class` prop — but Svelte only
    // hashes scoped classes onto elements in THIS component's template, so the
    // copy landing on Modal's own element carried no hash and the rule never
    // matched: the dialog rendered with no background at all. bg-green-deep is
    // a @theme utility, so there is no scoping to get wrong.
    const { container } = render(PersonGrid, { props: { slice: make() } });
    await fireEvent.click(container.querySelector("li button")!);
    const panel = container.querySelector("dialog > div");
    expect(panel).not.toBeNull();
    expect(panel?.className).toContain("bg-green-deep");
    expect(container.querySelector("dialog")?.textContent).toContain("Brooke Perucki bio copy.");
  });

  it("builds the mailto from a bare address", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    const mail = container.querySelector("a[href^='mailto:']");
    expect(mail?.getAttribute("href")).toBe("mailto:brooke@vidalegacy.org");
    expect(mail?.textContent).toContain("brooke@vidalegacy.org");
  });

  it("keeps no dialog in the DOM until a bio is opened", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("drops entries with neither a name nor a headshot", () => {
    const { container } = render(PersonGrid, {
      props: { slice: make({}, [person("Kept"), { name: "", headshot: {}, role: "", bio: [] }]) },
    });
    expect(container.querySelectorAll("li").length).toBe(1);
  });

  it("renders the intro column with no people at all", () => {
    const { container } = render(PersonGrid, { props: { slice: make({}, []) } });
    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).toContain("Leadership");
  });
});
