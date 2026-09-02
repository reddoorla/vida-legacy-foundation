<script lang="ts">
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import ContentBand from "$lib/components/ContentBand.svelte";
  import { PrismicLink } from "@prismicio/svelte";
  import { isFilled, type Content } from "@prismicio/client";
  import { untrack } from "svelte";
  import { DEFAULT_LANG, type Lang } from "$lib/locale";

  type Props = {
    slice: Content.DonationFormSlice;
    /** SliceZone context from the page loader: the document's locale picks
     *  the language of the field labels. Absent (the fixtures, the slice
     *  simulator) → English. */
    context?: { lang?: Lang };
  };
  let { slice, context }: Props = $props();
  const lang = $derived(context?.lang ?? DEFAULT_LANG);

  // The field labels live in code, not in the slice model — the same split as
  // the contact page. They belong to the field SET, which is the payload the
  // handler will receive once one is wired (LGL's own form has exactly these
  // fields); the author's copy is the section around the form. Both
  // languages ship here because the Spanish document is the same slice with
  // the same fields, and the copy is Vilma's (content/es-website-content.txt,
  // "Página de donación").
  const COPY = {
    en: {
      formHeading: "Contact information",
      name: "Name",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      emailHint: "email@example.com",
      address: "Address",
      address1: "Address line 1",
      address2: "Address line 2",
      city: "City",
      state: "State/province",
      zip: "Zip/postal code",
      phone: "Phone",
      phoneHint: "000-000-0000",
      amount: "Amount",
      otherAmount: "Other amount",
      enterAmount: "Enter amount",
      schedule: "Donation schedule",
      schedules: [
        ["once", "One time"],
        ["monthly", "Monthly"],
        ["quarterly", "Quarterly"],
        ["annually", "Annually"],
      ],
      required: "(required)",
      submit: "enter payment information",
      pending: "Online payments are not connected yet. Please use PayPal for now.",
    },
    es: {
      formHeading: "Información de contacto",
      name: "Nombre",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo electrónico",
      emailHint: "correo@ejemplo.com",
      address: "Dirección",
      address1: "Dirección línea 1",
      address2: "Dirección línea 2",
      city: "Ciudad",
      state: "Estado o provincia",
      zip: "Código postal",
      phone: "Teléfono",
      phoneHint: "000-000-0000",
      amount: "Cantidad",
      otherAmount: "Otra cantidad",
      enterAmount: "Ingrese cantidad",
      schedule: "Frecuencia de la donación",
      schedules: [
        ["once", "Una sola vez"],
        ["monthly", "Mensual"],
        ["quarterly", "Trimestral"],
        ["annually", "Anual"],
      ],
      required: "(obligatorio)",
      submit: "ingresar información de pago",
      pending: "Los pagos en línea aún no están disponibles. Por ahora, utilice PayPal.",
    },
  } as const;
  const copy = $derived(COPY[lang]);

  const uid = $props.id();
  const id = (name: string) => `${uid}-${name}`;

  const presets = $derived(
    (slice.items ?? [])
      .map((item) => Number(item.amount))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
  // Which amount row is picked: a preset's value, or "custom" for the
  // write-in. The comp shows the first preset selected — the INITIAL preset,
  // read once: the donor's pick must not be reset by a later prop update.
  let choice = $state(untrack(() => (presets.length ? String(presets[0]) : "custom")));
  let customAmount = $state("");
  let submitted = $state(false);

  const hasHeading = $derived(!!slice.primary.heading);
  const hasPaypal = $derived(
    isFilled.link(slice.primary.paypal_link) && !!slice.primary.paypal_label,
  );
  const hasFormLink = $derived(
    isFilled.link(slice.primary.form_link) && !!slice.primary.form_label,
  );
  // The on-page form is opt-in and ships OFF: until it has a backend, the
  // page links out to the hosted form and PayPal instead. Flipping the
  // Boolean in Prismic is the whole switch — no code follows.
  const showForm = $derived(slice.primary.show_form === true);

  // The design's button couple on cream — #9cbf5b + #263b02, 5.86:1. The
  // arrow is the comp's own glyph in the dark green (static/icons/
  // arrow-right-dark.svg): the green one PersonGrid uses would vanish here.
  const pill =
    "bg-green text-green-btn font-button inline-flex h-10 w-fit items-center justify-center gap-2.5 rounded-full px-3.75 text-[10px] tracking-[1px] uppercase";

  // No handler is wired yet (see the comment on the form). A submit stays on
  // the page and says so — rather than what a handler-less form does on its
  // own, which is a GET navigation that writes the donor's details into the
  // URL.
  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    submitted = true;
  }
