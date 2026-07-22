/* =============================================================================
   art.js — programmatic SVG imagery for the Lumen Dental demo.

   All "photography" on this site is generated vector art, so there are zero
   copyrighted assets. Pages drop a placeholder element and this module fills it:

     <div data-art="portrait:186:0"></div>
     <div data-art="smile:before"></div>
     <div data-art="scene:hero"></div>

   Exposed as window.LumenArt for ad-hoc use (e.g. the checkout summary).
   ========================================================================== */
(function () {
  "use strict";

  // Monotonic counter so every generated gradient gets a globally-unique id,
  // even when the same portrait/smile/scene is rendered many times on a page.
  var uid = 0;
  function nextId(prefix) { return prefix + (uid++); }

  /* ---- Duotone abstract portraits (team + reviewers) ------------------ *
   * A calm, editorial silhouette on a tinted gradient. `variant` (0-5)
   * changes the hair/figure shape so people look distinct; `hue` sets tone. */
  function portrait(hue, variant) {
    hue = hue == null ? 186 : hue;
    variant = variant == null ? 0 : variant % 6;
    var id = nextId("p");
    var bgA = "hsl(" + hue + ",42%,90%)";
    var bgB = "hsl(" + ((hue + 24) % 360) + ",46%,78%)";
    var fig = "hsl(" + hue + ",30%,38%)";
    var figSoft = "hsla(" + hue + ",30%,38%,.22)";

    // Hair silhouette variants (drawn over the head circle).
    var hair = [
      '<path d="M108 150c0-34 24-58 42-58s42 24 42 58c6-2 8-20 8-34 0-40-26-64-50-64s-50 24-50 64c0 14 2 32 8 34z" fill="' + fig + '"/>',
      '<path d="M104 150c-2-52 20-74 46-74s48 22 46 74c10-8 6-40 0-54-8-20-26-34-46-34s-38 14-46 34c-6 14-10 46 0 54z" fill="' + fig + '"/>',
      '<path d="M110 140c0-40 18-58 40-58s40 18 40 58c8-6 10-18 10-32 0-36-22-58-50-58s-50 22-50 58c0 14 2 26 10 32z" fill="' + fig + '"/>',
      '<path d="M112 152c-6-30 14-60 38-60s44 30 38 60c8-10 8-30 4-44-6-22-24-38-42-38s-36 16-42 38c-4 14-4 34 4 44z" fill="' + fig + '"/>',
      '<path d="M106 150c0-46 22-66 44-66s44 20 44 66c6-4 6-24 4-38-4-30-24-50-48-50s-44 20-48 50c-2 14-2 34 4 38z" fill="' + fig + '"/>',
      '<path d="M110 146c0-38 18-56 40-56s40 18 40 56c9-4 7-22 5-36-4-32-24-52-45-52s-41 20-45 52c-2 14-4 32 5 36z" fill="' + fig + '"/>',
    ][variant];

    return svg("0 0 300 320",
      grad(id, [["0", bgA], ["1", bgB]], "0", "0", "1", "1") +
      '<rect width="300" height="320" fill="url(#' + id + ')"/>' +
      // soft backlight
      '<circle cx="150" cy="120" r="96" fill="hsla(' + hue + ',60%,100%,.35)"/>' +
      // shoulders / clinical coat
      '<path d="M150 196c46 0 84 30 92 74 3 16 4 34 4 50H54c0-16 1-34 4-50 8-44 46-74 92-74z" fill="' + fig + '"/>' +
      '<path d="M150 196c-14 0-27 3-38 8l38 46 38-46c-11-5-24-8-38-8z" fill="' + figSoft + '"/>' +
      // collar hint
      '<path d="M132 202l18 26 18-26-8-6-10 12-10-12z" fill="hsla(0,0%,100%,.85)"/>' +
      // head
      '<circle cx="150" cy="150" r="52" fill="' + fig + '"/>' +
      hair
    );
  }

  /* ---- Circular monogram avatar (compact reviewer badge) -------------- */
  function avatar(hue, initials) {
    hue = hue == null ? 186 : hue;
    var id = nextId("a");
    return svg("0 0 96 96",
      grad(id, [["0", "hsl(" + hue + ",52%,58%)"], ["1", "hsl(" + ((hue + 30) % 360) + ",54%,44%)"]], "0", "0", "1", "1") +
      '<rect width="96" height="96" rx="48" fill="url(#' + id + ')"/>' +
      '<text x="48" y="60" font-family="Fraunces, Georgia, serif" font-size="38" font-weight="500" fill="#fff" text-anchor="middle">' + esc(initials) + "</text>"
    );
  }

  /* ---- Before / after smile illustration ----------------------------- *
   * A stylised close-up smile. `after` brightens + straightens the teeth. */
  function smile(after) {
    var toothFill = after ? "#ffffff" : "#efe6cf";
    var toothEdge = after ? "#e6f1f0" : "#ddceac";
    var sgId = nextId("sg");
    var bg = after
      ? '<radialGradient id="' + sgId + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#eafaf6"/><stop offset="1" stop-color="#cdeee7"/></radialGradient>'
      : '<radialGradient id="' + sgId + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#f4ede2"/><stop offset="1" stop-color="#e4d7c4"/></radialGradient>';

    // Upper arch: 10 teeth along a gentle curve. In the "before" version a
    // couple are nudged/rotated and slightly narrower to imply crowding.
    var teeth = "";
    var positions = [
      { x: 150, w: 34, h: 52 }, { x: 188, w: 32, h: 54 }, { x: 224, w: 30, h: 52 },
      { x: 258, w: 30, h: 48 }, { x: 290, w: 30, h: 46 },
      { x: 320, w: 30, h: 46 }, { x: 352, w: 30, h: 48 }, { x: 386, w: 30, h: 52 },
      { x: 420, w: 32, h: 54 }, { x: 456, w: 34, h: 52 },
    ];
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      // curve: teeth dip lower toward the centre
      var mid = 4.5;
      var yOff = Math.abs(i - mid) * 3.4;
      var y = 150 + yOff;
      var rot = 0, dx = 0, w = p.w;
      if (!after) {
        // introduce imperfections in the "before" state
        if (i === 2) { rot = -9; }
        if (i === 3) { dx = -4; y += 6; }
        if (i === 6) { rot = 7; w = p.w - 4; }
        if (i === 7) { dx = 3; }
      }
      teeth +=
        '<g transform="translate(' + (p.x + dx) + ' ' + y + ') rotate(' + rot + ')">' +
          '<rect x="' + (-w / 2) + '" y="0" width="' + w + '" height="' + p.h + '" rx="' + (w * 0.34) + '" fill="' + toothFill + '" stroke="' + toothEdge + '" stroke-width="1.5"/>' +
          (after ? '<rect x="' + (-w / 2 + 4) + '" y="5" width="7" height="' + (p.h * 0.5) + '" rx="3" fill="#ffffff" opacity=".8"/>' : "") +
        "</g>";
    }

    return svg("0 0 600 400",
      "<defs>" + bg + "</defs>" +
      '<rect width="600" height="400" fill="url(#' + sgId + ')"/>' +
      // lips
      '<path d="M70 200c40-70 120-104 230-104s190 34 230 104c-40 78-120 116-230 116S110 278 70 200z" fill="#f7b8ac"/>' +
      '<path d="M70 200c40-70 120-104 230-104s190 34 230 104c-46 22-120 34-230 34S116 222 70 200z" fill="#e5776a"/>' +
      // inner mouth
      '<path d="M120 202c34-40 100-60 180-60s146 20 180 60c-34 60-104 92-180 92s-146-32-180-92z" fill="#7c2b2b"/>' +
      // gums
      '<path d="M128 196c32-34 96-52 172-52s140 18 172 52c-10 22-30 30-52 30-40 0-70-14-120-14s-80 14-120 14c-22 0-42-8-52-30z" fill="#e88f95"/>' +
      teeth +
      // tongue hint
      '<path d="M230 300c18-16 122-16 140 0 14 14 6 40-70 40s-84-26-70-40z" fill="#cc5b5b"/>' +
      // sparkle on "after"
      (after ? '<path d="M470 120l7 16 16 7-16 7-7 16-7-16-16-7 16-7z" fill="#fff"/><path d="M150 150l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#fff" opacity=".85"/>' : "")
    );
  }

  /* ---- Decorative "scene" panels (service media, hero) --------------- */
  function scene(kind) {
    var palettes = {
      hero:     ["#dff4ef", "#bfe8e0", "#0a7367"],
      general:  ["#e3f3ef", "#c6e9e1", "#0a7367"],
      cosmetic: ["#eef1fb", "#dbe2f7", "#3b56b0"],
      ortho:    ["#e9f5fb", "#cfe9f6", "#2b7fb0"],
      emergency:["#fdecea", "#f8d7d2", "#d84e3d"],
      clinic:   ["#e6f4f1", "#cdeae3", "#0a7367"],
      tech:     ["#eaf2f6", "#d3e6ef", "#2b7fb0"],
    };
    var c = palettes[kind] || palettes.clinic;
    var id = nextId("sc");
    var motif = sceneMotif(kind, c[2]);
    return svg("0 0 640 512",
      grad(id, [["0", c[0]], ["1", c[1]]], "0", "0", "1", "1") +
      '<rect width="640" height="512" fill="url(#' + id + ')"/>' +
      // ambient blobs
      '<circle cx="120" cy="110" r="120" fill="' + hexA(c[2], .06) + '"/>' +
      '<circle cx="540" cy="420" r="160" fill="' + hexA(c[2], .07) + '"/>' +
      '<circle cx="520" cy="90" r="60" fill="' + hexA("#ffffff", .5) + '"/>' +
      motif
    );
  }

  function sceneMotif(kind, color) {
    // Central emblem depends on the service.
    var tooth = '<path transform="translate(258 150) scale(5)" fill="' + hexA("#ffffff", .96) + '" stroke="' + hexA(color, .25) + '" stroke-width=".6" d="M12 3c-2.5 0-3.8 1.2-5.4 1.2-.9 0-1.4-.3-1.8-.3-.4 0-.6.4-.6 1.2 0 2.6.9 5.2 1.8 8 .6 2 1 4 1.8 4 1 0 .9-2.5 1.8-2.5h1.2c.9 0 .9 2.5 1.8 2.5.9 0 1.2-2 1.8-4 .9-2.8 1.8-5.4 1.8-8 0-.8-.2-1.2-.6-1.2-.4 0-.9.3-1.8.3C15.8 4.2 14.5 3 12 3z"/>';

    if (kind === "cosmetic") {
      return tooth + '<path d="M320 120l10 22 22 10-22 10-10 22-10-22-22-10 22-10z" fill="#fff"/>' +
        '<path d="M452 300l6 13 13 6-13 6-6 13-6-13-13-6 13-6z" fill="' + hexA("#ffffff", .8) + '"/>';
    }
    if (kind === "ortho") {
      // aligner arch
      return '<g transform="translate(150 190)">' +
        '<path d="M20 40 Q170 -60 320 40" fill="none" stroke="' + hexA("#ffffff", .9) + '" stroke-width="26" stroke-linecap="round"/>' +
        '<path d="M20 40 Q170 -60 320 40" fill="none" stroke="' + hexA(color, .35) + '" stroke-width="26" stroke-linecap="round" stroke-dasharray="6 26"/>' +
        "</g>" + tooth;
    }
    if (kind === "emergency") {
      return '<g transform="translate(320 256)">' +
        '<circle r="96" fill="' + hexA("#ffffff", .85) + '"/>' +
        '<path d="M0-52a44 44 0 0 1 0 104 44 44 0 0 1 0-104z" fill="none"/>' +
        '<rect x="-14" y="-52" width="28" height="104" rx="8" fill="' + color + '"/>' +
        '<rect x="-52" y="-14" width="104" height="28" rx="8" fill="' + color + '"/>' +
        "</g>";
    }
    if (kind === "tech") {
      return '<g transform="translate(140 150)" opacity=".9">' +
        '<rect x="0" y="0" width="360" height="220" rx="18" fill="' + hexA("#ffffff", .92) + '"/>' +
        '<rect x="24" y="28" width="150" height="14" rx="7" fill="' + hexA(color, .5) + '"/>' +
        '<rect x="24" y="56" width="312" height="10" rx="5" fill="' + hexA(color, .18) + '"/>' +
        '<rect x="24" y="78" width="280" height="10" rx="5" fill="' + hexA(color, .18) + '"/>' +
        '<path d="M40 150 q40-46 80 0 t80 0 t80 0 t80 0" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round"/>' +
        "</g>";
    }
    // default (general / clinic / hero): big tooth + subtle grid
    return tooth + '<path d="M300 300l6 13 13 6-13 6-6 13-6-13-13-6 13-6z" fill="' + hexA("#ffffff", .7) + '"/>';
  }

  /* ---- small SVG builders -------------------------------------------- */
  function svg(vb, inner) {
    return '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img">' + inner + "</svg>";
  }
  function grad(id, stops, x1, y1, x2, y2) {
    var s = stops.map(function (st) { return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"/>'; }).join("");
    return '<defs><linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + s + "</linearGradient></defs>";
  }
  function hexA(hex, a) {
    if (hex[0] !== "#") return hex;
    var h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  /* ---- hydrate [data-art] placeholders ------------------------------- */
  function hydrate() {
    document.querySelectorAll("[data-art]").forEach(function (el) {
      var spec = el.getAttribute("data-art").split(":");
      var kind = spec[0];
      if (kind === "portrait") el.innerHTML = portrait(Number(spec[1]), Number(spec[2]));
      else if (kind === "avatar") el.innerHTML = avatar(Number(spec[1]), spec[2] || "");
      else if (kind === "smile") el.innerHTML = smile(spec[1] === "after");
      else if (kind === "scene") el.innerHTML = scene(spec[1] || "clinic");
    });
  }

  window.LumenArt = { portrait: portrait, avatar: avatar, smile: smile, scene: scene, hydrate: hydrate };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hydrate);
  else hydrate();
})();
