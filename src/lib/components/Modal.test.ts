import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Modal from "./Modal.svelte";

afterEach(() => cleanup());

const body = () =>
  createRawSnippet(() => ({
    render: () => "<p>Modal body</p>",
  }));

beforeEach(() => {
  // jsdom < v26 polyfill: ensure showModal/close exist
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
  // jsdom has no Web Animations. The sheet's fade/fly transitions run on
  // element.animate; this shim is an animation that finishes at once, so the
  // outro — which closes the dialog and reports `onclose` — completes.
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
  }
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

// The outro ends on the shim's next microtask; give it a couple of flushes.
async function settled() {
  await tick();
  await Promise.resolve();
  await tick();
}

describe("Modal", () => {
  it("renders children when open", () => {
    const { getByText } = render(Modal, { open: true, children: body() });
    expect(getByText("Modal body")).toBeTruthy();
  });

  it("shows the native dialog with the sheet already mounted inside it", () => {
    const { container } = render(Modal, { open: true, children: body() });
    const dialog = container.querySelector("dialog")!;
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(dialog.querySelector("[data-backdrop] p")?.textContent).toBe("Modal body");
  });

  it("calls onclose when close button is clicked, after the exit has run", async () => {
    const onclose = vi.fn();
    const { getByLabelText, container } = render(Modal, {
      open: true,
      onclose,
      children: body(),
    });

    await fireEvent.click(getByLabelText("Close"));
    await settled();
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  });

  it("closes on backdrop click (the dim behind the sheet, not the sheet)", async () => {
    const onclose = vi.fn();
    const { container } = render(Modal, {
      open: true,
      onclose,
      children: body(),
    });

    await fireEvent.click(container.querySelector("[data-backdrop]")!);
    await settled();
    expect(onclose).toHaveBeenCalled();
  });

  it("does not close when clicking the inner content", async () => {
    const onclose = vi.fn();
    const { getByText } = render(Modal, {
      open: true,
      onclose,
      children: body(),
    });

    await fireEvent.click(getByText("Modal body"));
    await settled();
    expect(onclose).not.toHaveBeenCalled();
  });

  it("takes Escape through the exit instead of the native close", async () => {
    const onclose = vi.fn();
    const { container } = render(Modal, { open: true, onclose, children: body() });
    const dialog = container.querySelector("dialog")!;
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    await settled();
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it("draws an edge when the sheet has more content below its fold", async () => {
    // The sheet is max-h-[90vh] overflow-y-auto, so a tall form scrolls —
    // but silently. At 1440x600 the contact form's submit button was sliced
    // in half by the sheet's bottom edge; at 320x568 it was below the clip
    // entirely, with the panel ending flush under the message field.
    const { container } = render(Modal, { props: { open: true, children: body() } });
    const sheet = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    const cue = () => container.querySelector(".sticky");
    expect(cue()).toBeNull();

    Object.defineProperty(sheet, "scrollHeight", { value: 900, configurable: true });
    Object.defineProperty(sheet, "clientHeight", { value: 500, configurable: true });
    await fireEvent.scroll(sheet);
    expect(cue()).not.toBeNull();
    expect(cue()?.getAttribute("aria-hidden")).toBe("true");

    // Scrolled to the end, there is nothing left to point at.
    Object.defineProperty(sheet, "scrollTop", { value: 400, configurable: true });
    await fireEvent.scroll(sheet);
    expect(cue()).toBeNull();
  });

  it("catches focus when the native restore has nothing to give it back to", async () => {
    // The contact modal opens from a CANCELLED navigation, and the link that
    // started it is usually gone by the time it closes (the nav menu closes
    // and unmounts its own entries) — so the dialog returns focus to nowhere
    // and the visitor lands on <body>.
    const back = document.createElement("button");
    document.body.append(back);
    const { getByLabelText } = render(Modal, {
      open: true,
      children: body(),
      restoreFocus: () => back,
    });
    await fireEvent.click(getByLabelText("Close"));
    await settled();
    expect(document.activeElement).toBe(back);
    back.remove();
  });

  it("leaves focus alone when the native restore already placed it", async () => {
    const back = document.createElement("button");
    const elsewhere = document.createElement("button");
    document.body.append(back, elsewhere);
    const { getByLabelText } = render(Modal, {
      open: true,
      children: body(),
      restoreFocus: () => back,
    });
    await fireEvent.click(getByLabelText("Close"));
    elsewhere.focus();
    await settled();
    expect(document.activeElement).toBe(elsewhere);
    back.remove();
    elsewhere.remove();
  });
});
