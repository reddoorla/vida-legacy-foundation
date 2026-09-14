import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, beforeAll, vi } from "vitest";
import type { Content } from "@prismicio/client";
import PersonGrid from "./index.svelte";

// jsdom has no Web Animations; Modal's entrance runs on element.animate. The
// mock also lets the suite assert that the entrance actually starts.
const animate = vi.fn(
  () =>
    ({
      finished: Promise.resolve(),
      cancel() {},
      pause() {},
      play() {},
      currentTime: 0,
      playState: "running",
      onfinish: null,
      oncancel: null,
    }) as unknown as Animation,
);

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
  if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
  Element.prototype.animate = animate;
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
  it("draws the comp's bio-only card until headshots are switched on", async () => {
    // The launch state, and what a document authored before the field reads:
    // no photograph, the name at display size, the badge on the card's own
    // corner. Switching `headshots` on brings back the picture card.
    const { container } = render(PersonGrid, { props: { slice: make() } });
    expect(container.querySelector("li img[alt='Brooke Perucki']")).toBeNull();
    const name = container.querySelector("li h4")!;
    expect(name.textContent?.trim()).toBe("Brooke Perucki");
    expect(name.className).toContain("t-stat");
    expect(container.querySelector("li")?.className).toContain("sm:min-h-[calc((100cqw-30px)/2)]");
    expect(container.querySelector("li img[src='/icons/plus-circle.svg']")?.className).toContain(
      "bottom-5",
    );

    const withPhotos = render(PersonGrid, {
      props: { slice: make({ headshots: true }) },
    });
    const photoName = withPhotos.container.querySelector("li h4")!;
    expect(photoName.className).toContain("t-label-lg");
    expect(withPhotos.container.querySelector("li img[alt='Brooke Perucki']")).not.toBeNull();
  });

  it("keeps the photograph out of the pop-up while headshots are off", async () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    await fireEvent.click(container.querySelector<HTMLButtonElement>("li button")!);
    expect(container.querySelector("dialog img[alt='Brooke Perucki']")).toBeNull();
    expect(container.querySelector("dialog h2")?.textContent?.trim()).toBe("Brooke Perucki");
  });

  it("names the card and the pop-up's close button in the document's language", async () => {
    // The people come from Prismic translated; these two labels are the
    // component's own, so they follow SliceZone's locale context.
    const { container } = render(PersonGrid, {
      props: { slice: make(), context: { lang: "es" } },
    });
    const trigger = container.querySelector<HTMLButtonElement>("li button")!;
    expect(trigger.getAttribute("aria-label")).toBe("Leer la biografía de Brooke Perucki");
    await fireEvent.click(trigger);
    expect(container.querySelector('dialog [aria-label="Cerrar"]')).not.toBeNull();
  });

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

  it("opens a card only when a bio exists, in either style", () => {
    // Nicole, on Discord (2026-09-09): "let's disable the (+) button if a bio
    // does not exist". The comp draws a "+" on every leadership card because
    // in the comp every leadership person HAS one — a card without a bio is a
    // content state the comp never drew, not a rule it asserts. Opening it
    // anyway promised "Read the bio for <name>" to a screen reader and then
    // delivered a pop-up repeating the name, role and address already on the
    // card face. Nobody on /about has a bio today, so that was every card.
    for (const primary of [{}, { style: "board" }]) {
      const { container } = render(PersonGrid, { props: { slice: make(primary) } });
      const triggers = container.querySelectorAll("li button");
      expect(triggers.length).toBe(1);
      expect(triggers[0].getAttribute("aria-label")).toContain("Brooke Perucki");
      // Vilma has no bio: neither the trigger nor the badge advertising it.
      const vilma = container.querySelectorAll("li")[1];
      expect(vilma.querySelector("button")).toBeNull();
      expect(vilma.querySelector("img[src='/icons/plus-circle.svg']")).toBeNull();
    }
  });

  it("takes its content's height while a card is full width, and the comp's square as a FLOOR once they sit side by side", () => {
    // Nicole, on Discord (2026-09-09), from a 390px phone: "Height of the box
    // matches height of content instead of being a perfect square. Too much
    // real estate for the names." With `headshots` off there is nothing in a
    // card but a name, a role and an address, so a square left roughly the
    // lower two thirds of a full-bleed card empty. From `sm` the cards are two
    // and three up, where the square is the comp's shape and stays.
    //
    // It stays as a MINIMUM, not as an `aspect-ratio`. The same complaint has
    // a second half nobody had looked for: in the three-up band the square is
    // too SMALL, not too big — the card's height is its width, the width is a
    // third of the row, and the 28px name and 16px role inside it wrap to more
    // lines as that narrows. The two cross at about 1030px and the card, which
    // is `overflow-hidden` for its rounded corners, silently ate the rest.
    // Measured at 768px before the fix: a 126px card holding 241px of content,
    // Holly Aldridge's whole email address gone. See the band walked in
    // tests/smoke/pages.spec.ts.
    //
    // These are min-heights in `cqw` and not `aspect-square` because an
    // aspect-ratio box answers `max-content` and `fit-content` FROM the ratio:
    // both keywords measured out to exactly the square they were meant to
    // escape, so neither `sm:min-h-max` nor `sm:min-h-fit` moved it a pixel.
    // The expressions deliberately mirror the width classes on the same
    // element, so the floor cannot drift from the shape it is a floor for.
    const { container } = render(PersonGrid, { props: { slice: make() } });
    const classes = container.querySelector("li")!.className.split(/\s+/);
    expect(classes).toContain("sm:w-[calc((100%-30px)/2)]");
    expect(classes).toContain("sm:min-h-[calc((100cqw-30px)/2)]");
    expect(classes).toContain("md:w-[calc((100%-60px)/3)]");
    expect(classes).toContain("md:min-h-[calc((100cqw-60px)/3)]");
    // No unprefixed floor: below `sm` the card is its content's height.
    expect(classes.some((c) => /^min-h-/.test(c))).toBe(false);
    // And `cqw` resolves against the row, so the row must be the container.
    expect(container.querySelector("ul")!.className).toContain("@container");
  });

  it("gives the bio trigger a real accessible name, not a bare icon", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    const trigger = container.querySelector("li button");
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.getAttribute("aria-label")).toContain("Brooke Perucki");
    // The whole card is the target — the button is laid over it — and the
    // "+" badge beside it is decoration. The address link stays its own
    // control, above the button, so there is no link inside a button.
    const card = trigger?.closest("li");
    expect(trigger?.className).toContain("absolute inset-0");
    expect(
      card?.querySelector("img[src='/icons/plus-circle.svg']")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(card?.querySelector("a[href^='mailto:']")?.className).toContain("z-10");
    expect(card?.querySelector("a button, button a")).toBeNull();
  });

  it("paints the board style on the lighter cream with page-cream cards", () => {
    // The comp's second group: the band is #fffbf4, the cards the page cream
    // under the grain, the names the dark green, the copy the -aa green.
    const { container } = render(PersonGrid, { props: { slice: make({ style: "board" }) } });
    expect(container.querySelector("section")?.className).toContain("bg-cream");
    const card = container.querySelector("li");
    expect(card?.className).toContain("bg-background");
    expect(container.querySelector("h4")?.className).toContain("text-green-btn");
    // And leadership stays the dark card with green names.
    const lead = render(PersonGrid, { props: { slice: make() } });
    expect(lead.container.querySelector("section")?.className).toContain("bg-background");
    expect(lead.container.querySelector("li")?.className).toContain("bg-green-deep");
    expect(lead.container.querySelector("h4")?.className).toContain("text-green");
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
    // The sheet sits inside Modal's own backdrop element now.
    const panel = container.querySelector("dialog [data-backdrop] > div");
    // And it ENTERS: the Modal is created already open, so only a global
    // transition plays — a local one would skip the entrance (review round 3).
    expect(animate).toHaveBeenCalled();
    expect(panel).not.toBeNull();
    expect(panel?.className).toContain("bg-green-deep!");
    expect(container.querySelector("dialog")?.textContent).toContain("Brooke Perucki bio copy.");
    // Named by the person: on a phone the headshot is hidden, so the heading
    // is the only thing identifying the pop-up.
    const dialog = container.querySelector("dialog")!;
    const named = container.querySelector(
      `#${CSS.escape(dialog.getAttribute("aria-labelledby")!)}`,
    );
    expect(named?.textContent?.trim()).toBe("Brooke Perucki");
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

describe("without JavaScript", () => {
  // The bio exists ONLY inside a Modal that a click creates, so with no script
  // to handle the click it was not hidden but absent — unreachable for a
  // visitor and invisible to a crawler. The card renders it too now, hidden by
  // app.css and revealed by the <noscript> block in app.html; it cannot live
  // inside a <noscript> itself, because a browser running scripts parses that
  // content as raw text and it would not survive hydration.
  //
  // Nothing on /about carries a bio today, so this is the only thing that
  // exercises the path until one is authored — and since a card only opens
  // when it HAS a bio, no card on /about opens at all right now.
  it("renders each bio on the card, for a visitor who cannot open the pop-up", () => {
    const { container } = render(PersonGrid, {
      props: { slice: make({}, [person("Ada Lovelace", true), person("Grace Hopper", true)]) },
    });
    const bios = [...container.querySelectorAll(".person-bio-nojs")];
    expect(bios.map((b) => b.textContent?.trim())).toEqual([
      "Ada Lovelace bio copy.",
      "Grace Hopper bio copy.",
    ]);
  });

  it("leaves out a bio nobody wrote, rather than an empty block", () => {
    const { container } = render(PersonGrid, {
      props: { slice: make({}, [person("Ada Lovelace")]) },
    });
    expect(container.querySelectorAll(".person-bio-nojs").length).toBe(0);
  });

  it("marks the two controls that do nothing without a script", () => {
    // The overlay button cannot open anything and would swallow selection of
    // the bio underneath it; the + badge advertises a pop-up that cannot
    // happen. app.html hides both, the same way it hides the nav's hamburger.
    const { container } = render(PersonGrid, {
      props: { slice: make({}, [person("Ada Lovelace", true)]) },
    });
    expect(container.querySelectorAll("[data-bio-toggle]").length).toBe(1);
    expect(container.querySelectorAll(".person-open-cue").length).toBe(1);
  });
});

describe("an editorial line break in a name", () => {
  // Erik, Discord 2026-09-11: "a line break between Holly and Aldridge so that
  // the leadership team name blocks all align". Two of the three leadership
  // names wrapped on their own and the third did not, so the roles and
  // addresses under them sat at different heights. Where a NAME breaks is
  // editorial — no rule can work out "Vince Speeg, MD, PhD" — so the return an
  // editor types in Prismic is honoured rather than guessed at.
  const broken = () => make({}, [{ ...person("Holly Aldridge", true), name: "Holly \nAldridge" }]);

  it("keeps the newline in the card's name", () => {
    const { container } = render(PersonGrid, { props: { slice: broken() } });
    expect(container.querySelector("li h4")!.textContent).toContain("\n");
  });

  it("renders it rather than collapsing it, which is the whole defect", () => {
    // Plain text in HTML collapses a newline to a space — that is exactly what
    // Erik saw after adding the return in Prismic. `pre-line` is the mechanism
    // that makes the stored break visible; without this class the content is
    // correct and the page is not.
    const { container } = render(PersonGrid, { props: { slice: broken() } });
    expect(container.querySelector("li h4")!.className).toContain("sm:whitespace-pre-line");
  });

  it("ignores the break on a phone, where the cards are stacked", () => {
    // Nicole approved the hard return for the row of cards, and it is right
    // there. At 390px every name already fits on one line and the cards are
    // stacked, so honouring it split a name that had room — measured 50/50/82
    // against the others. Scoped to sm:, the newline collapses to a space below
    // it, which is the browser default.
    const cls = render(PersonGrid, { props: { slice: broken() } }).container.querySelector(
      "li h4",
    )!.className;
    expect(cls).not.toMatch(/(^|\s)whitespace-pre-line/);
  });

  it("collapses the stray space the editor left before the return", () => {
    // The stored value really is "Holly \nAldridge". pre-line (not pre-wrap)
    // collapses that space; pre-wrap would indent the second line.
    const { container } = render(PersonGrid, { props: { slice: broken() } });
    const cls = container.querySelector("li h4")!.className;
    expect(cls).not.toContain("whitespace-pre-wrap");
  });

  it("never opens a card with a blank line", () => {
    const leading = () => make({}, [{ ...person("Holly Aldridge", true), name: "\nHolly" }]);
    const { container } = render(PersonGrid, { props: { slice: leading() } });
    expect(container.querySelector("li h4")!.textContent!.trim().startsWith("Holly")).toBe(true);
    expect(container.querySelector("li h4")!.textContent).not.toMatch(/^\s*\n/);
  });

  it("keeps the name on one line in the button's accessible name", () => {
    const { container } = render(PersonGrid, { props: { slice: broken() } });
    const label = container.querySelector("button[data-bio-toggle]")!.getAttribute("aria-label")!;
    expect(label).toContain("Holly Aldridge");
    expect(label).not.toContain("\n");
  });

  it("keeps the name on one line in the bio dialog's heading", async () => {
    // Same field, two layouts. The break aligns three cards in a row; in a
    // single-column dialog at a different size it would read as arbitrary.
    const { container } = render(PersonGrid, { props: { slice: broken() } });
    await fireEvent.click(container.querySelector("button[data-bio-toggle]")!);
    const heading = container.querySelector("dialog h2")!;
    expect(heading.textContent!.trim()).toBe("Holly Aldridge");
  });
});

describe("the name block reserves two lines so a row of cards aligns", () => {
  // This, not the typed return, is what makes the leadership row line up.
  // Measured in a browser with the return in place: desktop EN aligned, but a
  // 390px phone put Holly's name on two lines against the others' one (roles at
  // 50/50/82px), and Spanish — where no return was typed — was still 97/97/55.
  // Which names wrap is a function of the viewport and of the words, so a break
  // chosen for one is wrong in the others. Reserving the height is not.
  it("reserves two lines from the breakpoint where cards sit side by side", () => {
    const { container } = render(PersonGrid, { props: { slice: make() } });
    expect(container.querySelector("li h4")!.className).toContain("sm:min-h-[2lh]");
  });

  it("reserves nothing on a phone, where the cards are stacked", () => {
    // `w-full` below sm: one card per row, so there is no neighbour to align
    // with and an unconditional reservation would only open a gap.
    const cls = render(PersonGrid, { props: { slice: make() } }).container.querySelector(
      "li h4",
    )!.className;
    expect(cls).not.toMatch(/(^|\s)min-h-\[2lh\]/);
  });

  it("reserves for every card, so the shortest name holds the row open too", () => {
    const { container } = render(PersonGrid, {
      props: { slice: make({}, [person("Ann Lee"), person("Maximilian Fotheringay")]) },
    });
    const names = [...container.querySelectorAll("li h4")];
    expect(names.length).toBe(2);
    for (const n of names) expect(n.className).toContain("sm:min-h-[2lh]");
  });
});
