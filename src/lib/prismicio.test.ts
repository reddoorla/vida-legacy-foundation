import { describe, expect, it, vi } from "vitest";
import type * as prismic from "@prismicio/client";
import { createClient, isPlaceholderRepo, linkResolver, repositoryName } from "./prismicio";

const doc = (type: string, uid: string, lang = "en-us") =>
  ({
    link_type: "Document",
    type,
    uid,
    lang,
  }) as unknown as prismic.FilledContentRelationshipField;

describe("createClient", () => {
  // Prismic rejects every query on a client whose routes config names a type
  // with no documents in the repo yet — a freshly cloned repo has none. A
  // routes-free client sidesteps that entirely (see module comment).
  it("creates a routes-free client", () => {
    expect(createClient().routes).toBeUndefined();
  });
});

// The sentinel is load-bearing: prerender entry points short-circuit to empty
// results while it is true, which is what keeps a fresh clone's build green
// before a Prismic repository exists. It had no test until the 2026-09-05
// mutation audit, where flipping `===` to `!==` and blanking the literal both
// survived — either of which inverts the guard and fails the build it exists
// to protect, on the one repo that cannot yet notice.
describe("isPlaceholderRepo", () => {
  it("is false here, because this repo is wired to a real Prismic repository", () => {
    expect(repositoryName).not.toBe("your-prismic-repo-name");
    expect(isPlaceholderRepo).toBe(false);
  });

  // Both branches, against a mocked config, because the module reads the
  // repository name once at import time. Asserting only the false case leaves
  // the sentinel STRING untested — blanking it to "" also yields false on this
  // repo, and that mutant survived the 2026-09-05 audit.
  it("is true for exactly the template's sentinel name", async () => {
    vi.resetModules();
    vi.doMock("../../slicemachine.config.json", () => ({
      default: { repositoryName: "your-prismic-repo-name" },
    }));
    const mod = await import("./prismicio");
    expect(mod.isPlaceholderRepo).toBe(true);
    vi.doUnmock("../../slicemachine.config.json");
    vi.resetModules();
  });

  it("is false for any other repository name", async () => {
    vi.resetModules();
    vi.doMock("../../slicemachine.config.json", () => ({
      default: { repositoryName: "your-prismic-repo-nam" },
    }));
    const mod = await import("./prismicio");
    expect(mod.isPlaceholderRepo).toBe(false);
    vi.doUnmock("../../slicemachine.config.json");
    vi.resetModules();
  });
});

// linkResolver is the local stand-in for Prismic's routes resolver (see the
// comment on the routes-free client in ./prismicio.ts): page documents map to
// "/" for home and "/<uid>" otherwise; anything else is unresolvable.
describe("linkResolver", () => {
  it("resolves the home page doc to the root path", () => {
    expect(linkResolver(doc("page", "home"))).toBe("/");
  });

  it("resolves other page docs to /:uid", () => {
    expect(linkResolver(doc("page", "our-team"))).toBe("/our-team");
  });

  it("puts Spanish documents under the /es prefix", () => {
    expect(linkResolver(doc("page", "home", "es-mx"))).toBe("/es");
    expect(linkResolver(doc("page", "about", "es-mx"))).toBe("/es/about");
  });

  it("returns null for non-page types", () => {
    expect(linkResolver(doc("person", "dr-quan"))).toBeNull();
    expect(linkResolver(doc("settings", "x"))).toBeNull();
  });
});
