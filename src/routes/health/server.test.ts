import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted so the vi.mock factories (also hoisted) can close over the same
// mutable objects. `isPlaceholderRepo` is exposed as a getter so the endpoint's
// live ES binding re-reads it each call; the env objects are mutated in place
// (never reassigned) so the module keeps the reference the factory captured.
const mocks = vi.hoisted(() => ({
  isPlaceholderRepo: false,
  getRepository: vi.fn<() => Promise<unknown>>(),
  createClient: vi.fn(),
  privateEnv: {} as Record<string, string | undefined>,
  publicEnv: {} as Record<string, string | undefined>,
}));

vi.mock("$lib/prismicio", () => ({
  createClient: (...args: unknown[]) => {
    mocks.createClient(...args);
    return { getRepository: mocks.getRepository };
  },
  get isPlaceholderRepo() {
    return mocks.isPlaceholderRepo;
  },
}));
vi.mock("$env/dynamic/private", () => ({ env: mocks.privateEnv }));
vi.mock("$env/dynamic/public", () => ({ env: mocks.publicEnv }));

import { GET, prerender } from "./+server";

type HealthBody = {
  ok: boolean;
  prismic: "ok" | "error" | "skipped";
  forms: {
    ingestUrl: boolean;
    ingestToken: boolean;
    turnstile: boolean;
    testMode: boolean;
  };
};

// Spy fetch handed to the handler. The endpoint passes it to createClient (which
// is mocked and ignores it), so a clean run leaves this untouched — that is how
// we prove /health never POSTs to the ingest.
const fetchSpy = vi.fn();

async function callHealth(): Promise<{ status: number; body: HealthBody }> {
  const res = await GET({
    fetch: fetchSpy,
  } as unknown as Parameters<typeof GET>[0]);
  return { status: res.status, body: (await res.json()) as HealthBody };
}

beforeEach(() => {
  mocks.isPlaceholderRepo = false;
  mocks.getRepository.mockReset();
  mocks.createClient.mockClear();
  delete mocks.privateEnv.FORMS_INGEST_URL;
  delete mocks.privateEnv.FORMS_INGEST_TOKEN;
  delete mocks.publicEnv.PUBLIC_TURNSTILE_SITE_KEY;
  fetchSpy.mockReset();
});

describe("/health GET", () => {
  it("reports prismic 'ok' and ok:true when getRepository resolves", async () => {
    mocks.getRepository.mockResolvedValue({ id: "repo" });
    const { status, body } = await callHealth();
    expect(status).toBe(200);
    expect(body.prismic).toBe("ok");
    expect(body.ok).toBe(true);
  });

  it("reports prismic 'error' and ok:false when getRepository rejects", async () => {
    mocks.getRepository.mockRejectedValue(new Error("network down"));
    const { body } = await callHealth();
    expect(body.prismic).toBe("error");
    expect(body.ok).toBe(false);
  });

  it("reports prismic 'skipped' (ok:true) and never calls Prismic on the placeholder repo", async () => {
    mocks.isPlaceholderRepo = true;
    const { body } = await callHealth();
    expect(body.prismic).toBe("skipped");
    expect(body.ok).toBe(true);
    expect(mocks.getRepository).not.toHaveBeenCalled();
  });

  it("maps forms env presence to booleans and always declares testMode forwarding", async () => {
    mocks.getRepository.mockResolvedValue({});
    mocks.privateEnv.FORMS_INGEST_URL = "https://ingest.example/submit";
    // FORMS_INGEST_TOKEN intentionally left unset.
    mocks.publicEnv.PUBLIC_TURNSTILE_SITE_KEY = "0x_site_key";
    const { body } = await callHealth();
    expect(body.forms).toEqual({
      ingestUrl: true,
      ingestToken: false,
      turnstile: true,
      // Not env-derived: this deploy's contact buildPayload forwards the
      // marker, so the declaration is unconditional. The fleet form-e2e probe
      // refuses to submit to any site whose /health omits it.
      testMode: true,
    });
  });

  it("never POSTs to the ingest (public, unauthenticated endpoint)", async () => {
    mocks.getRepository.mockResolvedValue({});
    mocks.privateEnv.FORMS_INGEST_URL = "https://ingest.example/submit";
    mocks.privateEnv.FORMS_INGEST_TOKEN = "secret";
    await callHealth();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("reports turnstile dark for a whitespace-only sitekey", async () => {
    // The trim is not decoration: the widget applies the same one, so an env
    // var set to " " renders nothing while /health would otherwise call it
    // present. The module comment has claimed this since it was written;
    // nothing tested it until the 2026-09-05 mutation audit, where dropping
    // `.trim()` survived.
    mocks.getRepository.mockResolvedValue({});
    mocks.publicEnv.PUBLIC_TURNSTILE_SITE_KEY = "   ";
    const { body } = await callHealth();
    expect(body.forms.turnstile).toBe(false);
  });

  it("reports every forms field as a boolean, never as the env value", async () => {
    // /health is public and unauthenticated. `!!` is what keeps the sitekey and
    // the ingest URL out of the response; replacing the coercion with the raw
    // value survived the audit, because every other assertion here uses a
    // truthy fixture and reads only truthiness.
    mocks.getRepository.mockResolvedValue({});
    mocks.privateEnv.FORMS_INGEST_URL = "https://ingest.example/submit";
    mocks.privateEnv.FORMS_INGEST_TOKEN = "secret";
    mocks.publicEnv.PUBLIC_TURNSTILE_SITE_KEY = "0x_site_key";
    const { body } = await callHealth();
    for (const [field, value] of Object.entries(body.forms)) {
      expect(typeof value, `forms.${field} leaked a non-boolean`).toBe("boolean");
    }
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(body)).not.toContain("0x_site_key");
  });

  it("reports prismic 'error' when the probe outlives its 5s budget", async () => {
    // The timeout arm had no test: replacing the setTimeout callback with a
    // no-op survived, which turns a time-boxed probe into one that hangs for as
    // long as Prismic does — on the endpoint the fleet polls for liveness.
    vi.useFakeTimers();
    try {
      mocks.getRepository.mockReturnValue(new Promise(() => {}));
      const pending = callHealth();
      await vi.advanceTimersByTimeAsync(5000);
      const { body } = await pending;
      expect(body.prismic).toBe("error");
      expect(body.ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is never prerendered", () => {
    // A live probe. Flipping this to true survived the audit, and would freeze
    // /health into a build-time snapshot that reports the state of the CI
    // machine forever after.
    expect(prerender).toBe(false);
  });
  it("probes Prismic with the request's own fetch", async () => {
    // SvelteKit's request-scoped fetch is what makes the probe participate in
    // the platform's connection handling; dropping the argument survived the
    // audit because the mocked client never looked at it.
    mocks.getRepository.mockResolvedValue({});
    await callHealth();
    expect(mocks.createClient).toHaveBeenCalledWith({ fetch: fetchSpy });
  });

  it("clears its timeout on the success path", async () => {
    // The `finally { if (timer) clearTimeout(timer) }` arm: emptying the block
    // survived, because a leaked 5s timer changes no response body. On a
    // serverless function it keeps the invocation alive after the answer has
    // been sent, on every single poll.
    vi.useFakeTimers();
    try {
      mocks.getRepository.mockResolvedValue({});
      await callHealth();
      expect(vi.getTimerCount(), "the probe left its timeout pending").toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
