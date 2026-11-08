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
  Backslash: "\\", Backquote: "`"
};

function keyFromEvent(event) {
  const code = event.code;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
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
  hotkeyHint.textContent = "Hold Ctrl/Alt/Cmd and press a key. Esc to cancel";
  window.privateScreen.hotkeyRecording(true);
}

hotkeyButton.addEventListener("click", () => {
  if (recording) stopRecording();
  else startRecording();
});

hotkeyReset.addEventListener("click", async () => {
  if (recording) stopRecording();
  hotkeyError.textContent = "";
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
  if (event.metaKey && isMac) parts.push("Command");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const hasMainModifier = event.ctrlKey || event.altKey || (isMac && event.metaKey);
  if (!hasMainModifier) {
    hotkeyError.textContent = "Include Ctrl, Alt or Cmd so it doesn't trigger while typing.";
    return;
  }

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
  }
  renderState(result);
  hotkeyLabel.textContent = formatHotkey(result.hotkey || currentHotkey);
});

window.addEventListener("blur", () => {
  if (recording) stopRecording();
});

window.privateScreen.getState().then(renderState);
