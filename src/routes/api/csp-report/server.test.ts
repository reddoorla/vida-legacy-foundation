import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./+server";

// Added after the 2026-09-05 mutation audit (#59): the handler scored 0.00 —
// not badly tested, unreached. Every one of its five mutants survived because
// no test imported the module. The endpoint's whole job is to tell us the CSP
// is wrong, so the failure mode that matters is it turning the browser's
// violation reports into server errors.

const post = (body: string, type: string) =>
  (POST as unknown as (e: { request: Request }) => Promise<Response>)({
    request: new Request("https://vidalegacy.org/api/csp-report", {
      method: "POST",
      headers: { "content-type": type },
      body,
    }),
  });

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

describe("POST /api/csp-report", () => {
  it("answers a legacy csp-report body with 204 and logs the parsed report", async () => {
    const report = {
      "csp-report": { "blocked-uri": "https://evil.example", "violated-directive": "img-src" },
    };
    const res = await post(JSON.stringify(report), "application/csp-report");
    // 204, and nothing in it: the browser fires-and-forgets, and any body
    // would be a wasted write on every violation.
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    // The report reaches the sink as the parsed object, not the raw text —
    // deleting the console.warn survived the audit.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[csp-report]", JSON.stringify(report));
  });

  it("still answers 204 when the body is not JSON, logging it as text", async () => {
    // Emptying the try/catch survived: a malformed body would then throw and
    // a browser reporting a real violation would get a 500 for its trouble.
    const res = await post("not json {", "text/plain");
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[csp-report]", JSON.stringify("not json {"));
  });

  it("still answers 204 on an empty body", async () => {
    const res = await post("", "application/reports+json");
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
