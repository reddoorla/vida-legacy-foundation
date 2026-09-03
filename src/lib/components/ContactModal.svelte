<script lang="ts">
  import { enhance } from "$app/forms";
  import Modal from "$lib/components/Modal.svelte";
  import TurnstileWidget from "$lib/components/TurnstileWidget.svelte";
  import { contactModal } from "$lib/contact-modal.svelte";
  import { DEFAULT_LANG, localizePath, type Lang } from "$lib/locale";
  import { ui } from "$lib/ui-copy";
  import { loadSiteConfig } from "$lib/site-config";
  import { fade, slide } from "$lib/transitions";
  import { untrack } from "svelte";

  type Props = {
    lang?: Lang;
    /** Render the panel in the page flow instead of inside the dialog: the
     *  contact route (the no-JS fallback) and the a11y fixtures, where the
     *  real dialog is not in the DOM until opened. */
    inline?: boolean;
    /** The panel heading's level: h2 inside the dialog and on the fixtures
     *  page, h1 when the panel IS the contact page. */
    headingLevel?: 1 | 2;
    /** The contact route's per-request timing token. The dialog stamps its
     *  own at open time instead — a layout-mounted modal has no server load. */
    ts?: number;
    /** What the action answered on a full-page (no-JS) post, from the route's
     *  `form` prop. */
    result?: { success?: boolean; error?: string } | null;
  };
  let {
    lang = DEFAULT_LANG,
    inline = false,
    headingLevel = 2,
    ts,
    result = null,
  }: Props = $props();

  // The contact page's copy, both locales; field NAMES stay English — they
  // are the ingest payload keys the route's action reads.
  const COPY = {
    en: {
      heading: "Contact us",
      lede: "Send us a message and we'll get back to you.",
      success: "Thanks — your message is on its way. We'll be in touch soon.",
      error: "Something went wrong sending your message. Please try again.",
      call: "You can also call us at",
      name: "Name",
      email: "Email",
      phone: "Phone",
      message: "Message",
      send: "Send message",
      sending: "Sending…",
      required: "(required)",
    },
    es: {
      heading: "Contáctenos",
      lede: "Envíenos un mensaje y nos pondremos en contacto con usted.",
      success: "Gracias, su mensaje va en camino. Nos comunicaremos pronto.",
      error: "Algo salió mal al enviar su mensaje. Por favor, inténtelo de nuevo.",
      call: "También puede llamarnos al",
      name: "Nombre",
      email: "Correo electrónico",
      phone: "Teléfono",
      message: "Mensaje",
      send: "Enviar mensaje",
      sending: "Enviando…",
      required: "(obligatorio)",
    },
  } as const;
  const copy = $derived(COPY[lang]);

  // The phone number the footer already carries, so it is written once.
  const phone = $derived.by(() => {
    for (const col of loadSiteConfig(lang).footer.columns ?? [])
      for (const item of col.items)
        if ("text" in item && item.href?.startsWith("tel:"))
          return { display: item.text, href: item.href };
    return null;
  });

  // The form posts to the contact route's own action, in the page's locale;
  // from the dialog that is a cross-route post handled by `enhance` without a
  // navigation, and without JavaScript the same route renders this panel.
  const action = $derived(localizePath("/contact", lang));

  const uid = $props.id();
  const headingId = `${uid}-heading`;
  const id = (name: string) => `${uid}-${name}`;

  // `result` and `ts` are read once: they describe the request that rendered
  // this page, and a later prop change must not wipe what the visitor did.
  let submitted = $state(untrack(() => result?.success === true));
  let submitting = $state(false);
  let errorMessage = $state(untrack(() => result?.error ?? ""));
  let name = $state("");
  let email = $state("");
  let phoneValue = $state("");
  let message = $state("");

  // The timing screen (createIngestAction) needs a fill window measured
  // from a stamp the visitor could not have forged ahead of time: the route
  // supplies one per request; the dialog stamps open-time, which is the
  // same thing for a modal that only exists once it is opened.
  let openedAt = $state(untrack(() => ts ?? 0));
  $effect(() => {
    if (inline) return;
    if (contactModal.open) {
      openedAt = Date.now();
      submitted = false;
      submitting = false;
      errorMessage = "";
      name = "";
      email = "";
      phoneValue = "";
      message = "";
    }
  });

  // Focus follows the outcome. The confirmation replaces the submit button
  // that had focus, which would otherwise drop a keyboard user at <body>; the
  // failure alert may sit above the fold of the panel's own scroll box.
  let confirmationEl = $state<HTMLElement | null>(null);
  $effect(() => {
    if (submitted) confirmationEl?.focus();
  });
  let alertEl = $state<HTMLElement | null>(null);
  $effect(() => {
    if (!errorMessage) return;
    alertEl?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
  });
</script>

<!--
  The site-wide contact form, in the donation page's vocabulary (app.css
  .vlf-*): the textured cream panel, the H4-scale heading, underlined fields
  with the -aa green placeholders, the green pill with the comp's dark arrow.
  Contrast is measured on the cream ground in app.css; the alert is the
  accent red #652323 at 10.67:1.

  The dialog is Modal (native <dialog>: focus containment, Escape, backdrop
  click, the close button). It is named by its heading. The success and
  failure paths are the fleet's appointment modal's: the action's own
  failure copy is shown and what was typed is kept, because `update()` would
  reset the fields — the one thing a visitor must not lose after a failed
  submit.
