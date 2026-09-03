import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { Content } from "@prismicio/client";
import DonationForm from "./index.svelte";

const make = (primary: Record<string, unknown> = {}, items?: unknown[]) =>
  ({
    slice_type: "donation_form",
    variation: "default",
    primary: {
      heading: "Make a Donation",
      eyebrow: "help that lasts",
      body: [{ type: "paragraph", text: "Your contribution allows us to help.", spans: [] }],
      paypal_label: "use paypal",
      paypal_link: {
        link_type: "Web",
        url: "https://www.paypal.com/donate/?hosted_button_id=X",
        target: "_blank",
      },
      form_label: "donate online",
      form_link: {
        link_type: "Web",
        url: "https://secure.lglforms.com/form_engine/s/1DAy4mOf7OlVR4Ke-4h2gA",
      },
      // The suite exercises the form; the links-only default has its own test.
      show_form: true,
      form_heading: "Contact information",
      submit_label: "enter payment information",
      ...primary,
    },
    items: items ?? [{ amount: 100 }, { amount: 50 }, { amount: 25 }],
  }) as unknown as Content.DonationFormSlice;

// Queries are scoped to `container`: this suite has no auto-cleanup between
// renders, so an unscoped query sees every earlier test's DOM too.
describe("DonationForm slice", () => {
  it("sets slice data attributes", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const section = container.querySelector("[data-slice-type='donation_form']");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");
  });

  it("renders the page title as the h1 — this slice is the whole page", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    expect(container.querySelector("h1")?.textContent?.trim()).toBe("Make a Donation");
    const h2s = [...container.querySelectorAll("h2")].map((h) => h.textContent?.trim());
    expect(h2s).toEqual(["help that lasts", "Contact information"]);
  });

  it("drops the h1 when no heading is authored", () => {
    const { container } = render(DonationForm, { props: { slice: make({ heading: "" }) } });
    expect(container.querySelector("h1")).toBeNull();
  });

  it("names the form after its heading", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const form = container.querySelector("form")!;
    const labelledBy = form.getAttribute("aria-labelledby")!;
    expect(container.querySelector(`#${CSS.escape(labelledBy)}`)?.textContent?.trim()).toBe(
      "Contact information",
    );
  });

  it("labels every control, visibly or for screen readers", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const controls = [...container.querySelectorAll("form input, form select")];
    // 9 text-ish fields, 4 amount radios, the write-in, the schedule select.
    expect(controls.length).toBe(15);
    for (const el of controls) {
      const byFor = el.id && container.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      const wrapped = el.closest("label");
      const named = byFor || wrapped || el.getAttribute("aria-label");
      expect(named, `${el.getAttribute("name")} has no label`).toBeTruthy();
    }
  });

  it("sends the payload keys the eventual handler will read", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const names = [...container.querySelectorAll("form [name]")].map((el) =>
      el.getAttribute("name"),
    );
    expect(new Set(names)).toEqual(
      new Set([
        "first_name",
        "last_name",
        "email",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "phone",
        "amount",
        "custom_amount",
        "schedule",
      ]),
    );
  });

  it("selects the first preset, and the write-in takes over on focus", async () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const radios = [...container.querySelectorAll<HTMLInputElement>("input[name='amount']")];
    expect(radios.map((r) => r.value)).toEqual(["100", "50", "25", "custom"]);
    expect(radios[0].checked).toBe(true);
    await fireEvent.focus(container.querySelector("input[name='custom_amount']")!);
    expect(radios[3].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
  });

  it("offers the comp's four schedules", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const options = [...container.querySelectorAll("select[name='schedule'] option")];
    expect(options.map((o) => o.textContent)).toEqual([
      "One time",
      "Monthly",
      "Quarterly",
      "Annually",
    ]);
  });

  it("keeps a submit on the page and says the backend is pending", async () => {
    // No handler is wired. Left alone, a handler-less form GET-navigates with
    // the donor's details in the URL; the slice must swallow the submit and
    // tell the donor where to go instead.
    const { container } = render(DonationForm, { props: { slice: make() } });
    const status = container.querySelector("[role='status']")!;
    expect(status.textContent?.trim()).toBe("");
    // The form validates before it does anything else, so it needs something
    // to submit.
    for (const [name, value] of [
      ["first_name", "Ada"],
      ["last_name", "Lovelace"],
      ["email", "ada@example.com"],
    ] as const) {
      await fireEvent.input(container.querySelector<HTMLInputElement>(`[name='${name}']`)!, {
        target: { value },
      });
    }
    const event = new Event("submit", { bubbles: true, cancelable: true });
    await fireEvent(container.querySelector("form")!, event);
    expect(event.defaultPrevented).toBe(true);
    expect(status.textContent).toContain("PayPal");
    expect(status.className).not.toContain("sr-only");
  });

  it("labels the fields in Spanish for an es document", () => {
    const { container } = render(DonationForm, {
      props: { slice: make(), context: { lang: "es" } },
    });
    expect(container.querySelector("legend")?.textContent).toContain("Nombre");
    expect(container.querySelector("select option")?.textContent).toBe("Una sola vez");
    expect(container.querySelector("input[name='email']")?.getAttribute("placeholder")).toBe(
      "correo@ejemplo.com",
    );
  });

  it("renders the PayPal link with the arrow and the field's target", () => {
    const { container } = render(DonationForm, { props: { slice: make() } });
    const link = container.querySelector("a[href^='https://www.paypal.com']")!;
    expect(link.textContent).toContain("use paypal");
    expect(link.getAttribute("target")).toBe("_blank");
    const arrow = link.querySelector("img");
    expect(arrow?.getAttribute("aria-hidden")).toBe("true");
    // The dark glyph: the site's green arrow is invisible on the green pill.
    expect(arrow?.getAttribute("src")).toBe("/icons/arrow-right-dark.svg");
  });

  it("links out by default: no form, the hosted form and PayPal as buttons", () => {
    // show_form ships false (the model default) and an older document has no
    // such field at all — both must land on the links, never on a form with
    // nothing behind it.
    for (const primary of [{ show_form: false }, { show_form: undefined }]) {
      const { container } = render(DonationForm, { props: { slice: make(primary) } });
      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelector("h1")?.textContent?.trim()).toBe("Make a Donation");
      const links = [...container.querySelectorAll("a")].map((a) => [
        a.textContent?.trim(),
        a.getAttribute("href"),
      ]);
      expect(links).toEqual([
        ["donate online", "https://secure.lglforms.com/form_engine/s/1DAy4mOf7OlVR4Ke-4h2gA"],
        ["use paypal", "https://www.paypal.com/donate/?hosted_button_id=X"],
      ]);
    }
  });

  it("reads presets the editor stored as strings", () => {
    // Prismic's editor shape holds Number fields as strings until publish
    // (the CLAUDE.md trap); the API is meant to coerce, but a string must
    // not silently empty the amount list.
    const { container } = render(DonationForm, {
      props: { slice: make({}, [{ amount: "100" }, { amount: "50" }]) },
    });
    const radios = [...container.querySelectorAll<HTMLInputElement>("input[name='amount']")];
    expect(radios.map((r) => r.value)).toEqual(["100", "50", "custom"]);
  });

  it("draws only the write-in when no presets are authored", () => {
    const { container } = render(DonationForm, { props: { slice: make({}, []) } });
    const radios = [...container.querySelectorAll<HTMLInputElement>("input[name='amount']")];
    expect(radios.map((r) => r.value)).toEqual(["custom"]);
    expect(radios[0].checked).toBe(true);
  });

  it("reports its own field messages, in the page's language", async () => {
    // Native constraint validation speaks the BROWSER's language and puts the
    // message in a transient bubble that is not in the accessibility tree as
    // an error. The page writes them instead.
    const { container } = render(DonationForm, {
      props: { slice: make(), context: { lang: "es" } },
    });
    await fireEvent(
      container.querySelector("form")!,
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    const alerts = [...container.querySelectorAll("[role='alert']")];
    expect(alerts.length).toBe(3);
    expect(alerts[0].textContent?.trim()).toBe("Por favor, complete este campo.");
    const first = container.querySelector<HTMLInputElement>("[name='first_name']")!;
    expect(first.getAttribute("aria-invalid")).toBe("true");
    expect(first.getAttribute("aria-describedby")).toBe(alerts[0].id);
    // And it clears the moment the field is put right.
    await fireEvent.input(first, { target: { value: "Ada" } });
    expect(container.querySelectorAll("[role='alert']").length).toBe(2);
  });
});
