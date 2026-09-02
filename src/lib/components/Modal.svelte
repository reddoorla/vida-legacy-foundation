<script lang="ts">
  import { X } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  interface ModalProps {
    open: boolean;
    onclose?: () => void;
    class?: string;
    /** Sizing/skin for the <dialog> itself. Defaults to the fleet's narrow
     *  centred sheet; override for a wide panel. */
    dialogClass?: string;
    /** Skin for the built-in close button — override when the panel ground is
     *  dark and the default dark-on-light X would vanish into it. */
    closeClass?: string;
    /** Padding wrapper around the content. Override with "p-0" to pay your own. */
    bodyClass?: string;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    onclose,
    class: passedClasses = "",
    dialogClass = "max-w-lg",
    closeClass = "text-dark/60 hover:text-dark",
    bodyClass = "p-8",
    children,
  }: ModalProps = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  // No use:trapFocus here: showModal() already gives native focus containment,
  // Escape handling, and focus restore — adding the action would double-trap.
  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  });

  function close() {
    open = false;
    onclose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) close();
  }
</script>

<dialog
  bind:this={dialogEl}
  onclose={close}
  onclick={handleBackdropClick}
  class="bg-transparent p-0 w-full mx-4 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-[fade-in_200ms_ease-out] {dialogClass}"
>
  <div
    class="relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto {passedClasses}"
  >
    <button
      type="button"
      onclick={close}
      class="absolute top-4 right-4 transition cursor-pointer {closeClass}"
      aria-label="Close"
    >
      <X size={20} />
    </button>
    <div class={bodyClass}>
      {@render children?.()}
    </div>
  </div>
</dialog>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
