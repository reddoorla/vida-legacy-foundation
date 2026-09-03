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
});
