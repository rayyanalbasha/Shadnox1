const toggleButton = document.getElementById("toggleButton");
const toggleLabel = document.getElementById("toggleLabel");
const toggleSymbol = document.getElementById("toggleSymbol");
const statusText = document.getElementById("statusText");
const statusPill = document.getElementById("statusPill");
const slider = document.getElementById("strengthSlider");
const strengthValue = document.getElementById("strengthValue");
const hotkeyLabel = document.getElementById("hotkeyLabel");
const hotkeyButton = document.getElementById("hotkeyButton");
const hotkeyReset = document.getElementById("hotkeyReset");
const hotkeyHint = document.getElementById("hotkeyHint");
const hotkeyError = document.getElementById("hotkeyError");
const backgroundCheck = document.getElementById("backgroundCheck");

const isMac = navigator.platform.toLowerCase().includes("mac");
let recording = false;
let currentHotkey = "";

function formatHotkey(accelerator) {
  return accelerator
    .split("+")
    .map(part => {
      if (part === "CommandOrControl") return isMac ? "CMD" : "CTRL";
      if (part === "Command") return "CMD";
      if (part === "Control") return "CTRL";
      if (part === "Super") return "WIN";
      if (part === "Return") return "ENTER";
      if (/^num/i.test(part)) return "NUM " + part.slice(3).toUpperCase();
      return part.toUpperCase();
    })
    .join(" + ");
}

function renderState(state) {
  const enabled = Boolean(state.enabled);
  toggleLabel.textContent = enabled ? "Turn off overlay" : "Turn on overlay";
  toggleSymbol.textContent = enabled ? "◌" : "◉";
  statusText.textContent = enabled ? "Overlay is active" : "Currently off";
  statusPill.textContent = enabled ? "ON" : "OFF";
  statusPill.classList.toggle("on", enabled);
  toggleButton.classList.toggle("is-on", enabled);

  slider.value = state.strength;
  strengthValue.textContent = state.strength;

  if (typeof state.runInBackground === "boolean") {
    backgroundCheck.checked = state.runInBackground;
  }

  renderCustom(state);

  if (state.hotkey) {
    currentHotkey = state.hotkey;
    if (!recording) hotkeyLabel.textContent = formatHotkey(state.hotkey);
  }
}

toggleButton.addEventListener("click", async () => {
  const state = await window.privateScreen.toggleOverlay();
  renderState(state);
});

slider.addEventListener("input", async () => {
  strengthValue.textContent = slider.value;
  const state = await window.privateScreen.setStrength(slider.value);
  renderState(state);
});

window.privateScreen.onStateChanged(renderState);

backgroundCheck.addEventListener("change", async () => {
  renderState(await window.privateScreen.setBackground(backgroundCheck.checked));
});

// ---- Change shortcut ----

const SPECIAL_KEYS = {
  Space: "Space", Enter: "Return", Tab: "Tab", Backspace: "Backspace",
  Delete: "Delete", Insert: "Insert", Home: "Home", End: "End",
  PageUp: "PageUp", PageDown: "PageDown",
  ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Minus: "-", Equal: "=", Comma: ",", Period: ".", Slash: "/",
  Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]",
  Backslash: "\\", Backquote: "`",
  NumpadAdd: "numadd", NumpadSubtract: "numsub", NumpadMultiply: "nummult",
  NumpadDivide: "numdiv", NumpadDecimal: "numdec", NumpadEnter: "Return",
  PrintScreen: "PrintScreen", CapsLock: "Capslock", NumLock: "Numlock", ScrollLock: "Scrolllock",
  MediaPlayPause: "MediaPlayPause", MediaStop: "MediaStop",
  MediaTrackNext: "MediaNextTrack", MediaTrackPrevious: "MediaPreviousTrack",
  AudioVolumeUp: "VolumeUp", AudioVolumeDown: "VolumeDown", AudioVolumeMute: "VolumeMute"
};

function keyFromEvent(event) {
  const code = event.code;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  if (/^Numpad[0-9]$/.test(code)) return "num" + code.slice(6);
  return SPECIAL_KEYS[code] || null;
}

