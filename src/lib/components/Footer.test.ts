import { render, cleanup } from "@testing-library/svelte";
import { describe, it, expect, afterEach } from "vitest";
import Footer from "./Footer.svelte";
import { contrast, groundOf, textColour } from "../../test/theme-contrast";

afterEach(() => cleanup());

describe("Footer", () => {
  // --- columns chrome (per-route override; takes precedence) ---

  it("default: renders the hardcoded copyright (fleet behavior unchanged)", () => {
    const { container } = render(Footer);
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.querySelector("footer")?.textContent).toContain("Company Name");
  });

  it("columns prop renders text items with tel/mailto links", () => {
    const { container, getByText } = render(Footer, {
      props: {
        columns: [
          {
            items: [
              { text: "Todd Doney" },
              { text: "213.613.3330", href: "tel:213.593.1360" },
              {
                text: "Todd.Doney@cbre.com",
                href: "mailto:Todd.Doney@cbre.com",
              },
            ],
          },
        ],
      },
    });
    // A no-href text item is a plain <p>, never an anchor.
    const plain = getByText("Todd Doney");
    expect(plain.tagName).toBe("P");
    expect(plain.closest("a")).toBeNull();

    const tel = container.querySelector("a[href='tel:213.593.1360']");
    expect(tel?.textContent).toContain("213.613.3330");
    // tel:/mailto: stay same-tab — no target/rel.
    expect(tel?.getAttribute("target")).toBeNull();
    expect(tel?.getAttribute("rel")).toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
  });

  it("columns prop renders image items, linked when href present", () => {
    const { container } = render(Footer, {
      props: {
        columns: [
          {
            items: [
              {
                image: {
                  url: "https://cdn/logo.png",
                  maxWidth: "300px",
                  alt: "Burbank Portfolio",
                },
                href: "https://www.theburbankportfolio.com/",
              },
              { image: { url: "https://cdn/plain.png" } },
            ],
          },
        ],
      },
    });
    const linked = container.querySelector("a[href='https://www.theburbankportfolio.com/'] img");
    expect(linked?.getAttribute("src")).toBe("https://cdn/logo.png");
    expect((linked as HTMLElement)?.style.maxWidth).toBe("300px");
    expect(linked?.getAttribute("alt")).toBe("Burbank Portfolio");

    // http(s) logo link opens in a new tab with the safe rel.
    const anchor = container.querySelector("a[href='https://www.theburbankportfolio.com/']");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");

    // Two images total; only the href'd one is wrapped in an anchor.
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(2);
    expect(container.querySelectorAll("a > img").length).toBe(1);
  });

  it("linked logo exposes its alt as the link's accessible name (a11y)", () => {
    const { getByRole } = render(Footer, {
      props: {
        columns: [
          {
            items: [
              {
                image: {
                  url: "https://cdn/logo.png",
                  alt: "Burbank Portfolio",
                },
                href: "https://www.theburbankportfolio.com/",
              },
            ],
          },
        ],
      },
    });
    // The anchor wrapping only an <img> derives its name from the img alt.
    expect(getByRole("link", { name: "Burbank Portfolio" })).not.toBeNull();
  });

  it("paints the fine tone in a colour that clears AA on the footer's ground", () => {
    // The comps set the 10px copyright in #527e01, which is 4.47:1 on cream —
    // it misses AA body by 0.03. --color-green-mid-aa is the same green
    // darkened 2% to 4.65:1. A regression here is a real WCAG failure, and the
    // axe gate only sees it because the footer renders on every audited route.
    const { getByText } = render(Footer, {
      props: {
        columns: [{ items: [{ text: "© 2026 Vida Legacy Foundation.", tone: "fine" }] }],
      },
    });
    const line = getByText("© 2026 Vida Legacy Foundation.");
    // Computed from the @theme tokens rather than naming one: any colour that
    // clears AA body on the footer's ground passes, and #527e01 (4.47) fails.
    expect(contrast(textColour(line), groundOf(line))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps detail rows and plain rows readable on the footer's ground", () => {
    // The 12px label rows: a plain row, a linked detail row and an unlinked
    // one. Whatever colour each tone is given, it must clear AA body on the
    // ground the footer paints (the brand green, #9cbf5b, is 1.94:1 on cream).
    const { getByText } = render(Footer, {
      props: {
        columns: [
          {
            items: [
              { text: "Who we are" },
              { text: "726-234-6910", href: "tel:+17262346910", tone: "detail" },
              { text: "San Antonio, TX 78240", tone: "detail" },
            ],
          },
        ],
      },
    });
    for (const text of ["Who we are", "726-234-6910", "San Antonio, TX 78240"]) {
      const row = getByText(text);
      expect(contrast(textColour(row), groundOf(row)), text).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("default branch when columns is empty/undefined (fleet default preserved)", () => {
    const { container } = render(Footer, { props: { columns: [] } });
    expect(container.querySelector("footer")?.textContent).toContain("Company Name");
  });

  // --- socials/text chrome (site-config default; used when no columns) ---

  it("falls back to a generic notice with no props", () => {
    const { container, queryByRole } = render(Footer);
    // No socials → no list; the copyright line is always present.
    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).toContain("Company Name");
    expect(queryByRole("list")).toBeNull();
  });

  it("renders the supplied rights line verbatim", () => {
    const text = "© Composition Hospitality 2017, All Rights Reserved";
    const { container } = render(Footer, { text });
    expect(container.textContent).toContain(text);
  });

  it("renders a labelled, new-tab link per known social network", () => {
    const { getByLabelText } = render(Footer, {
      socials: [
        { network: "facebook", href: "https://fb.com/x" },
        { network: "instagram", href: "https://ig.com/x" },
      ],
    });
    const fb = getByLabelText("Facebook");
    expect(fb.getAttribute("href")).toBe("https://fb.com/x");
    expect(fb.getAttribute("target")).toBe("_blank");
    expect(fb.getAttribute("rel")).toBe("noopener noreferrer");
    expect(getByLabelText("Instagram")).toBeTruthy();
  });

  it("aliases linkedin-company to the LinkedIn icon", () => {
    const { getByLabelText } = render(Footer, {
      socials: [{ network: "linkedin-company", href: "https://lnkd.in/x" }],
    });
    expect(getByLabelText("LinkedIn")).toBeTruthy();
  });

  it("drops unknown networks and prototype-chain member names", () => {
    const { container } = render(Footer, {
      socials: [
        { network: "myspace" },
        { network: "toString" },
        { network: "constructor" },
        { network: "__proto__" },
      ],
    });
    // None are real networks → no list is rendered and nothing throws.
    expect(container.querySelector("ul")).toBeNull();
  });

  it("renders a hrefless social as a non-interactive glyph, not a dead link", () => {
    const { getByLabelText, container } = render(Footer, {
      socials: [{ network: "youtube" }],
    });
    const yt = getByLabelText("YouTube");
    // No <a> (a href="#" would be a dead link); a labelled role=img span instead.
    expect(yt.tagName).toBe("SPAN");
    expect(yt.getAttribute("role")).toBe("img");
    expect(container.querySelector("a")).toBeNull();
    // The brand glyph still renders.
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("grows the link hit boxes to 24px without moving a baseline", () => {
    // The rows are set in `.t-label`, which trims its box to cap height —
    // 8.41px here — so the real target was 16.5px of line box, under WCAG
    // 2.5.8's 24. Padding would move the comp's baselines; a pseudo element
    // 8px above and below does not, and still leaves 14px clear between
    // neighbours at the 38.41px row pitch.
    const { container } = render(Footer, {
      props: { columns: [{ items: [{ text: "Who we are", href: "/about" }] }] },
    });
    const link = container.querySelector<HTMLElement>("a[href='/about']")!;
    expect(link.className).toContain("relative");
    expect(link.className).toContain("before:-top-[8px]");
    expect(link.className).toContain("before:-bottom-[8px]");
    expect(link.className).toContain("before:inset-x-0");
  });
});
