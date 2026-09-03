/** Open state for the site-wide contact modal. The markup lives once, in
 *  <ContactModal> mounted by the root layout; any anchor to the contact
 *  route ("/contact", "/es/contact") opens it through the layout's
 *  beforeNavigate hook, so the nav, the footer and any Prismic link field reach it
 *  with a plain href — and without JavaScript that href is the contact page,
 *  which is the same form in-flow. */
export const contactModal = $state({
  open: false,
  /** What had focus when the navigation into the modal was cancelled — the
   *  nav's "Contact Us", a footer row, a link in a slice. A <dialog> restores
   *  focus to whatever was focused when it opened, but the modal opens from a
   *  cancelled navigation and that element is often gone by the time it
   *  closes (the nav menu closes and unmounts its own entries), so the
   *  browser has nowhere to return to and drops the visitor at <body>.
   *  Set in the layout's beforeNavigate; read at close time. */
  returnFocus: null as HTMLElement | null,
});
