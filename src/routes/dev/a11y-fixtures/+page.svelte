<script lang="ts">
  import type { Content, ImageField } from "@prismicio/client";
  import { PLACEHOLDER_HERO, PLACEHOLDER_PORTRAIT } from "./placeholders";
  import Accordion from "$lib/components/Accordion.svelte";
  import BrandIcon from "$lib/components/BrandIcon.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import NavMenu from "$lib/components/NavMenu.svelte";
  import ContactModal from "$lib/components/ContactModal.svelte";
  import Form from "$lib/components/Form.svelte";
  import Field from "$lib/components/Field.svelte";
  import HeroBackgroundImage from "$lib/components/HeroBackgroundImage.svelte";
  import Img from "$lib/components/Img.svelte";
  import ScreenWidthMedia from "$lib/components/ScreenWidthMedia.svelte";
  import VimeoBanner from "$lib/components/VimeoBanner.svelte";
  import RichTextBody from "$lib/components/RichTextBody.svelte";
  import Slider from "$lib/components/Slider.svelte";
  import CountUp from "$lib/components/CountUp.svelte";
  import HeartHero from "$lib/slices/HeartHero/index.svelte";
  import Hero from "$lib/slices/Hero/index.svelte";
  import MediaText from "$lib/slices/MediaText/index.svelte";
  import SectionGrid from "$lib/slices/SectionGrid/index.svelte";
  import StatsBand from "$lib/slices/StatsBand/index.svelte";
  import IconColumns from "$lib/slices/IconColumns/index.svelte";
  import ImageBand from "$lib/slices/ImageBand/index.svelte";
  import PageMasthead from "$lib/slices/PageMasthead/index.svelte";
  import PersonGrid from "$lib/slices/PersonGrid/index.svelte";
  import StatementPanel from "$lib/slices/StatementPanel/index.svelte";
  import LeadText from "$lib/slices/LeadText/index.svelte";
  import TextColumns from "$lib/slices/TextColumns/index.svelte";
  import Testimonial from "$lib/slices/Testimonial/index.svelte";
  import CtaBanner from "$lib/slices/CtaBanner/index.svelte";
  import DonationForm from "$lib/slices/DonationForm/index.svelte";
  // Aliased: `Accordion` above is the primitive ($lib/components/Accordion.svelte).
  import AccordionSlice from "$lib/slices/Accordion/index.svelte";
  import type { ComponentProps } from "svelte";
  import { trapFocus } from "$lib/actions/trapFocus";
  import type { RichTextField } from "@prismicio/client";

  let modalOpen = $state(false);
  let trapDemoOpen = $state(false);
  let email = $state("");
  let message = $state("");

  // Inline pixel so media fixtures stay hermetic — the axe run must not
  // depend on external hosts (Prismic, Vimeo).
  const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

  // Real placeholder photography, served from static/dev/. Still hermetic (same
  // origin, no external host) and still allowed by the CSP, whose img-src is
  // `self data: https://*.prismic.io` — which is why the old unsplash.com mock
  // URLs rendered as nothing at all.
  //
  // These are the comps' own iStock images, watermark included: they are the
  // crops the design actually assumes, and the watermark is a standing reminder
  // that licensed imagery is still outstanding.
  // Slices rendering through <PrismicImage> (MediaText, SectionGrid,
  // Testimonial) need an ABSOLUTE url — its asImageWidthSrcSet calls
  // new URL(url), which throws "Invalid URL" on a relative path and 500s the
  // prerender. Those get data URIs; the rest read from static/dev/.
  const placeholder = {
    hero: PLACEHOLDER_HERO,
    portrait: PLACEHOLDER_PORTRAIT,
    wide: "/dev/placeholder-wide.webp",
  };
  const heroImage = {
    url: placeholder.hero,
    alt: "A mother and daughter embracing at home",
    dimensions: { width: 800, height: 533 },
  } as unknown as ImageField;
  const runImport = { img: { src: pixel, w: 1920, h: 1080 }, sources: {} };

  const items = [
    {
      label: "What is this page?",
      content: "A fixtures page exercising accessible component primitives for axe testing.",
    },
    {
      label: "What does it cover?",
      content:
        "Focus trap (custom dialog overlay), Accordion (disclosure), Modal (dialog), Form, Field, and rich-text heading normalization.",
    },
  ];

  // An editor-authored body that starts deep and skips a level (h3 → h5);
  // RichTextBody compresses the announced levels to 2 and 3.
  const richTextField = [
    { type: "heading3", text: "Editor heading (h3 tag)", spans: [] },
    {
      type: "paragraph",
      text: "The h3 above is announced as level 2 via aria-level.",
      spans: [],
    },
    { type: "heading5", text: "Skipped to h5 (h5 tag)", spans: [] },
    {
      type: "paragraph",
      text: "The h5 above is announced as level 3 — no gap in the outline.",
      spans: [],
    },
  ] as unknown as RichTextField;

  // Prismic slice fixtures. Images use static/dev placeholders (hermetic — no
  // external hosts). Headings are h2 (slice sections) / h3 (items) so the page
  // outline stays valid beneath the page <h1>.
  const heartHeroFixture = {
    slice_type: "heart_hero",
    variation: "default",
    primary: {
      image: heroImage,
      eyebrow: "Connecting Hope and Support",
      heading: [
        {
          type: "heading2",
          text: "Financial Relief and Support for Donor and Recipient Families",
          spans: [],
        },
      ],
    },
    items: [
      { cta_label: "Donate now", cta_link: { link_type: "Web", url: "https://example.com" } },
    ],
  } as unknown as Content.HeartHeroSlice;
  const heroSliceFixture = {
    slice_type: "hero",
    variation: "default",
    primary: {
      heading: [{ type: "heading2", text: "Hero slice", spans: [] }],
      body: [
        {
          type: "paragraph",
          text: "Hero body copy over a dark backdrop.",
          spans: [],
        },
      ],
      background_image: heroImage,
      cta_label: "Explore",
      cta_link: { link_type: "Web", url: "https://example.com" },
    },
    items: [],
  } as unknown as Content.HeroSlice;
  const mediaTextFixture = {
    slice_type: "media_text",
    variation: "imageRight",
    primary: {
      heading: [{ type: "heading2", text: "MediaText slice", spans: [] }],
      body: [{ type: "paragraph", text: "Copy beside an image.", spans: [] }],
      media: heroImage,
    },
    items: [],
  } as unknown as Content.MediaTextSlice;
  const sectionGridFixture = {
    slice_type: "section_grid",
    variation: "default",
    primary: {
      heading: [{ type: "heading2", text: "SectionGrid slice", spans: [] }],
      columns: 3,
    },
    items: [
      {
        item_heading: [{ type: "heading3", text: "Card one", spans: [] }],
        item_body: [{ type: "paragraph", text: "Card body.", spans: [] }],
        item_media: heroImage,
        item_link: { link_type: "Web", url: "https://example.com" },
      },
    ],
  } as unknown as Content.SectionGridSlice;
  // Portfolio-intro twins. ComponentProps types the fixture to each slice's own
  // (inline) prop shape without needing generated Content.* types.
  const rtx = (text: string): RichTextField =>
    [{ type: "paragraph", text, spans: [] }] as unknown as RichTextField;

  const leadTextFixture: ComponentProps<typeof LeadText>["slice"] = {
    slice_type: "lead_text",
    variation: "default",
    primary: {
      eyebrow: "The Challenge",
      body: rtx("They needed an identity on a tight timeline to communicate that message."),
    },
  };
  // VLF TOSA x Vida grid: text-only cards on #172303 plus a closing CTA cell.
  // The CTA is an EXTERNAL url on purpose — an internal /about here would be
  // followed by the prerender crawler and 404 the build, since no such Prismic
  // page exists yet.
  const sectionGridOnDarkFixture = {
    slice_type: "section_grid",
    variation: "onDark",
    primary: {
      heading: [],
      outro: [
        {
          type: "paragraph",
          text: "Together, TOSA and Vida Legacy Foundation provide ongoing support for families impacted by organ donation.",
          spans: [],
        },
      ],
      cta_label: "Who we are",
      cta_link: { link_type: "Web", url: "https://example.com/about" },
    },
    items: [
      {
        item_heading: [{ type: "heading3", text: "Independent but Connected", spans: [] }],
        item_body: [
          { type: "paragraph", text: "A separate 501(c)(3) created by TOSA.", spans: [] },
        ],
      },
      {
        item_heading: [{ type: "heading3", text: "Complementary Missions", spans: [] }],
        item_body: [
          {
            type: "paragraph",
            text: "TOSA handles organ procurement; VLF supports families.",
            spans: [],
          },
        ],
      },
      {
        item_heading: [{ type: "heading3", text: "Local Impact", spans: [] }],
        item_body: [
          {
            type: "paragraph",
            text: "Philanthropic support stays in Central and South Texas.",
            spans: [],
          },
        ],
      },
    ],
  } as unknown as Content.SectionGridSlice;

  // VLF "A companion on the journey": sticky intro + icon card + photo. Locks
  // the decorative-icon markup and the 7.84 / 15.18 pairings on #172303.
  const iconColumnsFixture = {
    slice_type: "icon_columns",
    variation: "default",
    primary: {
      eyebrow: "A companion on the journey",
      body: [
        {
          type: "paragraph",
          text: "Vida Legacy Foundation leads the way in organ donation after-care.",
          spans: [],
        },
      ],
      image: heroImage,
    },
    items: [
      {
        icon: { url: "/icons/relief.svg", alt: "", dimensions: { width: 81, height: 82 } },
        title: "Grants for recovery",
        description: "Families find relief with our grants making recovery stress-free.",
      },
      {
        icon: { url: "/icons/brain.svg", alt: "", dimensions: { width: 133, height: 133 } },
        title: "Access to education",
        description: "We equip families to make better choices.",
      },
      {
        icon: { url: "/icons/community.svg", alt: "", dimensions: { width: 100, height: 75 } },
        title: "Compassionate support",
        description: "We provide support through community and compassion.",
      },
    ],
  } as unknown as Content.IconColumnsSlice;

  // The VLF mission statement: onDark ground with a `highlight` label on the
  // opening phrase. Locks the label styling and the 11.35:1 / 5.86:1 pairings
  // under the axe gate.
  const leadTextOnDarkFixture: ComponentProps<typeof LeadText>["slice"] = {
    slice_type: "lead_text",
    variation: "onDark",
    primary: {
      eyebrow: "",
      body: [
        {
          type: "paragraph",
          text: "Vida Legacy Foundation is dedicated to honoring the gift of life through education, outreach, and compassionate support for South Texas families affected by organ donation.",
          spans: [{ type: "label", start: 0, end: 64, data: { label: "highlight" } }],
        },
      ],
    } as never,
  };
  // Eyebrow-less + duplicate/blank titles: locks the h2-promotion (no skip) and
  // index-key (no each_key_duplicate crash) behaviour under the axe gate.
  const textColumnsFixture: ComponentProps<typeof TextColumns>["slice"] = {
    slice_type: "text_columns",
    variation: "default",
    primary: {
      eyebrow: "",
      hasTopRule: false,
      desktopColumns: "3",
      columns: [
        { title: "Shared", body: rtx("First column.") },
        { title: "Shared", body: rtx("Duplicate title — index-keyed.") },
        { title: "", body: rtx("Blank title renders no heading.") },
      ],
    },
  };
  // figure/blockquote/figcaption with an avatar whose alt falls back to the
  // credited name — audits image-alt plus the "the name is not a heading"
  // outline decision (the label IS the section h2).
  const testimonialFixture = {
    slice_type: "testimonial",
    variation: "default",
    primary: {
      label: "What clients are saying",
      quote: "They shipped in six weeks what we had budgeted six months for.",
      name: "Dana Whitfield",
      role: "Director of Operations, Northgate",
      avatar: {
        url: placeholder.portrait,
        alt: null,
        dimensions: { width: 320, height: 427 },
      },
    },
    items: [],
  } as unknown as Content.TestimonialSlice;
  // The dark ground is the contrast-sensitive one: white type + the inverted
  // outline button skin both get audited here.
  const ctaBannerFixture = {
    slice_type: "cta_banner",
    variation: "default",
    primary: {
      heading: [{ type: "heading2", text: "Ready to start your project?", spans: [] }],
      buttonLabel: "Talk with us",
      buttonLink: { link_type: "Web", url: "https://example.com" },
      background: "dark",
    },
    items: [],
  } as unknown as Content.CtaBannerSlice;
  // VLF "Compassion in Action": the night-blue CTA band. Locks the eyebrow
  // staying OUT of the outline (one h2 per section) and the #263b02/#9cbf5b
  // button couple under the axe gate — never white-on-green.
  const ctaBannerOnDarkFixture = {
    slice_type: "cta_banner",
    variation: "onDark",
    primary: {
      eyebrow: "Compassion in Action",
      heading: [
        {
          type: "heading2",
          text: "Vida Legacy Foundation believes no family should walk the transplant journey alone.",
          spans: [],
        },
      ],
      body: [
        {
          type: "paragraph",
          text: "Your financial gift will bring hope, healing, and relief to families in need.",
          spans: [],
        },
      ],
      buttonLabel: "Donate now",
      buttonLink: { link_type: "Web", url: "https://example.com/donate" },
    },
    items: [],
  } as unknown as Content.CtaBannerSlice;

  // VLF "By the numbers". The contrast-sensitive one: #9cbf5b figures sit at
  // 4.92:1 on #004370, dropping to 3.80 under the brightest grain pixel — AA
  // for large text only, which is why nothing small here is green.
  const statsBandFixture = {
    slice_type: "stats_band",
    variation: "default",
    primary: {
      eyebrow: "By the numbers",
      cta_label: "Register to be an organ donor",
      // External on purpose: an internal path here would be followed by the
      // prerender crawler and 404 the build.
      cta_link: { link_type: "Web", url: "https://example.com/register" },
    },
    items: [
      {
        value: 100000,
        suffix: "+",
        description: "More than 100,000 people are on the waiting list right now.",
      },
      { value: 13, suffix: "people", description: "Thirteen people die every day waiting." },
      { value: 30, suffix: "%", description: "A 30% gap you can close in seconds." },
      { value: 8, suffix: "lives", description: "One donor can save up to eight lives." },
    ],
  } as unknown as Content.StatsBandSlice;

  // The VLF homepage tagline: the copy IS the h2, and the `highlight` label
  // both colours the second phrase and breaks the line.
  const leadTextStatementFixture: ComponentProps<typeof LeadText>["slice"] = {
    slice_type: "lead_text",
    variation: "statement",
    primary: {
      body: [
        {
          type: "heading2",
          text: "Hope that heals. Help that Lasts.",
          spans: [{ type: "label", start: 17, end: 33, data: { label: "highlight" } }],
        },
      ],
    } as never,
  };
  // VLF "Make a contribution": the cream closing panel. Locks the inverted
  // button couple (#9cbf5b fill + #263b02 text, 5.86:1) and the #527e01
  // highlight, which is 4.47:1 on cream — safe ONLY at this display scale.
  const ctaBannerOnCreamFixture = {
    slice_type: "cta_banner",
    variation: "onCream",
    primary: {
      eyebrow: "Make a contribution",
      heading: [
        {
          type: "heading2",
          text: "We understand this journey can make families feel alone. We're there to help.",
          spans: [{ type: "label", start: 57, end: 77, data: { label: "highlight" } }],
        },
      ],
      buttonLabel: "Donate now",
      buttonLink: { link_type: "Web", url: "https://example.com/donate" },
    },
    items: [],
  } as unknown as Content.CtaBannerSlice;

  // The closing quote + photo row. Data URIs, not static/dev paths: this
  // renders through <PrismicImage>, whose asImageWidthSrcSet calls new URL()
  // and throws "Invalid URL" on a relative path, 500ing the prerender.
  const testimonialOnCreamFixture = {
    slice_type: "testimonial",
    variation: "onCream",
    primary: {
      quote: "The Vida Legacy Foundation made a difficult time manageable.",
      name: "Grateful Family Member",
    },
    items: [
      {
        image: {
          url: placeholder.hero,
          alt: "A patient resting in a hospital bed",
          dimensions: { width: 800, height: 533 },
        },
      },
      {
        image: {
          url: placeholder.portrait,
          alt: "A father carrying his son on his shoulders",
          dimensions: { width: 320, height: 427 },
        },
      },
    ],
  } as unknown as Content.TestimonialSlice;

  // The full-bleed photo bands that break up the homepage. No copy sits over
  // them, so there is no scrim and no contrast rule to honour — but the alt
  // text still gets audited, which is why the fixture carries a real one.
  const imageBandFixture = {
    slice_type: "image_band",
    variation: "default",
    primary: { image: heroImage },
    items: [],
  } as unknown as Content.ImageBandSlice;

  // Who We Are mission band. The statement uses --color-green-mid-aa rather
  // than the comp's #527e01: the type clamps to 20px on a phone, which is body
  // size, where 4.47:1 fails — and the axe gate only runs one viewport.
  const statementPanelFixture = {
    slice_type: "statement_panel",
    variation: "default",
    primary: {
      statement: [
        {
          type: "heading2",
          text: "Our mission is to honor the gift of life through education, outreach, and support for families in our South Texas community.",
          spans: [],
        },
      ],
      body: [
        {
          type: "paragraph",
          text: "Vida Legacy Foundation is an independent 501(c)(3) nonprofit organization founded by Texas Organ Sharing Alliance.",
          spans: [],
        },
      ],
    },
    items: [],
  } as unknown as Content.StatementPanelSlice;

  // Three PersonGrid fixtures on purpose: the heading levels SHIFT with the
  // display heading (h2/h3/h4 with it, h2/h3 without), and rendering both is
  // what lets axe's heading-order rule audit the promotion. The second is the
  // board style — the lighter cream band with page-cream cards and the -aa
  // green copy — so both card palettes go in front of axe. The third is the
  // bio-only card the site launches with (`headshots` off), whose name
  // carries the display size instead of the label size.
  const person = (name: string, role: string, withBio: boolean) => ({
    headshot: { url: placeholder.portrait, alt: name, dimensions: { width: 592, height: 592 } },
    name,
    role,
    email: `${name.split(" ")[0].toLowerCase()}@example.org`,
    bio: withBio ? [{ type: "paragraph", text: `${name} has served since 2019.`, spans: [] }] : [],
  });
  const personGridFixture = {
    slice_type: "person_grid",
    variation: "default",
    primary: {
      heading: [
        {
          type: "heading2",
          text: "A Team That Cares",
          spans: [{ type: "label", start: 12, end: 17, data: { label: "highlight" } }],
        },
      ],
      label: "Leadership",
      intro: [{ type: "paragraph", text: "Our staff is dedicated to the mission.", spans: [] }],
      headshots: true,
    },
    items: [
      person("Brooke Perucki", "Executive Director", true),
      person("Vilma Gonzalez", "Finance & Administration Manager", false),
    ],
  } as unknown as Content.PersonGridSlice;
  const personGridNoHeadingFixture = {
    ...personGridFixture,
    primary: {
      ...personGridFixture.primary,
      style: "board",
      heading: [],
      label: "Board of Directors",
    },
  } as unknown as Content.PersonGridSlice;
  const personGridBioOnlyFixture = {
    ...personGridFixture,
    primary: {
      ...personGridFixture.primary,
      headshots: false,
      heading: [],
      label: "Leadership, bio only",
    },
  } as unknown as Content.PersonGridSlice;

  // The Donation page. Its heading is the page's h1 (the slice IS the page),
  // so the fixture leaves it empty — this page already has an h1 — and axe
  // audits the form itself: the labels, the placeholders, the radios, the
  // select and the two buttons.
  const donationFormFixture = {
    slice_type: "donation_form",
    variation: "default",
    primary: {
      heading: "",
      eyebrow: "help that lasts",
      body: [
        {
          type: "paragraph",
          text: "Your contribution allows us to provide families access to resources that can alleviate financial stress.",
          spans: [],
        },
      ],
      form_label: "donate online",
      form_link: {
        link_type: "Web",
        url: "https://secure.lglforms.com/form_engine/s/1DAy4mOf7OlVR4Ke-4h2gA",
      },
      paypal_label: "use paypal",
      paypal_link: {
        link_type: "Web",
        url: "https://www.paypal.com/donate/?hosted_button_id=4VVJZ6HKP6RRJ",
        target: "_blank",
      },
      show_form: true,
      form_heading: "Contact information",
      submit_label: "enter payment information",
    },
    items: [{ amount: 100 }, { amount: 50 }, { amount: 25 }],
  } as unknown as Content.DonationFormSlice;
  // The links-only mode the page actually ships in until the form has a
  // backend: the same copy, two buttons where the card would be.
  const donationLinksFixture = {
    ...donationFormFixture,
    primary: { ...donationFormFixture.primary, show_form: false },
  } as unknown as Content.DonationFormSlice;

  // Who We Are masthead. Its title is an h1 — the ONLY slice that renders one,
  // since the [uid] route renders nothing but the slice zone. The fixture is
  // deliberately title-LESS: this page already has its own h1, and a second
  // would be a page-has-heading-one violation of the fixtures page, not of the
  // slice. The h1 is asserted in the unit test; what axe audits here is the
  // photo-only form the comp actually ships.
  const pageMastheadFixture = {
    slice_type: "page_masthead",
    variation: "default",
    primary: { image: heroImage, eyebrow: "About us", title: "" },
    items: [],
  } as unknown as Content.PageMastheadSlice;

  const accordionFixture: ComponentProps<typeof AccordionSlice>["slice"] = {
    slice_type: "accordion",
    variation: "default",
    primary: {
      allowMultiple: true,
      items: [
        {
          title: "About the project",
          body: "A joint venture between two agencies.",
        },
        { title: "The team", body: "Design and strategy leads." },
      ],
    },
  };
