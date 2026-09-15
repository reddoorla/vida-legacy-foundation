import type { RequestHandler } from "./$types";

/**
 * CSP violation reports land here. Browsers POST either the legacy
 * `application/csp-report` body or the modern `application/reports+json`
 * batched body when `report-uri` / `report-to` directives are set.
 *
 * In production, forward to a real sink (Sentry, Datadog, Logflare).
 */
export const POST: RequestHandler = async ({ request }) => {
  // Read the body ONCE. `request.json()` consumes the stream before it fails
  // to parse, so a `catch { request.text() }` fallback threw "Body is
  // unusable" and turned every malformed report into a 500 — found by the
  // first test ever written for this route (#59), never by a browser.
  const text = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  console.warn("[csp-report]", JSON.stringify(payload));
  return new Response(null, { status: 204 });
};
