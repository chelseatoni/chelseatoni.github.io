/* Chelsea Toni — sticker logo.
   One fixed logo sticker that:
   1. gets slapped onto the page on load,
   2. peels at the corner when you hover it,
   3. peels off the wall and sticks into the nav bar when you scroll.
   Other pages: set <body data-page="work"> (anything but "home") and the logo
   starts already stuck in the nav. */

(function () {
  "use strict";

  var body = document.body;
  var isHome = body.dataset.page === "home";
  var logo = document.getElementById("logo");
  var base = document.getElementById("logoBase");
  var flap = document.getElementById("logoFlap");
  var menuBtn = document.getElementById("menuBtn");
  var links = document.getElementById("links");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RATIO = 1400 / 1027; // sticker image width / height

  var W = 0, H = 0;          // layout size of the sticker (hero size; nav size is a scale of this)
  var mode = isHome ? "hero" : "nav";
  var hovering = false;
  var kick = 0;              // extra peel (fraction of W) for the peel-off flight and the intro wink

  /* ---------- layout ---------- */

  function navHeight() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 76;
  }

  function layout(animate) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var nh = navHeight();
    var small = vw <= 760;

    W = Math.min(780, vw * 0.84, (vh - nh - 90) * RATIO);
    H = W / RATIO;
    logo.style.width = W + "px";
    logo.style.height = H + "px";

    if (!animate) logo.classList.add("no-anim");

    if (mode === "hero") {
      var x = (vw - W) / 2;
      var y = nh + (vh - nh - H) / 2;
      logo.style.transform = "translate(" + x + "px," + y + "px) rotate(0deg) scale(1)";
    } else {
      var targetH = small ? 84 : 112;
      var s = targetH / H;
      // sits on the bar and hangs a little below it, tilted like it was stuck on by hand
      logo.style.transform = "translate(" + (small ? 10 : 24) + "px," + (small ? 12 : 16) + "px) rotate(-4deg) scale(" + s + ")";
    }

    if (!animate) {
      void logo.offsetWidth; // flush so the jump doesn't animate
      logo.classList.remove("no-anim");
    }
    setPeel(peel.d);
  }

  /* ---------- the peel ---------- */
  // Fold the top-right corner (where the star is) back along a diagonal. d = how far the fold has travelled in.
  // The folded flap is the corner triangle reflected across the fold line, drawn as the
  // sticker's paper backing.

  function setPeel(d) {
    var maxD = Math.min(W, H) * 0.85;
    d = Math.max(0, Math.min(d, maxD));

    if (d < 0.5) {
      base.style.clipPath = "none";
      flap.style.visibility = "hidden";
      return;
    }

    var p = function (x, y) { return x.toFixed(1) + "px " + y.toFixed(1) + "px"; };

    // base sticker with the top-right corner cut away (fold line runs x - y = W - d)
    base.style.clipPath = "polygon(" + [
      p(-10, -10), p(W - d - 10, -10), p(W + 10, d + 10), p(W + 10, H + 10), p(-10, H + 10)
    ].join(",") + ")";

    // flap: clip to that corner triangle, then mirror it across the fold line
    var e = W - d;
    flap.style.clipPath = "polygon(" + [
      p(W - d - 10, -10), p(W + 10, d + 10), p(W + 10, -10)
    ].join(",") + ")";
    flap.style.transform = "matrix(0,1,1,0," + e.toFixed(1) + "," + (-e).toFixed(1) + ")";
    flap.style.visibility = "visible";
  }

  /* spring so the peel lifts quickly and settles back with a tiny bounce */
  var peel = { d: 0, v: 0 };
  var raf = null;
  var last = 0;

  function targetD() {
    var hover = hovering ? 0.34 : 0;
    return Math.max(hover, kick) * W;
  }

  function tick(now) {
    var dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    var t = targetD();
    var k = 260, damp = 20;
    peel.v += (k * (t - peel.d) - damp * peel.v) * dt;
    peel.d += peel.v * dt;
    setPeel(peel.d);
    if (Math.abs(t - peel.d) > 0.3 || Math.abs(peel.v) > 0.5) {
      raf = requestAnimationFrame(tick);
    } else {
      peel.d = t; peel.v = 0;
      setPeel(peel.d);
      raf = null;
    }
  }

  function wake() {
    if (reduceMotion) { peel.d = targetD(); setPeel(peel.d); return; }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function setKick(v, holdMs) {
    kick = v;
    wake();
    if (holdMs) setTimeout(function () { kick = 0; wake(); }, holdMs);
  }

  /* ---------- hover / touch ---------- */

  logo.addEventListener("pointerenter", function (e) {
    if (e.pointerType === "mouse") { hovering = true; wake(); }
  });
  logo.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse") { hovering = false; wake(); }
  });
  logo.addEventListener("focus", function () { hovering = true; wake(); });
  logo.addEventListener("blur", function () { hovering = false; wake(); });
  logo.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") setKick(0.34, 650);
  });

  /* ---------- scroll: peel off the wall, stick to the nav ---------- */

  function onScroll() {
    if (!isHome) return;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    if (mode === "hero" && y > vh * 0.2) {
      mode = "nav";
      body.classList.add("is-stuck");
      layout(true);
      setKick(0.6, 380); // starts peeled, presses flat as it lands
    } else if (mode === "nav" && y < vh * 0.08) {
      mode = "hero";
      body.classList.remove("is-stuck");
      layout(true);
      setKick(0.4, 320);
    }
  }

  /* ---------- phone menu ---------- */

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("open")) {
        links.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.focus();
      }
    });
  }


  /* ---------- red swipe between pages ---------- */

  var swipe = document.getElementById("swipe");

  function swipeOut() {
    document.documentElement.classList.remove("swipe-arrive");
    swipe.classList.remove("is-covering");
    swipe.classList.add("is-leaving");
  }

  if (swipe) {
    var arrived = false;
    try { arrived = !!sessionStorage.getItem("swipe"); sessionStorage.removeItem("swipe"); } catch (e) {}
    if (arrived && !reduceMotion) {
      void swipe.offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(swipeOut); });
    } else {
      document.documentElement.classList.remove("swipe-arrive");
    }

    window.addEventListener("pageshow", function (e) {
      if (e.persisted) { swipe.classList.remove("is-covering"); swipe.classList.add("is-leaving"); }
    });

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin !== location.origin || a.pathname === location.pathname) return;
      if (reduceMotion) return;
      e.preventDefault();
      // reset to the left edge instantly, then sweep across
      swipe.classList.remove("is-leaving");
      swipe.style.transition = "none";
      void swipe.offsetWidth;
      swipe.style.transition = "";
      swipe.classList.add("is-covering");
      try { sessionStorage.setItem("swipe", "1"); } catch (err) {}
      setTimeout(function () { location.href = a.href; }, 620);
    });
  }


  /* ---------- illustration gallery: tilt + sheen, filters, lightbox ---------- */

  var gallery = document.getElementById("gallery");
  if (gallery) {
    var items = Array.prototype.slice.call(gallery.querySelectorAll(".work-item"));

    if (!reduceMotion) {
      items.forEach(function (el) {
        el.addEventListener("pointermove", function (e) {
          if (e.pointerType !== "mouse") return;
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          el.classList.add("is-hover");
          el.style.setProperty("--ry", ((px - 0.5) * 12).toFixed(2) + "deg");
          el.style.setProperty("--rx", ((0.5 - py) * 12).toFixed(2) + "deg");
          el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        });
        el.addEventListener("pointerleave", function () {
          el.classList.remove("is-hover");
          el.style.removeProperty("--rx");
          el.style.removeProperty("--ry");
        });
      });
    }

    var filters = document.querySelectorAll(".filter");
    Array.prototype.forEach.call(filters, function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.dataset.filter;
        Array.prototype.forEach.call(filters, function (b) {
          var on = b === btn;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        items.forEach(function (el) { el.hidden = !(f === "all" || el.dataset.kind === f); });
      });
    });

    var lb = document.getElementById("lightbox");
    var lbImg = document.getElementById("lbImg");
    var lbCap = document.getElementById("lbCap");
    var lbClose = document.getElementById("lbClose");
    var lastFocus = null;

    function openLb(el) {
      lastFocus = el;
      lbImg.src = el.dataset.full;
      lbImg.alt = el.dataset.alt || "";
      lbCap.textContent = el.dataset.kind === "painting" ? "Painting" : "Illustration";
      lb.hidden = false;
      lbClose.focus();
    }
    function closeLb() {
      lb.hidden = true;
      lbImg.src = "";
      if (lastFocus) lastFocus.focus();
    }
    items.forEach(function (el) { el.addEventListener("click", function () { openLb(el); }); });
    lbClose.addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) closeLb(); });
  }


  /* ---------- VOLUME page: feature tabs move the highlight on the phone ---------- */

  var tabs = document.querySelectorAll(".v-tab");
  var hl = document.getElementById("vHl");
  if (tabs.length && hl) {
    var pick = function (tab) {
      var v = tab.dataset.hl.split(",");
      hl.style.setProperty("--t", v[0] + "%");
      hl.style.setProperty("--l", v[1] + "%");
      hl.style.setProperty("--w", v[2] + "%");
      hl.style.setProperty("--h", v[3] + "%");
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t === tab;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
    };
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener("click", function () { pick(t); });
      t.addEventListener("mouseenter", function () { pick(t); });
      t.addEventListener("focus", function () { pick(t); });
    });
  }


  /* ---------- VOLUME headphones: turn the dial (1 to 11) on the photo ---------- */

  var hpSvg = document.getElementById("hpSvg");
  if (hpSvg) {
    var stage = document.getElementById("hpStage");
    var tiltEl = document.getElementById("hpTilt");
    var hit = document.getElementById("dialHit");
    var marker = document.getElementById("hpMarker");
    var outEl = document.getElementById("hpVal");
    var subEl = document.getElementById("hpSub");
    var RG = JSON.parse(hpSvg.getAttribute("data-ring"));
    var value = 5;
    var dragging = false;
    var WORDS = ["Whisper", "Easy", "Easy", "Easy", "Loud", "Loud", "Loud", "Louder", "Louder", "Loudest", "Eleven."];

    // where numeral k sits on the ring, in photo coordinates
    function ringPoint(t, off) {
      var cx = RG.cx + RG.ux * RG.a * Math.cos(t) + RG.vx * RG.b * Math.sin(t);
      var cy = RG.cy + RG.uy * RG.a * Math.cos(t) + RG.vy * RG.b * Math.sin(t);
      // outward normal of the ellipse
      var nx = RG.ux * Math.cos(t) / RG.a + RG.vx * Math.sin(t) / RG.b;
      var ny = RG.uy * Math.cos(t) / RG.a + RG.vy * Math.sin(t) / RG.b;
      var l = Math.sqrt(nx * nx + ny * ny) || 1;
      return [cx + nx / l * off, cy + ny / l * off];
    }

    function setVal(v, user) {
      v = Math.max(1, Math.min(11, Math.round(v)));
      var changed = v !== value;
      var prev = value;
      value = v;
      var p = ringPoint(RG.t1 + (v - 1) * RG.span / 10, 27);
      marker.style.transform = "translate(" + p[0].toFixed(1) + "px," + p[1].toFixed(1) + "px)";
      outEl.textContent = (v < 10 ? "0" : "") + v;
      subEl.textContent = WORDS[v - 1];
      hit.setAttribute("aria-valuenow", v);
      hpSvg.style.setProperty("--lvl", v);
      hpSvg.style.setProperty("--o", (v / 11 * 0.8).toFixed(2));
      stage.classList.toggle("is-eleven", v === 11);
      if (user) stage.classList.add("is-used");
      if (changed) {
        try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {}
        if (v === 11 && prev !== 11 && !reduceMotion) {
          stage.classList.remove("is-bump");
          void stage.offsetWidth;
          stage.classList.add("is-bump");
          setTimeout(function () { stage.classList.remove("is-bump"); }, 450);
        }
      }
    }

    function fromPointer(e) {
      var pt = hpSvg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var q = pt.matrixTransform(hpSvg.getScreenCTM().inverse());
      var dx = q.x - RG.cx, dy = q.y - RG.cy;
      var xr = (dx * RG.ux + dy * RG.uy) / RG.a;
      var yr = (dx * RG.vx + dy * RG.vy) / RG.b;
      var t = Math.atan2(yr, xr);
      var TAU = Math.PI * 2;
      var s = ((t - RG.t1) % TAU + TAU) % TAU;
      if (s > RG.span) s = (s - RG.span) < (TAU - RG.span) / 2 ? RG.span : 0; // gap at the bottom: stop at the end of the scale
      setVal(1 + s / RG.span * 10, true);
    }

    hit.addEventListener("pointerdown", function (e) {
      dragging = true;
      stage.classList.add("is-dragging");
      try { hit.setPointerCapture(e.pointerId); } catch (err) {}
      fromPointer(e);
      e.preventDefault();
    });
    hit.addEventListener("pointermove", function (e) { if (dragging) fromPointer(e); });
    function endDrag() { dragging = false; stage.classList.remove("is-dragging"); }
    hit.addEventListener("pointerup", endDrag);
    hit.addEventListener("pointercancel", endDrag);
    hit.addEventListener("wheel", function (e) {
      e.preventDefault();
      setVal(value + (e.deltaY < 0 ? 1 : -1), true);
    }, { passive: false });
    hit.addEventListener("keydown", function (e) {
      var k = e.key, d = 0;
      if (k === "ArrowUp" || k === "ArrowRight") d = 1;
      else if (k === "ArrowDown" || k === "ArrowLeft") d = -1;
      else if (k === "Home") { e.preventDefault(); setVal(1, true); return; }
      else if (k === "End") { e.preventDefault(); setVal(11, true); return; }
      if (d) { e.preventDefault(); setVal(value + d, true); }
    });
    document.getElementById("hpUp").addEventListener("click", function () { setVal(value + 1, true); });
    document.getElementById("hpDown").addEventListener("click", function () { setVal(value - 1, true); });

    // hover: the headphones tilt toward the cursor
    if (!reduceMotion) {
      stage.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse" || dragging) return;
        var r = stage.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tiltEl.style.setProperty("--ry", (px * 12).toFixed(2) + "deg");
        tiltEl.style.setProperty("--rx", (-py * 8).toFixed(2) + "deg");
      });
      stage.addEventListener("pointerleave", function () {
        tiltEl.style.setProperty("--ry", "0deg");
        tiltEl.style.setProperty("--rx", "0deg");
      });
    }

    setVal(5, false);
  }

  /* ---------- go ---------- */

  var resizeTimer;
  window.addEventListener("resize", function () {
    layout(false);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(false); }, 120);
  });
  window.addEventListener("scroll", onScroll, { passive: true });

  if (!isHome) body.classList.add("is-stuck");
  layout(false);
  onScroll();

  // after the slap lands, give a quick hint that it peels
  if (isHome && !reduceMotion) {
    setTimeout(function () {
      if (!hovering && mode === "hero") setKick(0.2, 560);
    }, 1500);
  }
})();
