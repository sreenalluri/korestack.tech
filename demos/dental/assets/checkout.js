/* =============================================================================
   checkout.js — 100% SIMULATED payment flow for the Lumen Dental demo.

   ⚠️  There is NO real payment processor here. No network calls, no keys,
       no charges. This module fakes card formatting, brand detection,
       validation, a "processing" delay, and a receipt — purely to demonstrate
       a production-grade UX. The only card that "succeeds" is the well-known
       Stripe test number 4242 4242 4242 4242.
   ========================================================================== */
(function () {
  "use strict";

  if (!document.getElementById("checkoutRoot")) return;

  var TEST_CARD = "4242424242424242";

  /* ---------- Load the pending booking ---------------------------------- */
  function loadBooking() {
    try {
      var raw = sessionStorage.getItem("lumen_booking");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Fallback so the page is still presentable if opened directly.
    return {
      service: "new-patient",
      serviceLabel: "New Patient Exam & Cleaning",
      deposit: 50,
      duration: "60 min",
      date: null,
      time: "9:00 AM",
      name: "",
      email: "",
      phone: "",
      notes: "",
    };
  }

  var booking = loadBooking();

  /* ---------- Money helpers -------------------------------------------- */
  var deposit = Number(booking.deposit) || 50;
  var bookingFee = 0; // waived — shown to look real
  var total = deposit + bookingFee;
  function money(n) { return "$" + n.toFixed(2); }

  function formatDate(iso) {
    if (!iso) return "To be confirmed";
    // Parse as local date (avoid TZ shift) — iso is YYYY-MM-DD
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  /* ---------- Render order summary ------------------------------------- */
  function renderSummary() {
    var toothIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-2.5 0-3.8 1.2-5.4 1.2-.9 0-1.4-.3-1.8-.3-.4 0-.6.4-.6 1.2 0 2.6.9 5.2 1.8 8 .6 2 1 4 1.8 4 1 0 .9-2.5 1.8-2.5h1.2c.9 0 .9 2.5 1.8 2.5.9 0 1.2-2 1.8-4 .9-2.8 1.8-5.4 1.8-8 0-.8-.2-1.2-.6-1.2-.4 0-.9.3-1.8.3C15.8 4.2 14.5 3 12 3z"/></svg>';
    setHTML("sumItem",
      '<div class="summary__item">' +
        '<div class="thumb i-teal">' + toothIcon + "</div>" +
        "<div><b>" + esc(booking.serviceLabel) + "</b>" +
        "<span>" + esc(booking.duration || "") + " · Reservation deposit</span></div>" +
      "</div>");

    setHTML("sumRows",
      row("Appointment", formatDate(booking.date)) +
      row("Time", booking.time || "To be confirmed") +
      '<div class="summary__divider"></div>' +
      row("Reservation deposit", money(deposit)) +
      row("Booking fee", '<span style="color:var(--teal-deep);font-weight:600">Waived</span>', true));

    setText("sumTotal", money(total));
    setText("payBtnAmount", money(total));
  }
  function row(k, v, muted) {
    return '<div class="summary__row' + (muted ? " muted" : "") + '"><span>' + k + "</span><span>" + v + "</span></div>";
  }

  /* ---------- Card brand detection ------------------------------------- */
  function detectBrand(num) {
    if (/^4/.test(num)) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(num)) return "mastercard";
    if (/^3[47]/.test(num)) return "amex";
    if (/^6(011|5)/.test(num)) return "discover";
    return "generic";
  }
  var BRAND_SVG = {
    visa: '<svg viewBox="0 0 48 32" aria-label="Visa"><rect width="48" height="32" rx="4" fill="#1a1f71"/><path fill="#fff" d="M20.6 21.6h-3l1.9-11.2h3l-1.9 11.2zm11-10.9c-.6-.2-1.5-.5-2.7-.5-3 0-5.1 1.5-5.1 3.7 0 1.6 1.5 2.5 2.6 3 1.2.5 1.5.9 1.5 1.4 0 .7-.9 1.1-1.8 1.1-1.2 0-1.8-.2-2.8-.6l-.4-.2-.4 2.5c.7.3 2 .6 3.4.6 3.2 0 5.3-1.5 5.3-3.8 0-1.3-.8-2.3-2.5-3-1.1-.5-1.7-.8-1.7-1.3 0-.5.5-.9 1.7-.9 1 0 1.7.2 2.2.4l.3.1.4-2.5zm7.7-.3h-2.3c-.7 0-1.2.2-1.5.9l-4.4 10.3h3.1l.6-1.7h3.8l.4 1.7h2.8l-2.5-11.2zm-3.7 7.2l1.2-3.1c0 .1.2-.7.4-1.1l.2 1 .7 3.2h-2.5zM17.9 10.4l-2.9 7.6-.3-1.6c-.5-1.8-2.2-3.8-4.1-4.8l2.7 10h3.2l4.7-11.2h-3.3z"/><path fill="#f9a51a" d="M12.4 10.4H7.5l-.1.4c3.8.9 6.3 3.2 7.4 5.9l-1.1-5.4c-.2-.7-.7-.9-1.3-.9z"/></svg>',
    mastercard: '<svg viewBox="0 0 48 32" aria-label="Mastercard"><rect width="48" height="32" rx="4" fill="#252525"/><circle cx="19" cy="16" r="9" fill="#eb001b"/><circle cx="29" cy="16" r="9" fill="#f79e1b"/><path fill="#ff5f00" d="M24 9.2a9 9 0 0 0 0 13.6 9 9 0 0 0 0-13.6z"/></svg>',
    amex: '<svg viewBox="0 0 48 32" aria-label="American Express"><rect width="48" height="32" rx="4" fill="#2e77bc"/><text x="24" y="20" fill="#fff" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle">AMEX</text></svg>',
    discover: '<svg viewBox="0 0 48 32" aria-label="Discover"><rect width="48" height="32" rx="4" fill="#f2f2f2" stroke="#ddd"/><circle cx="34" cy="22" r="9" fill="#f68121"/><text x="20" y="19" fill="#111" font-family="Arial" font-size="6.5" font-weight="bold" text-anchor="middle">DISCOVER</text></svg>',
    generic: '<svg viewBox="0 0 48 32" aria-label="Card"><rect width="48" height="32" rx="4" fill="#e3edef"/><rect x="6" y="12" width="36" height="3" rx="1.5" fill="#9db4bd"/><rect x="6" y="19" width="16" height="3" rx="1.5" fill="#c3d3d7"/></svg>',
  };

  /* ---------- Input formatting ----------------------------------------- */
  function initCardInputs() {
    var num = document.getElementById("cc-number");
    var exp = document.getElementById("cc-exp");
    var cvc = document.getElementById("cc-cvc");
    var zip = document.getElementById("cc-zip");
    var brandBox = document.getElementById("brandIcon");
    brandBox.innerHTML = BRAND_SVG.generic;

    num.addEventListener("input", function () {
      var digits = num.value.replace(/\D/g, "").slice(0, 16);
      var brand = detectBrand(digits);
      brandBox.innerHTML = BRAND_SVG[brand] || BRAND_SVG.generic;
      // group in 4s
      num.value = digits.replace(/(.{4})/g, "$1 ").trim();
      clearError(num);
    });

    exp.addEventListener("input", function () {
      var d = exp.value.replace(/\D/g, "").slice(0, 4);
      if (d.length >= 3) exp.value = d.slice(0, 2) + " / " + d.slice(2);
      else exp.value = d;
      clearError(exp);
    });

    cvc.addEventListener("input", function () { cvc.value = cvc.value.replace(/\D/g, "").slice(0, 4); clearError(cvc); });
    zip.addEventListener("input", function () { zip.value = zip.value.replace(/\D/g, "").slice(0, 5); clearError(zip); });

    // Convenience: autofill the demo test card.
    var fill = document.getElementById("useTestCard");
    if (fill) fill.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("cc-name").value = booking.name || "Jordan Rivera";
      num.value = "4242 4242 4242 4242"; brandBox.innerHTML = BRAND_SVG.visa;
      exp.value = "12 / 28"; cvc.value = "123"; zip.value = "77098";
      document.querySelectorAll("#paymentForm .field").forEach(clearErrorField);
    });
  }

  /* ---------- Validation ------------------------------------------------ */
  function validate() {
    var ok = true;
    var name = document.getElementById("cc-name");
    var num = document.getElementById("cc-number");
    var exp = document.getElementById("cc-exp");
    var cvc = document.getElementById("cc-cvc");
    var zip = document.getElementById("cc-zip");

    if (!name.value.trim()) { markError(name, "Name on card is required."); ok = false; }

    var digits = num.value.replace(/\D/g, "");
    if (digits.length < 15 || !luhn(digits)) { markError(num, "Enter a valid card number."); ok = false; }

    var em = exp.value.replace(/\D/g, "");
    if (em.length < 4 || !validExpiry(em)) { markError(exp, "Enter a valid expiry (MM/YY)."); ok = false; }

    if (cvc.value.length < 3) { markError(cvc, "Enter the 3–4 digit code."); ok = false; }
    if (zip.value.length < 5) { markError(zip, "Enter a 5-digit ZIP."); ok = false; }

    return ok ? digits : null;
  }

  function luhn(num) {
    var sum = 0, dbl = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var d = parseInt(num.charAt(i), 10);
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  }
  function validExpiry(em) {
    var mm = parseInt(em.slice(0, 2), 10);
    var yy = parseInt(em.slice(2), 10);
    if (mm < 1 || mm > 12) return false;
    // Treat 2-digit year as 20xx; must be this month or later (ref date 2026).
    var year = 2000 + yy;
    var now = new Date();
    var curY = now.getFullYear(), curM = now.getMonth() + 1;
    if (year < curY || (year === curY && mm < curM)) return false;
    if (year > curY + 15) return false;
    return true;
  }

  function markError(input, msg) {
    var field = input.closest(".field");
    if (!field) return;
    field.classList.add("show-err");
    input.classList.add("invalid");
    var err = field.querySelector(".err");
    if (err && msg) err.textContent = msg;
  }
  function clearError(input) { var f = input.closest(".field"); if (f) { f.classList.remove("show-err"); input.classList.remove("invalid"); } }
  function clearErrorField(f) { f.classList.remove("show-err"); var c = f.querySelector(".control"); if (c) c.classList.remove("invalid"); }

  /* ---------- Submit → fake processing → result ------------------------ */
  function initSubmit() {
    var form = document.getElementById("paymentForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var digits = validate();
      if (!digits) {
        var firstErr = form.querySelector(".show-err");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      showProcessing(true);
      // Simulate network / processor latency.
      window.setTimeout(function () {
        showProcessing(false);
        if (digits === TEST_CARD) {
          renderSuccess(digits);
        } else {
          renderDecline();
        }
      }, 2200);
    });
  }

  function showProcessing(on) {
    var ov = document.getElementById("payOverlay");
    if (ov) ov.classList.toggle("show", on);
  }

  function renderDecline() {
    var box = document.getElementById("declineNote");
    if (box) {
      box.classList.remove("hidden");
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function confirmationNumber() {
    // Deterministic-ish pseudo-random ref (no Math.random dependency needed,
    // but this is client-side UX only). Uses time for uniqueness.
    var t = Date.now().toString(36).toUpperCase();
    return "LDS-" + t.slice(-6);
  }

  function renderSuccess(digits) {
    var last4 = digits.slice(-4);
    var conf = confirmationNumber();
    var checkoutView = document.getElementById("checkoutView");
    var successView = document.getElementById("successView");
    if (checkoutView) checkoutView.classList.add("hidden");
    if (!successView) return;

    successView.innerHTML =
      '<div class="success reveal in">' +
        '<div class="success__check">' + successCheckSVG() + "</div>" +
        "<h1>You're booked in. 🎉</h1>" +
        '<p class="success__lead">Thank you' + (booking.name ? ", " + esc(firstName(booking.name)) : "") +
          '. Your appointment is reserved and a confirmation has been sent to ' +
          "<b>" + (esc(booking.email) || "your email") + "</b>.</p>" +

        '<div class="receipt">' +
          '<div class="receipt__head">' +
            "<div><b>Appointment confirmed</b><div class='conf'>Confirmation " + conf + "</div></div>" +
            '<span class="paid-badge">' + checkSmall() + " Paid " + money(total) + "</span>" +
          "</div>" +
          '<div class="receipt__body">' +
            rrow("Service", esc(booking.serviceLabel)) +
            rrow("Date", formatDate(booking.date)) +
            rrow("Time", esc(booking.time || "To be confirmed")) +
            rrow("Location", "Lumen Dental Studio · 2400 Kirby Dr, Ste 120") +
            rrow("Deposit paid", money(deposit) + " (applied to your visit)") +
            rrow("Payment method", "•••• " + last4) +
          "</div>" +
        "</div>" +

        '<div class="alert alert--info" style="text-align:left;margin-bottom:1.5rem">' +
          infoIcon() +
          "<div>We'll text you a reminder 48 hours before. Need to reschedule? Just reply to the confirmation or call " +
          '<a href="tel:+17135550142">(713) 555-0142</a>. Your deposit is fully applied to your treatment.</div>' +
        "</div>" +

        '<div class="btn-row center">' +
          '<a class="btn btn--primary" href="/demos/dental/index.html">Back to Home</a>' +
          '<button class="btn btn--ghost" id="printReceipt" type="button">Print receipt</button>' +
        "</div>" +
        '<p class="secure-row" style="margin-top:1.6rem">' + lockIcon() +
          " Simulated confirmation — this is a Korestack demo, no real appointment was created.</p>" +
      "</div>";

    successView.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { sessionStorage.removeItem("lumen_booking"); } catch (e) {}

    var printBtn = document.getElementById("printReceipt");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  function rrow(k, v) { return '<div class="receipt__row"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>"; }
  function firstName(n) { return String(n).trim().split(/\s+/)[0]; }

  /* ---------- Small SVG helpers ---------------------------------------- */
  function successCheckSVG() {
    return '<svg viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="46" cy="46" r="44" fill="#e8f6f3"/>' +
      '<circle cx="46" cy="46" r="30" fill="#10a294"/>' +
      '<path d="M34 46.5l8 8 16-17" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";
  }
  function checkSmall() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'; }
  function infoIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'; }
  function lockIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'; }

  /* ---------- Utilities ------------------------------------------------ */
  function setHTML(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- boot ------------------------------------------------------ */
  function boot() {
    renderSummary();
    initCardInputs();
    initSubmit();
    // Prefill the cardholder name from the booking if we have it.
    var nameEl = document.getElementById("cc-name");
    if (nameEl && booking.name) nameEl.value = booking.name;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
