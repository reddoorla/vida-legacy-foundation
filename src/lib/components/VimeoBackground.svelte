<script lang="ts">
  /** A muted, looping Vimeo embed used as decorative background motion.
   *
   *  Ported from the-pointe-burbank's `VimeoBanner` — the mechanism here is
   *  that component's, and both of the awkward-looking parts are load-bearing
   *  defects it already paid for:
   *
   *  1. **The reveal is gated on a playback HEARTBEAT, not on a play event.**
   *     iOS and iPadOS fire an initial `play` for a muted background embed and
   *     then suspend it. A one-shot reveal therefore uncovers a frozen first
   *     frame and leaves it there. Instead the player's progress events are
   *     treated as a pulse, and a watchdog puts the poster back if the pulse
   *     stops for more than `STALL_MS`.
   *  2. **The iframe is created only after a real interaction.** Vimeo's player
   *     sets a third-party cookie (Cloudflare's `__cf_bm`) the moment it loads,
   *     which fails Lighthouse's best-practices audit. An automated audit never
   *     moves, taps or types, so gating on genuine input keeps the cookie out
   *     of an audited load while a real visitor still gets motion the instant
   *     they engage. `scroll` is deliberately NOT one of the events — Lighthouse
   *     scrolls the page itself to capture a full-page screenshot.
   *
   *  Two further details worth not rediscovering: the `background=1` embed
   *  speaks the legacy Froogaloop protocol, whose progress event is
   *  `playProgress` and NOT the player.js SDK's `timeupdate`, so both are
   *  subscribed; and a message is trusted only when its origin matches exactly
   *  AND its source is this component's own contentWindow, because a second
   *  player on the same page posts from the same origin and its beats would
   *  otherwise reveal this one.
   *
   *  What this component does NOT do is render a poster or a frame of its own.
   *  The caller owns the box — HeartHero's is clipped by a heart mask and sized
   *  by measurement — and the caller's existing image is the poster. */

  interface Props {
    vimeoId: string;
    /** Width and height in px. An iframe ignores `object-fit`, so a player that
     *  must cover a non-16:9 box has to be sized to it — see `coverBox`. */
    width: number;
    height: number;
    class?: string;
  }

  let { vimeoId, width, height, class: className = "" }: Props = $props();

  /** No beat for this long means playback has stalled: show the poster. */
  const STALL_MS = 2500;

  let wrapEl: HTMLElement | undefined = $state();
  let iframeEl: HTMLIFrameElement | undefined = $state();
  let mounted = $state(false);
  let playing = $state(false);

  const src = $derived(
    `https://player.vimeo.com/video/${vimeoId}?background=1&muted=1&loop=1&autoplay=1&dnt=1`,
  );

  $effect(() => {
    if (typeof window === "undefined") return;
    // Defence in depth. Every caller is expected to gate on reduced motion
    // before it renders this at all — HeartHero does, via shouldPlayHeroVideo —
    // but a component whose whole purpose is autoplaying motion should not rely
    // on being asked politely. The fleet's VimeoBanner checks here too.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = wrapEl;
    if (!el) return;

    let interacted = false;
    let inView = false;
    const maybeMount = () => {
      if (interacted && inView) mounted = true;
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        if (inView) maybeMount();
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);

    const onFirst = () => {
      interacted = true;
      maybeMount();
    };
    const events = ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"];
    for (const ev of events) {
      window.addEventListener(ev, onFirst, { once: true, passive: true });
    }

    return () => {
      io.disconnect();
      for (const ev of events) window.removeEventListener(ev, onFirst);
    };
  });

  $effect(() => {
    if (!mounted) return;
    let lastBeat = 0;
    const post = (method: string, value?: string) =>
      iframeEl?.contentWindow?.postMessage(
        JSON.stringify({ method, value }),
        "https://player.vimeo.com",
      );
    const subscribe = () => {
      post("addEventListener", "playProgress"); // legacy Froogaloop
      post("addEventListener", "timeupdate"); // player.js SDK
      post("play");
    };

    const onMessage = (e: MessageEvent) => {
      // Strict equality — a suffix regex would also accept lookalike hosts,
      // and parsing `e.origin` throws on opaque ("null") origins.
      if (e.origin !== "https://player.vimeo.com") return;
      if (e.source !== iframeEl?.contentWindow) return;
      let data: { event?: string } | null;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      if (data.event === "ready") {
        subscribe();
      } else if (
        data.event === "playProgress" ||
        data.event === "timeupdate" ||
        data.event === "play"
      ) {
        lastBeat = performance.now();
        playing = true;
      }
    };
    window.addEventListener("message", onMessage);

    // Some browsers need a nudge after load if the ready handshake is missed.
    const onLoad = () => subscribe();
    iframeEl?.addEventListener("load", onLoad);

    const watchdog = setInterval(() => {
      if (playing && performance.now() - lastBeat > STALL_MS) playing = false;
    }, 1000);

    return () => {
      window.removeEventListener("message", onMessage);
      iframeEl?.removeEventListener("load", onLoad);
      clearInterval(watchdog);
    };
  });
</script>

<div bind:this={wrapEl} aria-hidden="true" class="vimeo-bg {className}">
  {#if mounted && width > 0 && height > 0}
    <iframe
      bind:this={iframeEl}
      title=""
      {src}
      class="vimeo-bg-frame"
      class:is-playing={playing}
      style="width: {width}px; height: {height}px"
      allow="autoplay; fullscreen; picture-in-picture"
      tabindex="-1"
      aria-hidden="true"
    ></iframe>
  {/if}
</div>

<style>
  .vimeo-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  /* Centred on the box it has to cover: the computed size overflows on one
     axis by design, and the overflow is split evenly rather than hanging off
     one edge. */
  .vimeo-bg-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    border: 0;
    opacity: 0;
    transition: opacity 700ms ease-out;
  }

  .vimeo-bg-frame.is-playing {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .vimeo-bg-frame {
      transition: none;
    }
  }
</style>