function stopRecording() {
  recording = false;
  hotkeyButton.textContent = "Change";
  hotkeyLabel.classList.remove("recording");
  hotkeyLabel.textContent = formatHotkey(currentHotkey || "CommandOrControl+Shift+P");
  hotkeyHint.textContent = "Use your keyboard shortcut anytime";
  window.privateScreen.hotkeyRecording(false);
}

function startRecording() {
  hotkeyButton.blur();
  recording = true;
  hotkeyError.textContent = "";
  hotkeyButton.textContent = "Cancel";
  hotkeyLabel.classList.add("recording");
  hotkeyLabel.textContent = "PRESS KEYS…";
  hotkeyHint.textContent = "Press any key or combination. Esc to cancel";
  window.privateScreen.hotkeyRecording(true);
}

hotkeyButton.addEventListener("click", () => {
  if (recording) stopRecording();
  else startRecording();
});

hotkeyReset.addEventListener("click", async () => {
  if (recording) stopRecording();
  hotkeyError.textContent = "";
  hotkeyHint.textContent = "Use your keyboard shortcut anytime";
  renderState(await window.privateScreen.resetHotkey());
});

window.addEventListener("keydown", async event => {
  if (!recording) return;
  event.preventDefault();

  if (event.key === "Escape") {
    stopRecording();
    return;
  }

  if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;

  const key = keyFromEvent(event);
  if (!key) {
    hotkeyError.textContent = "That key can't be used. Try another.";
    return;
  }

  const parts = [];
  if (event.ctrlKey) parts.push(isMac ? "Control" : "CommandOrControl");
  if (event.metaKey) parts.push(isMac ? "Command" : "Super");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  const hasModifier = parts.length > 0;

  parts.push(key);
  const accelerator = parts.join("+");

  recording = false;
  hotkeyButton.textContent = "Change";
  hotkeyLabel.classList.remove("recording");
  hotkeyHint.textContent = "Use your keyboard shortcut anytime";

  const result = await window.privateScreen.setHotkey(accelerator);
  if (result.error) {
    hotkeyError.textContent = result.error;
    await window.privateScreen.hotkeyRecording(false);
  } else {
    hotkeyError.textContent = "";
    if (!hasModifier) {
      hotkeyHint.textContent = "Heads up: this key won't type anywhere while Private Screen is running";
    }
  }
  renderState(result);
  hotkeyLabel.textContent = formatHotkey(result.hotkey || currentHotkey);
});

window.addEventListener("blur", () => {
  if (recording) stopRecording();
});

window.privateScreen.getState().then(renderState);


// ================= Tabs =================
const shell = document.getElementById("shell");
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    if (recording) stopRecording();
    const name = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => {
      const on = t === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    document.getElementById("panel-privacy").hidden = name !== "privacy";
    document.getElementById("panel-custom").hidden = name !== "custom";
    shell.classList.toggle("wide", name === "custom");
  });
});

// ================= Customization =================
const $ = id => document.getElementById(id);
const api = window.privateScreen;

function showStatus(el, message, isError) {
  el.textContent = message || "";
  el.className = "col-status" + (message ? (isError ? " err" : " ok") : "");
}

async function run(button, statusEl, work, okMessage) {
  button.disabled = true;
  showStatus(statusEl, "Working…");
  try {
    const result = await work();
    if (result && result.platform) renderState(result);
    if (result && result.error) showStatus(statusEl, result.error, true);
    else showStatus(statusEl, okMessage);
  } catch (_) {
    showStatus(statusEl, "Something went wrong. Try again.", true);
  } finally {
    button.disabled = false;
  }
}

async function chooseImage(purpose, previewEl, nameEl, applyBtn, statusEl) {
  const result = await api.pickImage(purpose);
  if (!result) return;
  if (result.error) {
    showStatus(statusEl, result.error, true);
    return;
  }
  previewEl.style.backgroundImage = 'url("' + result.preview + '")';
  previewEl.classList.add("has-img");
  nameEl.textContent = result.name;
  applyBtn.disabled = false;
  showStatus(statusEl, "");
}

// -- Desktop wallpaper
$("deskPick").addEventListener("click", () =>
  chooseImage("desktop", $("deskPreview"), $("deskName"), $("deskApply"), $("deskStatus")));
$("deskApply").addEventListener("click", () =>
  run($("deskApply"), $("deskStatus"), () => api.applyDesktopWallpaper(), "Desktop wallpaper changed."));

