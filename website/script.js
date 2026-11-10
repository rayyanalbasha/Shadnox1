(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- intro: lift the curtain ---------- */
  const start = () => document.body.classList.add("ready");
  if (document.readyState === "complete") requestAnimationFrame(() => setTimeout(start, 80));
  else window.addEventListener("load", () => setTimeout(start, 80));

  /* ---------- split headline into animated words ---------- */
  let wordIndex = 0;
  function splitNode(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const outer = document.createElement("span");
          outer.className = "w";
          const inner = document.createElement("span");
          inner.style.setProperty("--i", wordIndex++);
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== "BR") {
        splitNode(child);
      }
    });
  }
  $$("[data-split]").forEach(el => { wordIndex = 0; splitNode(el); });

  /* ---------- scroll reveal ---------- */
  const reveal = el => {
    el.classList.add("in");
    const delay = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
    setTimeout(() => el.classList.add("done"), (delay + 1.2) * 1000);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".rv").forEach(el => io.observe(el));
  } else {
    $$(".rv").forEach(reveal);
  }

  /* ---------- nav state ---------- */
  const nav = $(".nav-wrap");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- smooth in-page anchors ---------- */
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- page transition between pages ---------- */
  $$("a[href]").forEach(link => {
    link.addEventListener("click", e => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || link.target === "_blank") return;
      if (url.pathname === location.pathname) return;
      if (!/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      document.body.classList.add("leaving");
      setTimeout(() => { location.href = url.href; }, reduce ? 0 : 480);
    });
  });
  window.addEventListener("pageshow", e => {
    if (e.persisted) { document.body.classList.remove("leaving"); document.body.classList.add("ready"); }
  });

  /* ---------- card spotlight + magnetic buttons ---------- */
  $$(".card").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });
  if (!reduce) {
    $$(".mag").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.transform = `translate(${x}px, ${y - 3}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- about page: highlight current section in the contents list ---------- */
  const tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const map = new Map(tocLinks.map(a => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          tocLinks.forEach(a => a.classList.remove("on"));
          const a = map.get(e.target.id);
          if (a) a.classList.add("on");
        }
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- one smooth animation loop ---------- */
  const glow = $(".glow");
  const bar = $(".progress");
  const orbs = $$(".orb");
  const device = $("#device");
  const shade = $("#shade");
  const pct = $("#pct");
  const meter = $("#meter");

  let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
  let tx = 0, ty = 0, rx = 0, ry = 0;
  let sy = scrollY;
  const t0 = performance.now();

  window.addEventListener("pointermove", e => {
    mx = e.clientX; my = e.clientY;
    tx = (e.clientX / innerWidth - 0.5);
    ty = (e.clientY / innerHeight - 0.5);
  }, { passive: true });

  function frame(now) {
    // soft cursor glow
    gx += (mx - gx) * 0.07;
    gy += (my - gy) * 0.07;
    if (glow) glow.style.transform = `translate3d(${gx - 300}px, ${gy - 300}px, 0)`;

    // smoothed scroll for parallax + progress bar
    sy += (scrollY - sy) * 0.08;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    orbs.forEach((o, i) => o.style.setProperty("--py", `${-sy * (0.08 + i * 0.05)}px`));

    // 3D tilt on the preview device
    if (device && !reduce) {
      rx += (-ty * 9 - rx) * 0.06;
      ry += (tx * 13 - ry) * 0.06;
      device.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${(ry - 5).toFixed(2)}deg)`;
    }

    // Private Screen demo: overlay strength slowly breathes between 0 and 70%
    if (shade) {
      const t = (now - t0) / 1000;
      const v = reduce ? 0.45 : (Math.sin(t * 0.55 - 1.2) * 0.5 + 0.5);
      const dim = Math.round(v * 70);
      shade.style.opacity = (dim / 100).toFixed(3);
      if (pct) pct.textContent = dim + "%";
      if (meter) meter.style.width = (dim / 70 * 100).toFixed(1) + "%";
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
