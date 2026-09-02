import { describe, expect, it, vi } from "vitest";
import { NotFoundError, RepositoryNotFoundError } from "@prismicio/client";

import { loadPage, alternatesFor, type PageClient } from "./page-load";

const doc = {
  uid: "about",
  type: "page",
  lang: "en-us",
  alternate_languages: [{ id: "x", type: "page", lang: "es-mx", uid: "about" }],
  data: { title: [{ type: "heading1", text: "About", spans: [] }], slices: [] },
} as never;

const clientThat = (behaviour: PageClient["getByUID"]) =>
  ({ getByUID: behaviour }) as unknown as PageClient;

describe("loadPage", () => {
  it("returns the document plus its head payload", async () => {
    const client = clientThat(async () => doc);
    await expect(loadPage(client, "about")).resolves.toMatchObject({
      page: doc,
      title: "About",
      lang: "en",
      ogLocale: "en_US",
    });
  });

  it("asks Prismic for the locale's documents, defaulting to English", async () => {
    const getByUID = vi.fn(async () => doc);
    await loadPage(clientThat(getByUID), "about");
    expect(getByUID).toHaveBeenCalledWith("page", "about", { lang: "en-us" });
    await loadPage(clientThat(getByUID), "about", "es");
    expect(getByUID).toHaveBeenLastCalledWith("page", "about", { lang: "es-mx" });
  });

  it("reports the Spanish locale's og:locale", async () => {
    const client = clientThat(async () => doc);
    await expect(loadPage(client, "about", "es")).resolves.toMatchObject({
      lang: "es",
      ogLocale: "es_MX",
    });
  });

  it("lists the page and its translations as hreflang alternates", async () => {
    const client = clientThat(async () => doc);
    await expect(loadPage(client, "about")).resolves.toMatchObject({
      alternates: [
        { lang: "en", href: "/about" },
        { lang: "es", href: "/es/about" },
      ],
    });
  });

  it("turns a Prismic miss into a 404", async () => {
    const client = clientThat(async () => {
      throw new NotFoundError("No documents were returned", "https://x", undefined);
    });
    await expect(loadPage(client, "missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rethrows anything that is not a miss so outages stay loud", async () => {
    const boom = new Error("ECONNRESET");
    const client = clientThat(async () => {
      throw boom;
    });
    await expect(loadPage(client, "about")).rejects.toBe(boom);
  });

  it("rethrows a wrong repository name instead of calling it a 404", async () => {
    const wrongRepo = new RepositoryNotFoundError("Repository not found", "https://x", undefined);
    const client = clientThat(async () => {
      throw wrongRepo;
    });
    await expect(loadPage(client, "about")).rejects.toBe(wrongRepo);
  });
});

describe("alternatesFor", () => {
  it("puts the page itself first and maps translations to their own paths", () => {
    expect(
      alternatesFor(
        {
          uid: "home",
          alternate_languages: [{ id: "y", type: "page", lang: "es-mx", uid: "home" }],
        } as never,
        "en",
      ),
    ).toEqual([
      { lang: "en", href: "/" },
      { lang: "es", href: "/es" },
    ]);
  });

  it("skips translations in a locale the site does not serve", () => {
    expect(
      alternatesFor(
        {
          uid: "about",
          alternate_languages: [{ id: "z", type: "page", lang: "fr-fr", uid: "a-propos" }],
        } as never,
        "es",
      ),
    ).toEqual([{ lang: "es", href: "/es/about" }]);
  });
});