-->
{#snippet panel()}
  <div class="relative overflow-hidden rounded-[20px] bg-background">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 mix-blend-difference"
      style="background-image: url('/texture-grain.webp')"
    ></div>
    <div class="text-green-btn relative flex flex-col gap-[30px] p-6 md:p-10">
      <div class="flex flex-col gap-2.5">
        <svelte:element
          this={`h${headingLevel}`}
          id={headingId}
          class="font-heading text-lg font-normal tracking-[1.5px] uppercase"
        >
          {copy.heading}
        </svelte:element>
        <p class="text-base leading-6">{copy.lede}</p>
      </div>

      {#if submitted}
        <p
          bind:this={confirmationEl}
          role="status"
          tabindex="-1"
          class="text-base leading-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-btn"
        >
          {copy.success}
        </p>
      {:else}
        {#if errorMessage}
          <div in:slide={{ duration: 200 }}>
            <p
              bind:this={alertEl}
              role="alert"
              in:fade={{ duration: 150 }}
              class="text-accent text-base leading-6"
            >
              {errorMessage}
              {#if phone}
                {copy.call}
                <a href={phone.href} class="underline">{phone.display}</a>.
              {/if}
            </p>
          </div>
        {/if}

        <form
          method="POST"
          {action}
          class="flex flex-col gap-[30px]"
          use:enhance={() => {
            submitting = true;
            errorMessage = "";
            return async ({ result }) => {
              submitting = false;
              if (result.type === "success") {
                submitted = true;
                return;
              }
              // `update()` is deliberately not called: it would reset the
              // fields, and a failed submit must keep what was typed.
              errorMessage =
                result.type === "failure" && typeof result.data?.error === "string"
                  ? result.data.error
                  : copy.error;
            };
          }}
        >
          <!-- Anti-bot: the timing token + a hidden honeypot, screened
               centrally by createIngestAction (field names bot-field / ts). -->
          <input type="hidden" name="ts" value={openedAt} />
          <input
            type="text"
            name="bot-field"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            class="hidden"
          />

          <div class="flex flex-col gap-[5px]">
            <label class="vlf-label" for={id("name")}>
              {copy.name}<span aria-hidden="true">*</span><span class="sr-only">
                {copy.required}</span
              >
            </label>
            <!-- svelte-ignore a11y_autofocus -->
            <!-- The dialog must open ONTO the first thing to fill in. Without
                 it the native dialog-focusing steps land on the first
                 focusable child, which is Modal's ✕ — the keyboard path would
                 start on the exit. Dialog-scoped: autofocus inside <dialog>
                 is what the attribute is for, and the in-flow page keeps the
                 browser's own start-of-document focus. -->
            <input
              class="vlf-field"
              id={id("name")}
              name="name"
              type="text"
              autocomplete="name"
              required
              autofocus={!inline}
              bind:value={name}
            />
          </div>
          <div class="flex flex-col gap-[5px]">
            <label class="vlf-label" for={id("email")}>
              {copy.email}<span aria-hidden="true">*</span><span class="sr-only">
                {copy.required}</span
              >
            </label>
            <input
              class="vlf-field"
              id={id("email")}
              name="email"
              type="email"
              autocomplete="email"
              required
              bind:value={email}
            />
          </div>
          <div class="flex flex-col gap-[5px]">
            <label class="vlf-label" for={id("phone")}>{copy.phone}</label>
            <input
              class="vlf-field"
              id={id("phone")}
              name="phone"
              type="tel"
              autocomplete="tel"
              bind:value={phoneValue}
            />
          </div>
          <div class="flex flex-col gap-[5px]">
            <label class="vlf-label" for={id("message")}>
              {copy.message}<span aria-hidden="true">*</span><span class="sr-only">
                {copy.required}</span
              >
            </label>
            <textarea
              class="vlf-field vlf-field--area"
              id={id("message")}
              name="message"
              rows="4"
              maxlength={5000}
              required
              bind:value={message}></textarea>
          </div>

          <!-- Renders nothing until PUBLIC_TURNSTILE_SITE_KEY is set. Inside the
               form so its hidden cf-turnstile-response input lands here. -->
          <TurnstileWidget />

          <button
            type="submit"
            class="vlf-pill cursor-pointer disabled:cursor-wait"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? copy.sending : copy.send}
            <img
              src="/icons/arrow-right-dark.svg"
              alt=""
              aria-hidden="true"
              class="h-3.5 w-2.5 -rotate-90"
            />
          </button>
        </form>
      {/if}
    </div>
  </div>
{/snippet}

{#if inline}
  {@render panel()}
{:else}
  <Modal
    bind:open={contactModal.open}
    labelledby={headingId}
    closeLabel={ui(lang).close}
    dialogClass="max-w-[640px]"
    class="bg-transparent! rounded-[20px]! shadow-none!"
    closeClass="text-green-btn hover:opacity-70 z-10"
    bodyClass="p-0"
  >
    {@render panel()}
  </Modal>
{/if}