</script>

<!--
  Figma 5328:1611 — the Donation page: "Value Prop #1" (the heading and the
  intro column) beside the "Bio Only" card, which is the form. This one slice
  IS the page — the comp has no masthead — so its heading is the h1.

  The card is StatementPanel's panel: the page's own cream under the grain at
  25% mix-blend-difference, no border, no shadow. Contrast measured on
  #fdf5e8:
    #263b02 labels, values, headings   11.35:1
    placeholders — the comp sets them in #527e01 at 10px, 4.47:1, the one
      place the design misses AA; they use --color-green-mid-aa (4.65) like
      every other small green on cream
    select border #527e01 — a component boundary needs 3:1; 4.47 clears it
    buttons — the design's couple, #9cbf5b + #263b02, 5.86:1

  THE BACKEND IS NOT WIRED, so the form ships behind `show_form`, off: the
  page links out to the hosted form and PayPal until a handler exists (the
  options are in CLAUDE.md). With it on, this is the comp's front end: native validation,
  and a submit stays on the page with a status line pointing at PayPal. The
  field names are the payload keys for the eventual handler. The comp's
  reCAPTCHA belongs to that handler and is not drawn.
-->
<ContentBand
  sliceType={slice.slice_type}
  variation={slice.variation}
  sectionClass="bg-background"
  contentClass="max-w-[1440px] px-6 pt-20 pb-10 md:px-20 md:pt-30 md:pb-15"
