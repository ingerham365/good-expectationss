/* ============================================================
   GOOD EXPECTATIONS — shared site behavior
   Nav, loader, hero particles, ecosystem map, engine builder,
   Ask GE modal, easter egg, custom cursor, contact form.
   ============================================================ */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* ---------- Loader ---------- */
  var loader = document.querySelector(".loader");
  if (loader) {
    document.body.classList.add("loading");
    var done = false;
    function hideLoader() {
      if (done) return;
      done = true;
      loader.classList.add("is-hidden");
      document.body.classList.remove("loading");
    }
    if (sessionStorage.getItem("ge-loaded")) {
      hideLoader();
    } else {
      setTimeout(function () {
        hideLoader();
        try { sessionStorage.setItem("ge-loaded", "1"); } catch (e) {}
      }, 1300);
    }
    loader.addEventListener("click", hideLoader);
  }

  /* ---------- Nav scroll state + mobile toggle ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 12) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Custom cursor (desktop, fine pointer only) ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    document.body.classList.add("custom-cursor");
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    var label = document.createElement("div");
    label.className = "cursor-label";
    label.textContent = "VIEW →";
    document.body.appendChild(dot);
    document.body.appendChild(label);
    window.addEventListener("mousemove", function (e) {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      label.style.left = e.clientX + "px";
      label.style.top = e.clientY + "px";
    });
    document.querySelectorAll("a, button, .engine-option, .eco-node").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        dot.classList.add("is-interactive");
        if (el.hasAttribute("data-cursor-view")) label.classList.add("is-visible");
      });
      el.addEventListener("mouseleave", function () {
        dot.classList.remove("is-interactive");
        label.classList.remove("is-visible");
      });
    });
  }

  /* ---------- Hero particle network ---------- */
  var canvas = document.querySelector(".hero-canvas");
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var w, h, particles, mouse = { x: null, y: null };
    var isMobile = window.innerWidth < 720;
    var COUNT = isMobile ? 34 : 80;

    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      canvas.style.width = canvas.offsetWidth + "px";
    }

    function makeParticles() {
      particles = [];
      for (var i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4 * devicePixelRatio,
          vy: (Math.random() - 0.5) * 0.4 * devicePixelRatio,
          r: (Math.random() * 1.6 + 0.6) * devicePixelRatio
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      var maxDist = 140 * devicePixelRatio;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        if (mouse.x !== null) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 160 * devicePixelRatio) {
            p.x += dx / d * 0.6;
            p.y += dy / d * 0.6;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(182,255,0,0.55)";
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var ddx = p.x - q.x, ddy = p.y - q.y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(182,255,0," + (0.12 * (1 - dist / maxDist)) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(step);
    }

    resize();
    makeParticles();
    requestAnimationFrame(step);
    window.addEventListener("resize", function () { resize(); makeParticles(); });
    window.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * devicePixelRatio;
      mouse.y = (e.clientY - rect.top) * devicePixelRatio;
    });
    window.addEventListener("mouseleave", function () { mouse.x = null; mouse.y = null; });
  }

  /* ---------- Engine: "What do you want to build?" ---------- */
  var paths = {
    business: ["IDEA", "RESEARCH", "VALIDATE", "BUILD", "LAUNCH", "GROW"],
    brand: ["IDEA", "POSITIONING", "IDENTITY", "BUILD", "LAUNCH", "GROW"],
    "ai-tool": ["IDEA", "RESEARCH", "PROTOTYPE", "BUILD", "TEST", "LAUNCH"],
    "digital-product": ["IDEA", "VALIDATE", "BUILD", "PACKAGE", "LAUNCH", "GROW"],
    "media-company": ["IDEA", "AUDIENCE", "FORMAT", "BUILD", "LAUNCH", "GROW"],
    sales: ["ASSESS", "STRATEGY", "PROCESS", "EXECUTE", "MEASURE", "GROW"],
    idea: ["IDEA", "RESEARCH", "VALIDATE", "DECIDE", "BUILD", "LAUNCH"],
    unsure: ["EXPLORE", "TALK IT THROUGH", "IDENTIFY DIRECTION", "RESEARCH", "DECIDE"]
  };
  var engineOptions = document.querySelectorAll(".engine-option");
  var enginePath = document.querySelector(".engine-path");
  if (engineOptions.length && enginePath) {
    var stepsEl = enginePath.querySelector(".engine-steps");
    engineOptions.forEach(function (btn) {
      btn.addEventListener("click", function () {
        engineOptions.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var key = btn.getAttribute("data-path");
        var steps = paths[key] || paths.idea;
        stepsEl.innerHTML = steps
          .map(function (s, i) {
            return '<span class="step">' + s + "</span>" + (i < steps.length - 1 ? '<span class="arrow">→</span>' : "");
          })
          .join("");
        enginePath.classList.add("is-visible");
        enginePath.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      });
    });
  }

  /* ---------- Ecosystem node map ---------- */
  var ecoNodes = document.querySelectorAll(".eco-node");
  var ecoDesc = document.querySelector(".eco-desc");
  if (ecoNodes.length) {
    var descriptions = {
      AI: "Agents, automation, and applied AI tools that accelerate research, content, and decision-making.",
      Data: "Market intelligence, customer behavior, and analytics used to find and evaluate opportunities.",
      Ventures: "New businesses moved through a repeatable path — idea, research, validation, build, launch.",
      Brands: "Consumer brands across home, lifestyle, and everyday categories, built with intention.",
      Products: "Software and digital products designed around real, validated demand.",
      Toolkit: "A growing library of AI prompts, workflows, and frameworks — Good Expectations' first live product.",
      Media: "Editorial, video, and audio built to share ideas worth sharing.",
      Labs: "Where early-stage experiments across AI, data, brand, media, and product get tested before they ship."
    };
    ecoNodes.forEach(function (node) {
      node.addEventListener("mouseenter", function () { highlight(node); });
      node.addEventListener("focus", function () { highlight(node); });
      node.addEventListener("click", function () { highlight(node); });
    });
    function highlight(active) {
      ecoNodes.forEach(function (n) {
        if (n === active) { n.classList.add("is-active"); n.classList.remove("is-dim"); }
        else { n.classList.remove("is-active"); n.classList.add("is-dim"); }
      });
      if (ecoDesc) {
        var name = active.getAttribute("data-node");
        ecoDesc.innerHTML = "<strong>" + name + ".</strong> " + (descriptions[name] || "");
      }
    }
    var wrap = document.querySelector(".eco-wrap");
    if (wrap) {
      wrap.addEventListener("mouseleave", function () {
        ecoNodes.forEach(function (n) { n.classList.remove("is-dim", "is-active"); });
        if (ecoDesc) ecoDesc.innerHTML = "Hover or tap a node to explore how it connects to the rest of Good Expectations.";
      });
    }
  }

  /* ---------- Manifesto sequential reveal ---------- */
  var manifestoLines = document.querySelectorAll(".manifesto-line");
  if (manifestoLines.length && "IntersectionObserver" in window) {
    var mio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add("is-active");
          else entry.target.classList.remove("is-active");
        });
      },
      { threshold: 0.6 }
    );
    manifestoLines.forEach(function (l) { mio.observe(l); });
  } else {
    manifestoLines.forEach(function (l) { l.classList.add("is-active"); });
  }

  /* ---------- Ask Good Expectations modal ---------- */
  var askBtn = document.querySelector(".ask-ge-btn");
  var askModal = document.querySelector(".ask-ge-modal");
  if (askBtn && askModal) {
    var askClose = askModal.querySelector(".ask-ge-close");
    var askInput = askModal.querySelector("input");
    var askResponse = askModal.querySelector(".ask-ge-response");
    function openAsk() { askModal.classList.add("is-open"); if (askInput) askInput.focus(); }
    function closeAsk() { askModal.classList.remove("is-open"); }
    askBtn.addEventListener("click", openAsk);
    if (askClose) askClose.addEventListener("click", closeAsk);
    askModal.addEventListener("click", function (e) { if (e.target === askModal) closeAsk(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAsk(); });

    function showDemoResponse(prompt) {
      if (!askResponse) return;
      askResponse.textContent =
        "AI DEMO — this interface is a preview of what's coming. \"" + prompt + "\" isn't being sent anywhere yet; no live AI backend is connected.";
      askResponse.classList.add("is-visible");
    }
    askModal.querySelectorAll(".ask-ge-suggestions button").forEach(function (b) {
      b.addEventListener("click", function () { showDemoResponse(b.textContent.replace(/^"|"$/g, "")); });
    });
    var askForm = askModal.querySelector("form");
    if (askForm) {
      askForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (askInput && askInput.value.trim()) showDemoResponse(askInput.value.trim());
      });
    }
  }

  /* ---------- GE Signal easter egg ---------- */
  var signalMarks = document.querySelectorAll("[data-ge-signal]");
  var overlay = document.querySelector(".system-overlay");
  if (signalMarks.length && overlay) {
    var clicks = 0, timer;
    signalMarks.forEach(function (mark) {
      mark.addEventListener("click", function () {
        clicks++;
        clearTimeout(timer);
        timer = setTimeout(function () { clicks = 0; }, 1600);
        if (clicks >= 5) {
          clicks = 0;
          overlay.classList.add("is-open");
        }
      });
    });
    var closeBtn = overlay.querySelector("button");
    if (closeBtn) closeBtn.addEventListener("click", function () { overlay.classList.remove("is-open"); });
  }

  /* ---------- Contact form ---------- */
  var forms = document.querySelectorAll("form[data-form]");
  forms.forEach(function (form) {
    var status = form.querySelector(".form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.querySelectorAll(".error-msg").forEach(function (el) { el.textContent = ""; });
      if (status) { status.textContent = ""; status.className = "form-status"; }

      var honeypot = form.querySelector('[name="company_website"]');
      if (honeypot && honeypot.value) return;

      var valid = true;
      form.querySelectorAll("[required]").forEach(function (field) {
        if (!field.value.trim()) {
          valid = false;
          var err = form.querySelector('.error-msg[data-for="' + field.name + '"]');
          if (err) err.textContent = "This field is required.";
        }
      });
      if (!valid) return;

      var endpoint = form.getAttribute("data-endpoint") || "/api/contact";
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
        .then(function (result) {
          if (result.ok) {
            if (status) { status.textContent = "Message sent — thanks for reaching out."; status.className = "form-status success"; }
            form.reset();
          } else {
            throw new Error((result.json && result.json.error) || "Something went wrong.");
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = "Something went wrong sending this. Please try again, or email directly at hello@goodexpectations.com.";
            status.className = "form-status error";
          }
        })
        .finally(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  });
})();
