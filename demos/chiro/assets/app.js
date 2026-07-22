/* =============================================================================
   app.js — site-wide interactions for Lumen Dental.
   No dependencies. Each feature is opt-in via a data-attribute or element id,
   so pages only pay for what they use.

   Features:
     • Scroll-reveal (IntersectionObserver)
     • Animated stat counters
     • Before/after image comparison sliders
     • FAQ accordions
     • Smile-gallery filter tabs
     • Booking flow: service + time selection, validation, hand-off to checkout
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Scroll reveal ---------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. Stat counters ---------------------------------------- */
  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nums.forEach(function (n) { n.textContent = formatCount(n); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        animateCount(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }
  function formatCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    return (el.getAttribute("data-prefix") || "") + target.toLocaleString() + (el.getAttribute("data-suffix") || "");
  }
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = prefix + val.toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target.toLocaleString() + suffix;
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 3. Before / after sliders ------------------------------- */
  function initBeforeAfter() {
    document.querySelectorAll("[data-ba]").forEach(function (root) {
      var before = root.querySelector(".ba__before");
      var handle = root.querySelector(".ba__handle");
      if (!before || !handle) return;

      function setPos(clientX) {
        var rect = root.getBoundingClientRect();
        var x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        var pct = (x / rect.width) * 100;
        before.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        handle.style.left = pct + "%";
        root.setAttribute("aria-valuenow", Math.round(pct));
      }

      var dragging = false;
      root.addEventListener("pointerdown", function (e) { dragging = true; root.setPointerCapture(e.pointerId); setPos(e.clientX); });
      root.addEventListener("pointermove", function (e) { if (dragging) setPos(e.clientX); });
      root.addEventListener("pointerup", function () { dragging = false; });
      root.addEventListener("pointercancel", function () { dragging = false; });

      // Keyboard support
      root.setAttribute("tabindex", "0");
      root.setAttribute("role", "slider");
      root.setAttribute("aria-label", "Drag to compare before and after");
      root.setAttribute("aria-valuemin", "0");
      root.setAttribute("aria-valuemax", "100");
      root.setAttribute("aria-valuenow", "50");
      root.addEventListener("keydown", function (e) {
        var cur = parseInt(root.getAttribute("aria-valuenow"), 10) || 50;
        if (e.key === "ArrowLeft") { cur = Math.max(0, cur - 4); }
        else if (e.key === "ArrowRight") { cur = Math.min(100, cur + 4); }
        else return;
        e.preventDefault();
        before.style.clipPath = "inset(0 " + (100 - cur) + "% 0 0)";
        handle.style.left = cur + "%";
        root.setAttribute("aria-valuenow", cur);
      });
    });
  }

  /* ---------- 4. FAQ accordion ---------------------------------------- */
  function initFaq() {
    document.querySelectorAll(".faq__q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        var panel = btn.nextElementSibling;
        // Optional single-open behaviour within a .faq group
        var group = btn.closest(".faq");
        if (group && !expanded) {
          group.querySelectorAll(".faq__q[aria-expanded='true']").forEach(function (other) {
            if (other !== btn) {
              other.setAttribute("aria-expanded", "false");
              other.nextElementSibling.style.maxHeight = null;
            }
          });
        }
        btn.setAttribute("aria-expanded", String(!expanded));
        panel.style.maxHeight = expanded ? null : panel.scrollHeight + "px";
      });
    });
  }

  /* ---------- 5. Gallery filter tabs ---------------------------------- */
  function initGalleryTabs() {
    var tabWrap = document.querySelector("[data-gallery-tabs]");
    if (!tabWrap) return;
    var items = document.querySelectorAll("[data-cat]");
    tabWrap.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabWrap.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var cat = tab.getAttribute("data-filter");
        items.forEach(function (item) {
          var show = cat === "all" || item.getAttribute("data-cat") === cat;
          item.classList.toggle("hidden", !show);
        });
      });
    });
  }

  /* ---------- 6. Booking flow ----------------------------------------- */
  // Services patients can book, with the reservation deposit for each.
  var SERVICES = {
    "new-patient":   { label: "New Patient Exam & First Adjustment", deposit: 40, duration: "60 min" },
    "adjustment":    { label: "Chiropractic Adjustment",             deposit: 25, duration: "30 min" },
    "decompression": { label: "Spinal Decompression Session",        deposit: 40, duration: "45 min" },
    "sports":        { label: "Sports Injury Evaluation",            deposit: 40, duration: "45 min" },
    "massage":       { label: "Therapeutic Massage (60 min)",        deposit: 40, duration: "60 min" },
    "posture":       { label: "Posture & Ergonomics Assessment",     deposit: 30, duration: "45 min" },
  };
  window.LUMEN_SERVICES = SERVICES; // expose for checkout page

  function initBooking() {
    var form = document.getElementById("bookingForm");
    if (!form) return;

    var selectedTime = null;
    var slots = form.querySelectorAll(".slot");
    slots.forEach(function (s) {
      s.addEventListener("click", function () {
        if (s.disabled) return;
        slots.forEach(function (o) { o.classList.remove("active"); });
        s.classList.add("active");
        selectedTime = s.getAttribute("data-time");
        var hidden = document.getElementById("bk-time");
        if (hidden) hidden.value = selectedTime;
        clearFieldError(document.getElementById("timeField"));
      });
    });

    // Pre-select a service if arriving via ?service=whitening
    var pre = new URLSearchParams(location.search).get("service");
    if (pre && SERVICES[pre]) {
      var radio = form.querySelector('input[name="service"][value="' + pre + '"]');
      if (radio) radio.checked = true;
    }

    // Default the date input to tomorrow, min = today.
    var dateInput = document.getElementById("bk-date");
    if (dateInput) {
      var today = new Date();
      var tomorrow = new Date(today.getTime() + 86400000);
      dateInput.min = today.toISOString().split("T")[0];
      dateInput.value = tomorrow.toISOString().split("T")[0];
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;

      // Validate required text fields
      ["bk-name", "bk-email", "bk-phone", "bk-date"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.value.trim()) { showFieldError(el.closest(".field")); ok = false; }
        else if (el) clearFieldError(el.closest(".field"));
      });

      // Email sanity check
      var email = document.getElementById("bk-email");
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        showFieldError(email.closest(".field")); ok = false;
      }

      // Service selected?
      var service = form.querySelector('input[name="service"]:checked');
      if (!service) { showFieldError(document.getElementById("serviceField")); ok = false; }

      // Time selected?
      if (!selectedTime) { showFieldError(document.getElementById("timeField")); ok = false; }

      if (!ok) {
        var firstErr = form.querySelector(".show-err");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Persist the booking and hand off to the (simulated) checkout.
      var booking = {
        service: service.value,
        serviceLabel: SERVICES[service.value].label,
        deposit: SERVICES[service.value].deposit,
        duration: SERVICES[service.value].duration,
        date: document.getElementById("bk-date").value,
        time: selectedTime,
        name: document.getElementById("bk-name").value.trim(),
        email: document.getElementById("bk-email").value.trim(),
        phone: document.getElementById("bk-phone").value.trim(),
        notes: (document.getElementById("bk-notes") || {}).value || "",
      };
      try { sessionStorage.setItem("truenorth_booking", JSON.stringify(booking)); } catch (err) {}
      // Demo: show an inline confirmation instead of a payment step.
      var card = form.closest(".form-card");
      if (card) {
        card.innerHTML =
          '<div style="text-align:center;padding:2.5rem 1rem">' +
            '<div style="width:64px;height:64px;margin:0 auto 1.2rem;border-radius:50%;background:var(--teal-050);display:grid;place-items:center;color:var(--teal-deep)">' +
              '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
            "</div>" +
            '<h2 style="font-size:var(--fs-h2);margin-bottom:.6rem">You\u2019re on the books' + (booking.name ? ", " + booking.name.split(" ")[0] : "") + "!</h2>" +
            '<p style="max-width:46ch;margin:0 auto 1.4rem">' + booking.serviceLabel + " \u00b7 " + booking.date + " at " + booking.time +
              ".<br>We\u2019ve sent a confirmation to <b>" + booking.email + "</b>. (This is a demo \u2014 no real appointment was created.)</p>" +
            '<a class="btn btn--primary" href="/demos/chiro/index.html">Back to home</a>' +
          "</div>";
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function showFieldError(field) { if (field) field.classList.add("show-err"); }
  function clearFieldError(field) { if (field) field.classList.remove("show-err"); }

  // Clear a field's error as soon as the user fixes it.
  function initLiveValidation() {
    document.querySelectorAll(".field .control").forEach(function (c) {
      c.addEventListener("input", function () {
        var field = c.closest(".field");
        if (field && field.classList.contains("show-err") && c.value.trim()) clearFieldError(field);
      });
    });
    document.querySelectorAll('input[name="service"]').forEach(function (r) {
      r.addEventListener("change", function () { clearFieldError(document.getElementById("serviceField")); });
    });
  }

  /* ---------- Contact form (mock submit) ------------------------------ */
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["ct-name", "ct-email", "ct-message"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.value.trim()) { showFieldError(el.closest(".field")); ok = false; }
        else if (el) clearFieldError(el.closest(".field"));
      });
      if (!ok) return;
      form.classList.add("hidden");
      var done = document.getElementById("contactSuccess");
      if (done) { done.classList.remove("hidden"); done.scrollIntoView({ behavior: "smooth", block: "center" }); }
    });
  }

  /* ---------- boot ---------------------------------------------------- */
  function boot() {
    initReveal();
    initCounters();
    initBeforeAfter();
    initFaq();
    initGalleryTabs();
    initBooking();
    initLiveValidation();
    initContactForm();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
