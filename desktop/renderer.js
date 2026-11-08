const toggleButton = document.getElementById("toggleButton");
const toggleLabel = document.getElementById("toggleLabel");
const toggleSymbol = document.getElementById("toggleSymbol");
const statusText = document.getElementById("statusText");
const statusPill = document.getElementById("statusPill");
const slider = document.getElementById("strengthSlider");
const strengthValue = document.getElementById("strengthValue");
const hotkeyLabel = document.getElementById("hotkeyLabel");

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

if (navigator.platform.toLowerCase().includes("mac")) {
  hotkeyLabel.textContent = "CMD + SHIFT + P";
}

window.privateScreen.getState().then(renderState);
