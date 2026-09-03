import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import TransitionOverlay from "./TransitionOverlay.svelte";

type NavCallback = (nav: FakeNav) => void;
interface FakeNav {
  type: string;
  willUnload: boolean;
  to: { url: URL } | null;
}

let beforeNavigateCb: NavCallback | undefined;
let afterNavigateCb: (() => void) | undefined;

vi.mock("$app/navigation", () => ({
  beforeNavigate: (cb: NavCallback) => {
    beforeNavigateCb = cb;
  },
  afterNavigate: (cb: () => void) => {
    afterNavigateCb = cb;
  },
}));

const nav = (path: string | null = "/about", willUnload = false): FakeNav => ({
  type: "link",
  willUnload,
  to: path ? { url: new URL(path, "https://example.com") } : null,
});

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no Web Animations; the overlay's fade needs element.animate.
  if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => {
      const animation = {
        finished: Promise.resolve(),
        cancel() {},
        pause() {},
        play() {},
        currentTime: 0,
        playState: "finished",
        oncancel: null,
        _onfinish: null as null | (() => void),
        get onfinish() {
          return this._onfinish;
        },
        set onfinish(fn: null | (() => void)) {
          this._onfinish = fn;
          if (fn) queueMicrotask(fn);
        },
      };
      return animation as unknown as Animation;
    });
  }
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const overlay = (container: HTMLElement) => container.querySelector("[data-overlay]");

describe("TransitionOverlay", () => {
  it("shows nothing for a navigation that lands inside the delay", async () => {
    const { container } = render(TransitionOverlay, { class: "cover", delay: 200 });
    beforeNavigateCb!(nav());
    await vi.advanceTimersByTimeAsync(120);
    expect(container.querySelector(".cover")).toBeNull();
    afterNavigateCb!();
    await vi.advanceTimersByTimeAsync(2000);
    await tick();
    expect(container.querySelector(".cover")).toBeNull();
  });

  it("covers a slow navigation after the delay and holds it at least minVisible", async () => {
    const { container } = render(TransitionOverlay, {
      class: "cover",
      delay: 200,
      minVisible: 400,
      fadeOutDuration: 100,
    });
    beforeNavigateCb!(nav());
    await vi.advanceTimersByTimeAsync(250);
    await tick();
    expect(container.querySelector(".cover")).not.toBeNull();
    afterNavigateCb!();
    await vi.advanceTimersByTimeAsync(200);
    await tick();
    expect(container.querySelector(".cover")).not.toBeNull();
    await vi.advanceTimersByTimeAsync(300);
    await tick();
    await tick();
    expect(container.querySelector(".cover")).toBeNull();
  });

  it("leaves a skipped navigation alone, even a slow one", async () => {
    const { container } = render(TransitionOverlay, {
      class: "cover",
      delay: 200,
      skip: (n) => n.to?.url.pathname === "/contact",
    });
    beforeNavigateCb!(nav("/contact"));
    await vi.advanceTimersByTimeAsync(2000);
    await tick();
    expect(container.querySelector(".cover")).toBeNull();
    expect(overlay(container)).toBeNull();
  });

  it("stays out of a navigation that unloads the page", async () => {
    // afterNavigate never fires for one, so a cover raised here would be
    // frozen into the back/forward cache and come back over a dead page.
    const { container } = render(TransitionOverlay, { class: "cover", delay: 200 });
    beforeNavigateCb!(nav("https://secure.lglforms.com/x", true));
    await vi.advanceTimersByTimeAsync(2000);
    await tick();
    expect(overlay(container)).toBeNull();
    // Kit's beforeunload path hands over no destination at all.
    beforeNavigateCb!(nav(null, true));
    await vi.advanceTimersByTimeAsync(2000);
    await tick();
    expect(overlay(container)).toBeNull();
  });

  it("clears a cover that came back from the back/forward cache", async () => {
    const { container } = render(TransitionOverlay, { class: "cover", delay: 200 });
    beforeNavigateCb!(nav());
    await vi.advanceTimersByTimeAsync(250);
    await tick();
    expect(overlay(container)).not.toBeNull();
    const restored = new Event("pageshow") as PageTransitionEvent & { persisted: boolean };
    Object.defineProperty(restored, "persisted", { value: true });
    window.dispatchEvent(restored);
    await tick();
    await tick();
    expect(overlay(container)).toBeNull();
  });
});
