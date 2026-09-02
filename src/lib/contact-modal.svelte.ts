/** Open state for the site-wide contact modal. The markup lives once, in
 *  <ContactModal> mounted by the root layout; any anchor to the contact
 *  route ("/contact", "/es/contact") opens it through the layout's
 *  beforeNavigate hook, so the nav, the footer and any Prismic link field reach it
 *  with a plain href — and without JavaScript that href is the contact page,
 *  which is the same form in-flow. */
export const contactModal = $state({ open: false });