// -- Lock screen
$("lockPick").addEventListener("click", () =>
  chooseImage("lock", $("lockPreview"), $("lockName"), $("lockApply"), $("lockStatus")));
$("lockApply").addEventListener("click", () =>
  run($("lockApply"), $("lockStatus"), () => api.applyLockScreen(), "Lock screen wallpaper changed. Press Win + L to check it."));
$("lockReset").addEventListener("click", () =>
  run($("lockReset"), $("lockStatus"), () => api.resetLockScreen(), "Default lock screen restored."));

// -- Colour picker
const picker = (() => {
  const pad = $("svPad"), padThumb = $("svThumb");
  const bar = $("hueBar"), barThumb = $("hueThumb");
  const hexInput = $("hexInput"), swatch = $("swatch");
  let h = 250, s = 0.55, v = 1;

  const clamp = n => Math.min(1, Math.max(0, n));

  function toRgb(h, s, v) {
    const f = n => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return [f(5), f(3), f(1)].map(x => Math.round(x * 255));
  }
  function toHex() {
    return "#" + toRgb(h, s, v).map(x => x.toString(16).padStart(2, "0")).join("");
  }
  function fromHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    v = max;
    s = max === 0 ? 0 : d / max;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }
    return true;
  }
  function paint(skipInput) {
    pad.style.background =
      "linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(" + h + " 100% 50%))";
    padThumb.style.left = s * 100 + "%";
    padThumb.style.top = (1 - v) * 100 + "%";
    barThumb.style.left = (h / 360) * 100 + "%";
    const hex = toHex();
    swatch.style.background = hex;
    if (!skipInput) hexInput.value = hex.toUpperCase();
  }
  function drag(el, onMove) {
    el.addEventListener("pointerdown", e => {
      el.setPointerCapture(e.pointerId);
      onMove(e);
      const move = ev => onMove(ev);
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
    });
  }
  drag(pad, e => {
    const r = pad.getBoundingClientRect();
    s = clamp((e.clientX - r.left) / r.width);
    v = 1 - clamp((e.clientY - r.top) / r.height);
    paint();
  });
  drag(bar, e => {
    const r = bar.getBoundingClientRect();
    h = clamp((e.clientX - r.left) / r.width) * 360;
    paint();
  });
  hexInput.addEventListener("input", () => {
    let text = hexInput.value.trim();
    if (text && text[0] !== "#") text = "#" + text;
    if (fromHex(text)) paint(true);
  });
  hexInput.addEventListener("blur", () => paint());
  paint();

  return {
    get: () => toHex(),
    set: hex => { if (fromHex(hex)) paint(); }
  };
})();

$("tbApply").addEventListener("click", () =>
  run($("tbApply"), $("tbStatus"), () => api.applyTaskbarColor(picker.get()), "Taskbar color applied."));
$("tbReset").addEventListener("click", () =>
  run($("tbReset"), $("tbStatus"), () => api.resetTaskbar(), "Taskbar reset to the default."));
$("tbTransparent").addEventListener("change", () => {
  const on = $("tbTransparent").checked;
  run($("tbTransparent"), $("tbStatus"), () => api.setTaskbarTransparent(on),
    on ? "Taskbar background removed." : "Taskbar background restored.");
});
$("startLogin").addEventListener("change", () => {
  const on = $("startLogin").checked;
  run($("startLogin"), $("tbStatus"), () => api.setStartWithWindows(on),
    on ? "Shadnox will start with Windows." : "Shadnox will no longer start with Windows.");
});

let pickerSynced = false;
function renderCustom(state) {
  const supported = state.platform === "win32";
  document.querySelectorAll("[data-winonly]").forEach(card => {
    card.classList.toggle("unsupported", !supported);
    const body = card.querySelector(".col-body");
    if (body) body.inert = !supported;
  });

  if (!pickerSynced && state.taskbarColor) {
    picker.set(state.taskbarColor);
    pickerSynced = true;
  }
  $("tbTransparent").checked = Boolean(state.taskbarTransparent);
  $("startLogin").checked = Boolean(state.startWithWindows);
  $("tbCurrent").textContent = state.taskbarColorApplied
    ? "Applied color: " + String(state.taskbarColor).toUpperCase()
    : "Using the Windows default";
}
