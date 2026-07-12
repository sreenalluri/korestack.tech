/* =============================================================================
   layout.js — shared chrome for every Lumen Dental page.

   In a real build these would be server includes or a component framework.
   Here we keep the site 100% static + dependency-free by rendering the header
   and footer from a single source of truth, so the nav/footer stay identical
   across all pages. Each page just needs:

     <a class="skip-link" href="#main">Skip to content</a>
     <header id="site-header"></header>
     ... <main id="main"> page content </main> ...
     <footer id="site-footer"></footer>
     <script>window.LUMEN_PAGE = 'home';</script>   // active nav key
     <script src="assets/layout.js" defer></script>

   Set window.LUMEN_PAGE before this script runs to highlight the active link.
   ========================================================================== */
(function () {
  "use strict";

  // Practice details — single source of truth for NAP (name/address/phone).
  var BIZ = {
    name: "Lumen Dental Studio",
    phone: "(713) 555-0142",
    phoneHref: "tel:+17135550142",
    email: "hello@lumendental.example",
    address: "2400 Kirby Drive, Suite 120",
    city: "Houston, TX 77098",
  };

  // Brand mark (kept in sync with favicon.svg).
  var MARK =
    '<svg class="brand__mark" viewBox="0 0 64 64" aria-hidden="true">' +
      '<defs><linearGradient id="brandLg" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#12b6a5"/><stop offset="1" stop-color="#0a7367"/>' +
      '</linearGradient></defs>' +
      '<rect width="64" height="64" rx="16" fill="url(#brandLg)"/>' +
      '<path fill="#fff" opacity=".96" d="M32 14c-6.2 0-9.5 3.1-13.4 3.1-2.3 0-3.6-.8-4.6-.8-1 0-1.6.9-1.6 3.2 0 6.6 2.2 13 4.4 20 1.6 5.1 2.4 9.9 4.6 9.9 2.4 0 2.3-6.2 4.6-6.2h4c2.3 0 2.2 6.2 4.6 6.2 2.2 0 3-4.8 4.6-9.9 2.2-7 4.4-13.4 4.4-20 0-2.3-.6-3.2-1.6-3.2-1 0-2.3.8-4.6.8C41.5 17.1 38.2 14 32 14z"/>' +
      '<path fill="#bff3ec" d="M32 20.5l1.6 3.6 3.6 1.6-3.6 1.6L32 30.9l-1.6-3.6-3.6-1.6 3.6-1.6z"/>' +
    '</svg>';

  // All internal links use absolute paths rooted at the demo folder. Because
  // the site is served with trailingSlash:false, the folder index is served at
  // "/demos/dental" (no slash), which would break relative paths. Absolute
  // paths resolve correctly on every page and on Vercel.
  var BASE = "/demos/dental/";

  // Nav destinations. `key` matches window.LUMEN_PAGE for active-state styling.
  var NAV = [
    { key: "home",     label: "Home",         href: BASE + "index.html" },
    { key: "services", label: "Services",     href: BASE + "services.html" },
    { key: "about",    label: "About",        href: BASE + "about.html" },
    { key: "gallery",  label: "Smile Gallery", href: BASE + "smile-gallery.html" },
    { key: "reviews",  label: "Reviews",      href: BASE + "testimonials.html" },
    { key: "contact",  label: "Contact",      href: BASE + "contact.html" },
  ];

  var phoneIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  function activeKey() { return window.LUMEN_PAGE || "home"; }

  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var active = activeKey();

    var links = NAV.map(function (n) {
      var cur = n.key === active ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + n.href + '"' + cur + ">" + n.label + "</a>";
    }).join("");

    var drawerLinks = NAV.map(function (n) {
      var cur = n.key === active ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + n.href + '"' + cur + ">" + n.label + "</a>";
    }).join("");

    host.className = "site-header";
    host.innerHTML =
      '<nav class="nav" aria-label="Primary">' +
        '<a class="brand" href="' + BASE + 'index.html" aria-label="' + BIZ.name + ' home">' +
          MARK +
          '<span class="brand__word">Lumen<b>.</b>' +
            '<span class="brand__sub">Dental Studio</span>' +
          "</span>" +
        "</a>" +
        '<div class="nav__links">' + links + "</div>" +
        '<div class="nav__actions">' +
          '<a class="nav__phone" href="' + BIZ.phoneHref + '">' + phoneIcon + BIZ.phone + "</a>" +
          '<a class="btn btn--primary btn--sm" href="' + BASE + 'booking.html">Book Now</a>' +
          '<button class="nav__toggle" aria-label="Open menu" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>' +
          "</button>" +
        "</div>" +
      "</nav>" +
      '<div class="nav__drawer" id="navDrawer">' +
        '<div class="nav__panel">' +
          '<button class="nav__close" aria-label="Close menu">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' +
          "</button>" +
          drawerLinks +
          '<a class="btn btn--primary btn--block" href="' + BASE + 'booking.html">Book an Appointment</a>' +
          '<a class="nav__phone" href="' + BIZ.phoneHref + '">' + phoneIcon + BIZ.phone + "</a>" +
        "</div>" +
      "</div>";

    wireNav(host);
  }

  function wireNav(host) {
    var toggle = host.querySelector(".nav__toggle");
    var drawer = host.querySelector("#navDrawer");
    var close = host.querySelector(".nav__close");

    function open() { drawer.classList.add("open"); toggle.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; }
    function shut() { drawer.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }

    if (toggle) toggle.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    if (drawer) drawer.addEventListener("click", function (e) { if (e.target === drawer) shut(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") shut(); });
    // Close drawer when a link is tapped (in case of same-page anchors)
    drawer.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", shut); });

    // Elevate header on scroll
    function onScroll() { host.classList.toggle("scrolled", window.scrollY > 8); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function renderFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    var y = new Date().getFullYear();

    host.className = "site-footer";
    host.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="brand" href="' + BASE + 'index.html" aria-label="' + BIZ.name + ' home">' + MARK +
              '<span class="brand__word" style="color:#fff">Lumen<b>.</b></span>' +
            "</a>" +
            "<p>Calm, modern dentistry in the heart of Houston. Gentle care, honest advice, and technology that makes every visit easier.</p>" +
            '<div class="footer-social">' +
              socialLink("Instagram", '<path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.2 1 .46 1.4.86.4.4.66.8.86 1.4.17.4.36 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.2.6-.46 1-.86 1.4-.4.4-.8.66-1.4.86-.4.17-1 .36-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.2-1-.46-1.4-.86-.4-.4-.66-.8-.86-1.4-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.2-.6.46-1 .86-1.4.4-.4.8-.66 1.4-.86.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2zm0 3.3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 10.7a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm6.8-11a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>') +
              socialLink("Facebook", '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/>') +
              socialLink("Google", '<path d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22zM6.5 13.1a5.9 5.9 0 0 1 0-3.8V6.7H3.2a10 10 0 0 0 0 9l3.3-2.6zM12 6.5c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.2 6.7l3.3 2.6A5.9 5.9 0 0 1 12 6.5z"/>') +
            "</div>" +
          "</div>" +
          '<div class="footer-col">' +
            "<h4>Visit</h4>" +
            '<p>' + BIZ.address + "<br>" + BIZ.city + "</p>" +
            '<a href="' + BIZ.phoneHref + '">' + BIZ.phone + "</a>" +
            '<a href="mailto:' + BIZ.email + '">' + BIZ.email + "</a>" +
          "</div>" +
          '<div class="footer-col">' +
            "<h4>Care</h4>" +
            '<a href="' + BASE + 'services.html#general">General Dentistry</a>' +
            '<a href="' + BASE + 'services.html#cosmetic">Cosmetic</a>' +
            '<a href="' + BASE + 'services.html#ortho">Orthodontics</a>' +
            '<a href="' + BASE + 'services.html#emergency">Emergency Care</a>' +
          "</div>" +
          '<div class="footer-col">' +
            "<h4>Practice</h4>" +
            '<a href="' + BASE + 'about.html">About &amp; Team</a>' +
            '<a href="' + BASE + 'smile-gallery.html">Smile Gallery</a>' +
            '<a href="' + BASE + 'testimonials.html">Patient Reviews</a>' +
            '<a href="' + BASE + 'booking.html">Book Online</a>' +
          "</div>" +
        "</div>" +
        '<div class="footer-demo-note">' +
          "<b>Demo notice:</b> Lumen Dental Studio is a fictional practice built by " +
          '<a href="/" style="color:#8fded2">Korestack</a> to showcase a modern dental website. ' +
          "All names, reviews, and the payment flow are simulated — no real patient data or charges." +
        "</div>" +
        '<div class="footer-bottom">' +
          "<span>© " + y + " " + BIZ.name + " — a Korestack demo. All rights reserved.</span>" +
          '<span><a href="#">Privacy</a> · <a href="#">Accessibility</a> · <a href="#">Notice of Privacy Practices</a></span>' +
        "</div>" +
      "</div>";
  }

  function socialLink(label, path) {
    return '<a href="#" aria-label="' + label + '"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + path + "</svg></a>";
  }

  function boot() {
    renderHeader();
    renderFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
