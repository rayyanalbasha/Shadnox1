const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const lerp = (a, b, t) => a + (b - a) * t;

// ---- Smooth anchor scrolling with easing (offset for the sticky nav) ----
function easeInOutCubic(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function smoothScrollTo(y, duration = 1000) {
  if (reduce) { window.scrollTo(0, y); return; }
  const start = window.scrollY;
  const dist = y - start;
  let t0 = null;
  function step(ts) {
    if (t0 === null) t0 = ts;
    const p = Math.min(1, (ts - t0) / duration);
    window.scrollTo(0, start + dist * easeInOutCubic(p));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const id = link.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    const top = id === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - 70;
    smoothScrollTo(top);
  });
});

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add("in"));
}

// ---- Scroll progress bar + nav state ----
const progress = document.getElementById("progress");
const nav = document.getElementById("nav");
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
    nav.classList.toggle("scrolled", window.scrollY > 10);
    ticking = false;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---- Cursor spotlight + 3D tilt on the hero app (smoothed with lerp) ----
if (!reduce && fine) {
  const spot = document.getElementById("spotlight");
  const app = document.getElementById("app");
  const stage = document.getElementById("stage");
  let tx = innerWidth / 2, ty = innerHeight / 3, cx = tx, cy = ty;
  let trx = 3, try_ = -6, crx = 3, cry = -6;

  window.addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  stage.addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    try_ = -6 + px * 14;
    trx = 3 - py * 12;
  });
  stage.addEventListener("pointerleave", () => { trx = 3; try_ = -6; });

  (function loop() {
    cx = lerp(cx, tx, .12); cy = lerp(cy, ty, .12);
    crx = lerp(crx, trx, .08); cry = lerp(cry, try_, .08);
    spot.style.setProperty("--mx", cx + "px");
    spot.style.setProperty("--my", cy + "px");
    app.style.setProperty("--rx", crx.toFixed(2) + "deg");
    app.style.setProperty("--ry", cry.toFixed(2) + "deg");
    requestAnimationFrame(loop);
  })();

  // ---- Card glow + gentle tilt ----
  document.querySelectorAll(".tilt").forEach(card => {
    let raf = 0;
    card.addEventListener("pointermove", e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--px", x * 100 + "%");
        card.style.setProperty("--py", y * 100 + "%");
        card.style.transition = "transform .1s linear, opacity 1s, filter 1s, border-color .3s";
        card.style.transform = "perspective(800px) rotateX(" + ((.5 - y) * 6).toFixed(2) + "deg) rotateY(" + ((x - .5) * 6).toFixed(2) + "deg) translateY(-4px)";
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      card.style.transition = "";
      card.style.transform = "";
    });
  });

  // ---- Magnetic buttons ----
  document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("pointermove", e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * .18;
      const y = (e.clientY - (r.top + r.height / 2)) * .28;
      btn.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transition = "transform .6s cubic-bezier(.22,1,.36,1), background .3s, color .3s, border-color .3s, box-shadow .4s";
      btn.style.transform = "";
      setTimeout(() => { btn.style.transition = ""; }, 600);
    });
  });
}

// ---- Live demo of the privacy overlay ----
const demo = {
  btn: document.getElementById("demoBtn"),
  label: document.getElementById("demoLabel"),
  sym: document.getElementById("demoSym"),
  status: document.getElementById("demoStatus"),
  pill: document.getElementById("demoPill"),
  shade: document.getElementById("shade"),
  range: document.getElementById("demoRange"),
  val: document.getElementById("demoVal"),
  on: false
};
function paintDemo() {
  demo.shade.style.opacity = demo.on ? (demo.range.value / 100).toFixed(2) : "0";
  demo.label.textContent = demo.on ? "Turn off overlay" : "Turn on overlay";
  demo.sym.textContent = demo.on ? "◌" : "◉";
  demo.status.textContent = demo.on ? "Overlay is active" : "Currently off";
  demo.pill.textContent = demo.on ? "ON" : "OFF";
  demo.pill.classList.toggle("on", demo.on);
  demo.btn.classList.toggle("on", demo.on);
  demo.val.textContent = demo.range.value;
}
demo.btn.addEventListener("click", () => { demo.on = !demo.on; paintDemo(); });
demo.range.addEventListener("input", paintDemo);
window.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.code === "KeyP") { e.preventDefault(); demo.on = !demo.on; paintDemo(); }
});
paintDemo();
