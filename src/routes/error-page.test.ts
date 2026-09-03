import { render } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = {
  status: 404,
  error: { message: "Not found" } as { message: string } | null,
  params: {} as Record<string, string>,
};
vi.mock("$app/state", () => ({
  get page() {
    return state;
  },
}));

import ErrorPage from "./+error.svelte";

describe("+error.svelte", () => {
  beforeEach(() => {
    state.status = 404;
    state.error = { message: "Not found" };
    state.params = {};
  });

  it("says its own words on a 404, not the message the loader logged", () => {
    // `error(404, { message: "Not found" })` is written for a log; the visitor
    // gets the page's own sentence instead.
    const { container } = render(ErrorPage);
    expect(container.textContent).toContain("We couldn't find that page.");
    expect(container.textContent).not.toContain("Not found");
    expect(container.querySelector("a")?.textContent?.trim()).toBe("Go home");
  });

  it("answers a Spanish 404 in Spanish", () => {
    state.params = { lang: "es" };
    const { container } = render(ErrorPage);
    expect(container.textContent).toContain("No pudimos encontrar esa página.");
    expect(container.querySelector("a")?.textContent?.trim()).toBe("Ir al inicio");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/es");
  });

  it("keeps the carried message for the statuses a visitor is not expected to read", () => {
    state.status = 500;
    state.error = { message: "Prismic timed out" };
    const { container } = render(ErrorPage);
    expect(container.textContent).toContain("Prismic timed out");
  });
});
