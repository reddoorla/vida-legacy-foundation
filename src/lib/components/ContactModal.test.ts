import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contactModal } from "$lib/contact-modal.svelte";

// `use:enhance` would run a real fetch to /contact, which jsdom cannot serve,
// so the SUBMIT RESULT is the thing under test: this stand-in captures the
// callback the component returns from its enhance handler, and a test hands
// it the exact `result` shape the action produces — fail(502, { error }) and
// friends — then asserts what the visitor sees. Hoisted above the component
// import, hence the import-after-mock ordering below (the fleet's
// AppointmentModal.test.ts pattern).
let submitResult: ((arg: unknown) => Promise<void>) | null = null;
vi.mock("$app/forms", () => ({
  enhance: (form: HTMLFormElement, submitFn: (arg: unknown) => unknown) => {
    const onSubmit = async (e: Event) => {
      e.preventDefault();
      submitResult = (await submitFn({
        formElement: form,
        formData: new FormData(form),
        action: new URL("http://localhost/contact"),
        cancel: () => {},
        submitter: null,
      })) as (arg: unknown) => Promise<void>;
    };
    form.addEventListener("submit", onSubmit);
    return { destroy: () => form.removeEventListener("submit", onSubmit) };
  },
}));
// TurnstileWidget reads $env/dynamic/public at module scope; no sitekey → it
// renders nothing here.
vi.mock("$env/dynamic/public", () => ({ env: {} }));

const ContactModal = (await import("./ContactModal.svelte")).default;

afterEach(() => cleanup());

beforeEach(() => {
  contactModal.open = false;
  submitResult = null;
  // jsdom has no Web Animations API; Svelte 5 transitions (the alert's
  // in:slide / in:fade) need element.animate. Same shim PreNavTransition.test
  // uses: an animation that is already finished.
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(
      () =>
        ({
          finished: Promise.resolve(),
          cancel() {},
          pause() {},
          play() {},
          onfinish: null,
          oncancel: null,
          currentTime: 0,
          playState: "finished",
        }) as unknown as Animation,
    );
  }
  // jsdom < v26: the native <dialog> methods Modal drives.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

async function open() {
  contactModal.open = true;
  await tick();
}

describe("ContactModal", () => {
  it("is a closed dialog until opened, named by its heading", async () => {
    const { container } = render(ContactModal);
    const dialog = container.querySelector("dialog")!;
    expect(dialog.hasAttribute("open")).toBe(false);
    await open();
    expect(dialog.hasAttribute("open")).toBe(true);
    const heading = container.querySelector(
      `#${CSS.escape(dialog.getAttribute("aria-labelledby")!)}`,
    );
    expect(heading?.tagName).toBe("H2");
    expect(heading?.textContent?.trim()).toBe("Contact us");
  });

  it("posts to the contact route's action, in the page's locale", async () => {
    const en = render(ContactModal);
    await open();
    expect(en.container.querySelector("form")?.getAttribute("action")).toBe("/contact");
    cleanup();
    contactModal.open = false;
    const es = render(ContactModal, { props: { lang: "es" } });
    await open();
    const form = es.container.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("/es/contact");
    expect(es.container.querySelector("h2")?.textContent?.trim()).toBe("Contáctenos");
    expect(form.querySelector("label[for$='-name']")?.textContent).toContain("Nombre");
  });

  it("labels every field and carries the anti-bot contract", async () => {
    const { container } = render(ContactModal);
    await open();
    const form = container.querySelector("form")!;
    for (const name of ["name", "email", "phone", "message"]) {
      const el = form.querySelector(`[name='${name}']`)!;
      expect(form.querySelector(`label[for='${CSS.escape(el.id)}']`), name).not.toBeNull();
    }
    // The timing stamp is open-time, not zero: a layout-mounted modal has no
    // server load to plant one.
    expect(Number(form.querySelector("input[name='ts']")?.getAttribute("value"))).toBeGreaterThan(
      0,
    );
    expect(form.querySelector("input[name='bot-field']")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the confirmation and moves focus to it on success", async () => {
    const { container } = render(ContactModal);
    await open();
    container.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(submitResult).not.toBeNull();
    await submitResult!({ result: { type: "success", status: 200, data: { success: true } } });
    await tick();
    const status = container.querySelector("[role='status']")!;
    expect(status.textContent).toContain("on its way");
    expect(document.activeElement).toBe(status);
    expect(container.querySelector("form")).toBeNull();
  });

  it("shows the action's own failure copy and keeps what was typed", async () => {
    const { container } = render(ContactModal);
    await open();
    const nameInput = container.querySelector<HTMLInputElement>("input[name='name']")!;
    nameInput.value = "Ada";
    nameInput.dispatchEvent(new Event("input"));
    container.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    await submitResult!({
      result: { type: "failure", status: 502, data: { error: "The inbox is down." } },
    });
    await tick();
    const alert = container.querySelector("[role='alert']")!;
    expect(alert.textContent).toContain("The inbox is down.");
    // The footer's phone number is the escape hatch.
    expect(alert.querySelector("a[href^='tel:']")?.textContent).toBe("726-234-6910");
    expect(container.querySelector<HTMLInputElement>("input[name='name']")?.value).toBe("Ada");
  });

  it("falls back to its own copy when the failure carries none", async () => {
    const { container } = render(ContactModal);
    await open();
    container.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    await submitResult!({ result: { type: "error", error: new Error("network") } });
    await tick();
    expect(container.querySelector("[role='alert']")?.textContent).toContain(
      "Something went wrong",
    );
  });

  it("renders the panel in-flow for the contact page and the fixtures", () => {
    const { container } = render(ContactModal, {
      props: { inline: true, headingLevel: 1, ts: 1234, result: { success: true } },
    });
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector("h1")?.textContent?.trim()).toBe("Contact us");
    // A no-JS post already answered success: the page shows the confirmation.
    expect(container.querySelector("[role='status']")?.textContent).toContain("on its way");
  });
});