</script>

<!-- NOT a <main>: src/routes/+layout.svelte already renders one, and nesting a
     second is a duplicate-landmark violation. It also capped every full-bleed
     slice below to max-w-3xl, so nothing laid out the way it actually ships. -->
<div class="space-y-12 py-16">
  <!-- Narrow column: the component primitives only. -->
  <div class="mx-auto max-w-3xl space-y-12 px-8">
    <header class="space-y-2">
      <h1 class="text-3xl font-bold">Accessibility fixtures</h1>
      <p class="text-secondary">
        Used by the Playwright + axe-core CI gate. Every primitive on this page is expected to pass
        WCAG 2.2 AA.
      </p>
    </header>

    <section aria-labelledby="focus-trap-heading" class="space-y-4">
      <h2 id="focus-trap-heading" class="text-xl font-semibold">Focus trap</h2>
      <button
        type="button"
        onclick={() => (trapDemoOpen = true)}
        class="px-4 py-2 border-2 border-primary rounded bump"
      >
        Open focus-trap demo
      </button>
      {#if trapDemoOpen}
        <!-- In-flow stand-in for a custom (non-<dialog>) overlay, like Nav's
           mobile menu: exercises use:trapFocus + dialog semantics under axe
           without stacking a second fixed navbar and duplicate landmarks on
           top of the app Nav the root layout already mounts. -->
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Focus trap demo"
          class="border-2 border-primary rounded p-6 space-y-4"
          use:trapFocus={{ onEscape: () => (trapDemoOpen = false) }}
        >
          <p>Tab and Shift+Tab cycle within this region; Escape closes it.</p>
          <a href="#accordion-heading" class="block underline">Accordion</a>
          <a href="#form-heading" class="block underline">Form</a>
          <button
            type="button"
            onclick={() => (trapDemoOpen = false)}
            class="px-4 py-2 border-2 border-primary rounded bump"
          >
            Close demo
          </button>
        </div>
      {/if}
    </section>

    <section aria-labelledby="nav-menu-heading" class="space-y-4">
      <h2 id="nav-menu-heading" class="text-xl font-semibold">Navigation menu</h2>
      <!-- The site menu is not in the DOM until opened, so the root layout's
           Nav never shows it to axe. Rendered in-flow here (inline: absolute
           inside this box, no focus trap) so the cream and green labels on the
           textured dark green are audited. Its entries mirror site-config,
           including the href-less one that renders as text. -->
      <div class="relative h-[520px] overflow-hidden">
        <NavMenu
          inline
          onClose={() => {}}
          entries={[
            { label: "Who We Are", href: "" },
            { label: "Donate", href: "https://example.org/donate" },
            { label: "Contact Us", href: "#nav-menu-heading" },
            { label: "Become a Donor", href: "https://example.org/register" },
          ]}
        />
      </div>
    </section>

    <section aria-labelledby="rich-text-heading" class="space-y-4">
      <h2 id="rich-text-heading" class="text-xl font-semibold">Rich text heading levels</h2>
      <RichTextBody field={richTextField} />
    </section>

    <section aria-labelledby="accordion-heading" class="space-y-4">
      <h2 id="accordion-heading" class="text-xl font-semibold">Accordion</h2>
      <Accordion {items} />
    </section>

    <section aria-labelledby="brand-icons-heading" class="space-y-4">
      <h2 id="brand-icons-heading" class="text-xl font-semibold">Brand icons</h2>
      <!-- BrandIcon is decorative (aria-hidden), so the accessible name must live
         on the wrapping link — exactly how sites are expected to use it. -->
      <ul class="flex flex-row gap-4">
        {#each ["facebook", "x", "reddit", "instagram", "linkedin"] as platform (platform)}
          <li>
            <a
              href="https://example.com/{platform}"
              aria-label="Reddoor on {platform}"
              class="block h-6 w-6 hover:opacity-75 transition-opacity"
            >
              <BrandIcon {platform} />
            </a>
          </li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="modal-heading" class="space-y-4">
      <h2 id="modal-heading" class="text-xl font-semibold">Modal</h2>
      <button
        type="button"
        onclick={() => (modalOpen = true)}
        class="px-4 py-2 border-2 border-primary rounded bump"
      >
        Open modal
      </button>
      <Modal bind:open={modalOpen}>
        <h3 class="text-lg font-semibold mb-2">Dialog title</h3>
        <p>Native dialog element with backdrop, ESC-to-close, and focus trap.</p>
      </Modal>
    </section>

    <!-- The site-wide contact modal, in-flow: the real dialog is not in the
         DOM until opened, so this is what puts its form in front of axe —
         the NavMenu `inline` idea. -->
    <section aria-label="Contact modal (inline)">
      <ContactModal inline />
    </section>

    <section aria-labelledby="form-heading" class="space-y-4">
      <h2 id="form-heading" class="text-xl font-semibold">Form</h2>
      <Form method="POST" action="?/contact" class="space-y-4" errors={{}}>
        <Field
          name="email"
          label="Email"
          type="email"
          description="We use this only to reply."
          required
          bind:value={email}
        />
        <Field name="message" label="Message" type="textarea" required bind:value={message} />
        <button type="submit" class="px-4 py-2 bg-primary text-white rounded bump"> Send </button>
      </Form>
    </section>

    <section aria-labelledby="form-errors-heading" class="space-y-4">
      <h2 id="form-errors-heading" class="text-xl font-semibold">Form with errors</h2>
      <Form
        method="POST"
        class="space-y-4"
        errors={{
          email: "Email is required.",
          message: "Message must be at least 10 characters.",
        }}
      >
        <Field name="email" label="Email" type="email" required error="Email is required." />
        <Field
          name="message"
          label="Message"
          type="textarea"
          required
          error="Message must be at least 10 characters."
        />
        <button type="submit" class="px-4 py-2 bg-primary text-white rounded bump"> Send </button>
      </Form>
    </section>

    <section aria-labelledby="hero-image-heading" class="space-y-4">
      <h2 id="hero-image-heading" class="text-xl font-semibold">Hero background image</h2>
      <div class="relative h-40 overflow-hidden">
        <HeroBackgroundImage image={heroImage} altFallback="Placeholder hero" />
      </div>
    </section>

    <section aria-labelledby="img-heading" class="space-y-4">
      <h2 id="img-heading" class="text-xl font-semibold">Progressive image</h2>
      <Img src={runImport} alt="Placeholder progressive image" />
    </section>

    <section aria-labelledby="vimeo-banner-heading" class="space-y-4">
      <h2 id="vimeo-banner-heading" class="text-xl font-semibold">Vimeo banner</h2>
      <!-- No real video plays in CI: the iframe mounts only after genuine input,
         so axe sees the poster-only state. -->
      <VimeoBanner vimeoId="1" poster={runImport} alt="Placeholder banner reel" />
    </section>

    <section aria-labelledby="screen-width-media-heading" class="space-y-4">
      <h2 id="screen-width-media-heading" class="text-xl font-semibold">Screen-width media</h2>
      <!-- Poster-only (no vimeoId) so the fixture makes no external requests:
         the video iframe needs a live player.vimeo.com src, so its a11y
         attributes (tabindex="-1", aria-hidden) are asserted in
         ScreenWidthMedia.test.ts instead. -->
      <ScreenWidthMedia
        src={placeholder.wide}
        altText="Placeholder background"
        percentHeight={30}
      />
    </section>

    <section aria-labelledby="slider-heading" class="space-y-4">
      <h2 id="slider-heading" class="text-xl font-semibold">Slider</h2>
      <Slider itemCount={3} label="Example slides">
        {#snippet children({ index }: { index: number })}
          <div class="border-2 border-primary rounded p-6">
            <p>Slide body {index + 1}</p>
          </div>
        {/snippet}
      </Slider>
    </section>

    <section aria-labelledby="slider-autoplay-heading" class="space-y-4">
      <h2 id="slider-autoplay-heading" class="text-xl font-semibold">Slider (autoplay)</h2>
      <!-- Rotation is live during the axe run so the pause/play control and the
         muted live region are what get audited — the moving state is the one
         users hit. -->
      <Slider itemCount={3} label="Autoplaying slides" autoplay={5000}>
        {#snippet children({ index }: { index: number })}
          <div class="border-2 border-primary rounded p-6">
            <p>Autoplay slide body {index + 1}</p>
          </div>
        {/snippet}
      </Slider>
    </section>

    <section aria-labelledby="countup-heading" class="space-y-4">
      <h2 id="countup-heading" class="text-xl font-semibold">Count up</h2>
      <!-- The animating digits live in an aria-hidden layer; a visually-hidden
         sibling carries the final value for assistive tech, so axe audits the
         two-layer structure. -->
      <p class="text-3xl font-bold">
        <CountUp value={1284} suffix="+" /> projects delivered
      </p>
    </section>
  </div>

  <!-- Prismic slices — full-bleed, OUTSIDE the narrow column: these ship
       edge-to-edge, and a width cap here hides real layout bugs. Each renders
       its own <section> + heading; axe audits the produced markup (contrast,
       alt text, heading order). -->
  <HeartHero slice={heartHeroFixture} />
  <Hero slice={heroSliceFixture} />
  <MediaText slice={mediaTextFixture} />
  <SectionGrid slice={sectionGridFixture} />
  <LeadText slice={leadTextFixture} />
  <LeadText slice={leadTextOnDarkFixture} />
  <IconColumns slice={iconColumnsFixture} />
  <SectionGrid slice={sectionGridOnDarkFixture} />
  <TextColumns slice={textColumnsFixture} />
  <AccordionSlice slice={accordionFixture} />
  <Testimonial slice={testimonialFixture} />
  <CtaBanner slice={ctaBannerFixture} />
  <CtaBanner slice={ctaBannerOnDarkFixture} />
  <StatsBand slice={statsBandFixture} />
  <LeadText slice={leadTextStatementFixture} />
  <CtaBanner slice={ctaBannerOnCreamFixture} />
  <Testimonial slice={testimonialOnCreamFixture} />
  <ImageBand slice={imageBandFixture} />
  <PageMasthead slice={pageMastheadFixture} />
  <StatementPanel slice={statementPanelFixture} />
  <PersonGrid slice={personGridFixture} />
  <PersonGrid slice={personGridNoHeadingFixture} />
  <PersonGrid slice={personGridBioOnlyFixture} />
  <DonationForm slice={donationLinksFixture} />
  <DonationForm slice={donationFormFixture} />
</div>

<!-- Renders nothing at rest (overlay only appears mid-navigation, aria-hidden);
     mounted so the axe gate covers its resting state. -->
