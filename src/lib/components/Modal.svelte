<script lang="ts">
  import { X } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { fade, fly } from "$lib/transitions";

  interface ModalProps {
    open: boolean;
    onclose?: () => void;
    class?: string;
    /** Sizing/skin for the sheet. Defaults to the fleet's narrow centred
     *  sheet; override for a wide panel. */
    dialogClass?: string;
    /** Skin for the built-in close button — override when the panel ground is
     *  dark and the default dark-on-light X would vanish into it. */
    closeClass?: string;
    /** Padding wrapper around the content. Override with "p-0" to pay your own. */
    bodyClass?: string;
    /** id of the element that names the dialog (its heading) — without one a
     *  screen reader announces an anonymous dialog. */
    labelledby?: string;
    /** The close button's accessible name. Pass the page locale's word for
     *  it (`ui(lang).close`) — a Spanish dialog announcing "Close" is the
     *  same bug as an English one announcing "Cerrar". */
    closeLabel?: string;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    onclose,
    class: passedClasses = "",
    dialogClass = "max-w-lg",
    closeClass = "text-dark/60 hover:text-dark",
    bodyClass = "p-8",
    labelledby,
    closeLabel = "Close",
    children,
  }: ModalProps = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let backdropEl: HTMLElement | undefined = $state();

  // No use:trapFocus here: showModal() already gives native focus containment,
  // Escape handling, and focus restore — adding the action would double-trap.
  //
  // Opening: the sheet mounts (the {#if open} block, in the same flush) and
  // THEN the dialog is shown, so the dialog-focusing steps find the content —
  // an autofocus field — rather than an empty frame. Closing runs the other
  // way round: `open` goes false, the backdrop fades and the sheet flies out,
  // and only when that outro has ended (`settle`) does the native dialog
  // close and `onclose` fire — after the animation, so a parent that unmounts
  // the Modal on close does not cut the exit short.
  $effect(() => {
    if (dialogEl && open && !dialogEl.open) dialogEl.showModal();
  });

  function close() {
    open = false;
  }

  function settle() {
    if (dialogEl?.open) dialogEl.close();
    onclose?.();
  }

  // Escape: the native cancel would close the dialog on the spot; take it
  // through the outro instead. (A browser may refuse the preventDefault
  // without recent user activation — then the plain close below applies.)
  function handleCancel(e: Event) {
    e.preventDefault();
    close();
  }

  // The dialog closed on its own (a refused cancel, a method="dialog" form):
  // catch the state up, and settle will find it already closed.
  function handleNativeClose() {
    if (open) open = false;
  }

  // The click bubbles from the backdrop (and the dialog's own frame) — but
  // not from the sheet, which is why the backdrop element is a real child
  // and not the ::backdrop pseudo, which cannot transition out either.
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl || e.target === backdropEl) close();
  }
</script>

<!-- The <dialog> is a transparent, full-viewport frame kept in the DOM so the
     effect above can drive showModal/close. m-0 / inset-0 / max-none override
     the UA's centred fit-content box (the preflight zeroes margins, which put
     a fit-content dialog in the top-left corner). The dim + blur and the
     sheet mount inside it while open, and the Svelte transitions run on those:
     the backdrop fades, the sheet rises in and drops out. The transitions are
     |global: a local intro only plays when its own {#if} toggles, and a Modal
     that is itself created open — PersonGrid mounts one per opened bio — would
     appear with no entrance at all. -->
<dialog
  bind:this={dialogEl}
  onclose={handleNativeClose}
  oncancel={handleCancel}
  onclick={handleBackdropClick}
  aria-labelledby={labelledby}
  class="fixed inset-0 m-0 h-full w-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-transparent"
>
  {#if open}
    <div
      bind:this={backdropEl}
      data-backdrop
      class="fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      transition:fade|global={{ duration: 200 }}
    >
      <div
        class="relative max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl {dialogClass} {passedClasses}"
        transition:fly|global={{ y: 20, duration: 300 }}
        onoutroend={settle}
      >
        <button
          type="button"
          onclick={close}
          class="absolute top-4 right-4 transition cursor-pointer {closeClass}"
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
        <div class={bodyClass}>
          {@render children?.()}
        </div>
      </div>
    </div>
  {/if}
</dialog>