>
  {#if hasHeading}
    <h1 class="donation-heading text-green-btn font-heading leading-[1.35] md:ml-auto md:w-[74.4%]">
      {slice.primary.heading}
    </h1>
  {/if}

  {#if !showForm}
    <!-- Links out — the interim page while the form has no backend: the
         comp's eyebrow and intro, then the hosted form and PayPal as two
         buttons, in the column the form card would occupy (the CtaBanner
         onCream idiom: a statement and its buttons, right-aligned). -->
    <div
      class="text-green-btn flex flex-col items-start gap-5 md:ml-auto md:w-[74.4%] {hasHeading
        ? 'mt-15 md:mt-25'
        : ''}"
    >
      {#if slice.primary.eyebrow}
        <h2 class="font-heading text-lg font-normal tracking-[1.5px] uppercase">
          {slice.primary.eyebrow}
        </h2>
      {/if}
      {#if isFilled.richText(slice.primary.body)}
        <div class="richtext-block max-w-[578px] text-base leading-6">
          <RichTextBody field={slice.primary.body} />
        </div>
      {/if}
      {#if hasFormLink || hasPaypal}
        <div class="flex flex-wrap gap-2.5">
          {#if hasFormLink}
            <PrismicLink field={slice.primary.form_link} class={pill}>
              {slice.primary.form_label}
              <img
                src="/icons/arrow-right-dark.svg"
                alt=""
                aria-hidden="true"
                class="h-3.5 w-2.5 -rotate-90"
              />
            </PrismicLink>
          {/if}
          {#if hasPaypal}
            <PrismicLink field={slice.primary.paypal_link} class={pill}>
              {slice.primary.paypal_label}
              <img
                src="/icons/arrow-right-dark.svg"
                alt=""
                aria-hidden="true"
                class="h-3.5 w-2.5 -rotate-90"
              />
            </PrismicLink>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="flex flex-col gap-[30px] md:flex-row md:items-start {hasHeading
        ? 'mt-15 md:mt-25'
        : ''}"
    >
      <div class="text-green-btn flex flex-col gap-5 md:w-[297.5px] md:shrink-0 md:py-5">
        {#if slice.primary.eyebrow}
          <h2 class="font-heading text-lg font-normal tracking-[1.5px] uppercase">
            {slice.primary.eyebrow}
          </h2>
        {/if}
        {#if isFilled.richText(slice.primary.body)}
          <div class="richtext-block text-base leading-6">
            <RichTextBody field={slice.primary.body} />
          </div>
        {/if}
        {#if hasPaypal}
          <PrismicLink field={slice.primary.paypal_link} class={pill}>
            {slice.primary.paypal_label}
            <img
              src="/icons/arrow-right-dark.svg"
              alt=""
              aria-hidden="true"
              class="h-3.5 w-2.5 -rotate-90"
            />
          </PrismicLink>
        {/if}
      </div>

      <form
        class="panel relative min-w-0 flex-1 overflow-hidden rounded-[20px] p-6 md:p-10"
        aria-labelledby={id("form-heading")}
        {onsubmit}
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 mix-blend-difference"
          style="background-image: url('/texture-grain.webp')"
        ></div>

        <div class="text-green-btn relative flex flex-col gap-[30px]">
          <h2
            id={id("form-heading")}
            class="font-heading text-lg font-normal tracking-[1.5px] uppercase"
          >
            {slice.primary.form_heading || copy.formHeading}
          </h2>

          <fieldset class="flex min-w-0 flex-col gap-[5px]">
            <legend class="label mb-[5px] p-0">
              {copy.name}<span aria-hidden="true">*</span><span class="sr-only">
                {copy.required}</span
              >
            </legend>
            <div class="flex flex-col gap-[5px] md:flex-row md:gap-[30px]">
              <div class="min-w-0 flex-1">
                <label class="sr-only" for={id("first-name")}>{copy.firstName}</label>
                <input
                  class="field"
                  id={id("first-name")}
                  name="first_name"
                  type="text"
                  autocomplete="given-name"
                  required
                  placeholder={copy.firstName}
                />
              </div>
              <div class="min-w-0 flex-1">
                <label class="sr-only" for={id("last-name")}>{copy.lastName}</label>
                <input
                  class="field"
                  id={id("last-name")}
                  name="last_name"
                  type="text"
                  autocomplete="family-name"
                  required
                  placeholder={copy.lastName}
                />
              </div>
            </div>
          </fieldset>

          <div class="flex flex-col gap-[5px]">
            <label class="label" for={id("email")}>
              {copy.email}<span aria-hidden="true">*</span><span class="sr-only">
                {copy.required}</span
              >
            </label>
            <input
              class="field"
              id={id("email")}
              name="email"
              type="email"
              autocomplete="email"
              required
              placeholder={copy.emailHint}
            />
          </div>

          <fieldset class="flex min-w-0 flex-col gap-[5px]">
            <legend class="label mb-[5px] p-0">{copy.address}</legend>
            <div>
              <label class="sr-only" for={id("address-1")}>{copy.address1}</label>
              <input
                class="field"
                id={id("address-1")}
                name="address_line1"
                type="text"
                autocomplete="address-line1"
                placeholder={copy.address1}
              />
            </div>
            <div>
              <label class="sr-only" for={id("address-2")}>{copy.address2}</label>
              <input
                class="field"
                id={id("address-2")}
                name="address_line2"
                type="text"
                autocomplete="address-line2"
                placeholder={copy.address2}
              />
            </div>
            <div class="flex flex-col gap-[5px] md:flex-row md:gap-[30px]">
              <div class="min-w-0 flex-1">
                <label class="sr-only" for={id("city")}>{copy.city}</label>
                <input
                  class="field"
                  id={id("city")}
                  name="city"
                  type="text"
                  autocomplete="address-level2"
                  placeholder={copy.city}
                />
              </div>
              <div class="min-w-0 flex-1">
                <label class="sr-only" for={id("state")}>{copy.state}</label>
                <input
                  class="field"
                  id={id("state")}
                  name="state"
                  type="text"
                  autocomplete="address-level1"
                  placeholder={copy.state}
                />
              </div>
              <div class="min-w-0 flex-1">
                <label class="sr-only" for={id("zip")}>{copy.zip}</label>
                <input
                  class="field"
                  id={id("zip")}
                  name="postal_code"
                  type="text"
                  autocomplete="postal-code"
                  placeholder={copy.zip}
                />
              </div>
            </div>
          </fieldset>

          <div class="flex flex-col gap-[5px]">
            <label class="label" for={id("phone")}>{copy.phone}</label>
            <input
              class="field"
              id={id("phone")}
              name="phone"
              type="tel"
              autocomplete="tel"
              placeholder={copy.phoneHint}
            />
          </div>

          <fieldset class="flex min-w-0 flex-col">
            <legend class="label mb-[5px] p-0">{copy.amount}</legend>
            {#each presets as amount (amount)}
              <label class="label flex w-fit items-center gap-2.5 py-[5px]">
                <input
                  class="radio"
                  type="radio"
                  name="amount"
                  value={String(amount)}
                  bind:group={choice}
                />
                ${amount}
              </label>
            {/each}
            <div class="flex items-center gap-2.5 py-[5px]">
              <input
                class="radio"
                type="radio"
                name="amount"
                value="custom"
                bind:group={choice}
                aria-label={copy.otherAmount}
              />
              <label class="sr-only" for={id("custom-amount")}>{copy.enterAmount}</label>
              <!-- Focusing the write-in picks its radio, so a donor who types an
                 amount never has to notice the radio at all. -->
              <input
                class="field field-inline"
                id={id("custom-amount")}
                name="custom_amount"
                type="text"
                inputmode="decimal"
                placeholder={copy.enterAmount}
                bind:value={customAmount}
                onfocus={() => (choice = "custom")}
              />
            </div>
          </fieldset>

          <div class="flex flex-col items-start gap-[5px] pb-2.5">
            <label class="label" for={id("schedule")}>{copy.schedule}</label>
            <select class="select" id={id("schedule")} name="schedule">
              {#each copy.schedules as [value, label] (value)}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>

          <div class="flex flex-col items-start gap-5">
            <button type="submit" class="{pill} cursor-pointer">
              {slice.primary.submit_label || copy.submit}
              <img
                src="/icons/arrow-right-dark.svg"
                alt=""
                aria-hidden="true"
                class="h-3.5 w-2.5 -rotate-90"
              />
            </button>
            <!-- Always in the DOM: a live region announces only text that
               changes INSIDE it, not a region that appears with its text. -->
            <p role="status" class="text-base leading-6 {submitted ? '' : 'sr-only'}">
              {submitted ? copy.pending : ""}
            </p>
          </div>
        </div>
      </form>
    </div>
  {/if}
</ContentBand>

<style>
  /* The page title, at the display scale the comps set every page heading. */
  .donation-heading {
    font-size: clamp(2rem, 4.17vw, 3.75rem);
    font-weight: 300;
  }

  .panel {
    background-color: var(--color-background);
  }

  /* The comp's field label: Pragmatica Extended Book 10/1.5, tracked 1.5px. */
  .label {
    font-family: var(--font-heading);
    font-size: 10px;
    line-height: 1.5;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* An underlined field. The typed value is two points larger than the
     placeholder and not tracked or uppercased — a name or an e-mail address
     is not a label — on a fixed line height so the row does not jump when
     typing starts. */
  .field {
    width: 100%;
    min-width: 0;
    border: 0;
    border-bottom: 1px solid var(--color-green-btn);
    border-radius: 0;
    background: transparent;
    padding: 10px 0;
    font-family: var(--font-heading);
    font-size: 12px;
    line-height: 15px;
    color: var(--color-green-btn);
  }
  .field::placeholder {
    color: var(--color-green-mid-aa);
    opacity: 1;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  /* The write-in amount: the comp's 255px underline, not the row. Sized
     here because the scoped .field width outranks a utility class. */
  .field-inline {
    width: 255px;
    max-width: 100%;
    padding: 0 0 4px;
  }
  .field:focus-visible {
    outline: 2px solid var(--color-green-btn);
    outline-offset: 4px;
    border-radius: 2px;
  }

  /* The comp's radio: an 18px cream disc with a hairline, a 13px dot when
     checked. A real <input type="radio"> so keyboard and screen readers get
     the native control; only its paint is replaced. */
  .radio {
    appearance: none;
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    border: 0.5px solid var(--color-green-btn);
    background-color: var(--color-cream);
  }
  .radio:checked {
    background-image: radial-gradient(circle, var(--color-green-btn) 6.4px, transparent 6.9px);
  }
  .radio:focus-visible,
  .select:focus-visible {
    outline: 2px solid var(--color-green-btn);
    outline-offset: 3px;
  }

  /* The schedule dropdown (Figma 5345:1469), with the comp's own chevron
     from static/icons. The width follows the longest option rather than the
     comp's fixed 100px, which "Quarterly" and "Trimestral" overflow. */
  .select {
    appearance: none;
    min-width: 100px;
    border: 1px solid var(--color-green-mid);
    border-radius: 2px;
    padding: 5px 22px 5px 5px;
    background: transparent url("/icons/chevron-down.svg") no-repeat right 5px center / 12px 12px;
    font-family: var(--font-heading);
    font-size: 10px;
    line-height: 1.5;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--color-green-btn);
  }
</style>
