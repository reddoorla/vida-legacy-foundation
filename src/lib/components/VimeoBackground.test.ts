import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import VimeoBackground from "./VimeoBackground.svelte";

// Ported alongside the component from the-pointe-burbank's VimeoBanner suite.
// Each case here is a defect that component already paid for once; they are
// worth more than the component is, because nothing about them is visible in
// the code that fixes them.

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  disconnected = false;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {
    this.disconnected = true;
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting, target: this.observed[0] } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

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

const props = { vimeoId: "1226003530", width: 1529, height: 860 };

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  // @ts-expect-error — replacing global for test
  window.IntersectionObserver = FakeIntersectionObserver;
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Engage (first input) + scroll near viewport — the two mount conditions. */
async function engageAndIntersect() {
  FakeIntersectionObserver.instances[0].trigger(true);
  window.dispatchEvent(new Event("pointermove"));
  await tick();
}

function vimeoMessage(
  event: string,
  {
    source,
    origin = "https://player.vimeo.com",
  }: { source: MessageEventSource | null; origin?: string },
) {
  return new MessageEvent("message", { origin, source, data: JSON.stringify({ event }) });
}

function sourceOf(container: HTMLElement): MessageEventSource {
  return container.querySelector("iframe")!.contentWindow as unknown as MessageEventSource;
}

describe("VimeoBackground", () => {
  it("creates no iframe until the visitor engages AND the frame is near the viewport", async () => {
    // Vimeo's player sets Cloudflare's __cf_bm third-party cookie the moment it
    // loads, which fails Lighthouse best-practices. An audit never taps or
    // moves, so gating on real input keeps the cookie out of an audited load.
    const { container } = render(VimeoBackground, { props });
    await tick();
    expect(container.querySelector("iframe")).toBeNull();

    FakeIntersectionObserver.instances[0].trigger(true);
    await tick();
    expect(container.querySelector("iframe"), "in view alone must not mount").toBeNull();

    window.dispatchEvent(new Event("pointermove"));
    await tick();
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("never creates the iframe under prefers-reduced-motion", async () => {
    mockMatchMedia(true);
    const { container } = render(VimeoBackground, { props });
    await tick();
    // The observer is never even constructed, so there is nothing to engage.
    expect(FakeIntersectionObserver.instances.length).toBe(0);
    window.dispatchEvent(new Event("pointermove"));
    await tick();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("keeps the player hidden until a heartbeat arrives from its own iframe", async () => {
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    const iframe = container.querySelector("iframe")!;
    expect(iframe.classList.contains("is-playing")).toBe(false);

    window.dispatchEvent(vimeoMessage("playProgress", { source: sourceOf(container) }));
    await tick();
    expect(iframe.classList.contains("is-playing")).toBe(true);
  });

  it("ignores heartbeats from another origin", async () => {
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    window.dispatchEvent(
      vimeoMessage("playProgress", {
        source: sourceOf(container),
        origin: "https://player.vimeo.com.evil.test",
      }),
    );
    await tick();
    expect(container.querySelector("iframe")!.classList.contains("is-playing")).toBe(false);
  });

  it("ignores heartbeats from a sibling player on the same origin", async () => {
    // Origin alone is not enough: a second embed posts from the same origin and
    // its beats would reveal this one before its own player had started.
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    window.dispatchEvent(
      vimeoMessage("playProgress", { source: window as unknown as MessageEventSource }),
    );
    await tick();
    expect(container.querySelector("iframe")!.classList.contains("is-playing")).toBe(false);
  });

  it("survives opaque origins and junk payloads without throwing", async () => {
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    const source = sourceOf(container);
    expect(() => {
      window.dispatchEvent(
        new MessageEvent("message", { origin: "null", source, data: "not json" }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://player.vimeo.com",
          source,
          data: "{oh no",
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://player.vimeo.com",
          source,
          data: JSON.stringify(null),
        }),
      );
    }).not.toThrow();
    await tick();
    expect(container.querySelector("iframe")!.classList.contains("is-playing")).toBe(false);
  });

  it("falls back to the poster when heartbeats stop (iOS autoplay suspension)", async () => {
    // iOS fires one play for a muted background embed and then suspends it. A
    // one-shot reveal would uncover a frozen first frame and leave it there.
    vi.useFakeTimers();
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    const iframe = container.querySelector("iframe")!;

    window.dispatchEvent(vimeoMessage("playProgress", { source: sourceOf(container) }));
    await tick();
    expect(iframe.classList.contains("is-playing")).toBe(true);

    await vi.advanceTimersByTimeAsync(4000);
    await tick();
    expect(iframe.classList.contains("is-playing")).toBe(false);
  });

  it("sizes the player to the box it is given, since an iframe ignores object-fit", async () => {
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    const style = container.querySelector("iframe")!.getAttribute("style") ?? "";
    expect(style).toContain("width: 1529px");
    expect(style).toContain("height: 860px");
  });

  it("renders nothing measurable before the stage has been measured", async () => {
    const { container } = render(VimeoBackground, {
      props: { ...props, width: 0, height: 0 },
    });
    await engageAndIntersect();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("asks Vimeo for a silent, looping, do-not-track background embed", async () => {
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    const src = container.querySelector("iframe")!.getAttribute("src")!;
    expect(src.startsWith("https://player.vimeo.com/video/1226003530?")).toBe(true);
    for (const param of ["background=1", "muted=1", "loop=1", "autoplay=1", "dnt=1"]) {
      expect(src).toContain(param);
    }
  });

  it("stays decorative and out of the tab order", async () => {
    const { container } = render(VimeoBackground, { props });
    await engageAndIntersect();
    const iframe = container.querySelector("iframe")!;
    expect(iframe.getAttribute("aria-hidden")).toBe("true");
    expect(iframe.getAttribute("tabindex")).toBe("-1");
    expect(container.querySelector(".vimeo-bg")!.getAttribute("aria-hidden")).toBe("true");
  });
});
