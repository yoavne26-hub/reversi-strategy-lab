const preferencesApi = window.reversiPreferences;

const settingsStatusEl = document.getElementById("settingsStatus");
const settingsShowLegalMovesEl = document.getElementById("settingsShowLegalMoves");
const settingsAnimationSpeedEl = document.getElementById("settingsAnimationSpeed");
const settingsThemeEl = document.getElementById("settingsTheme");
const settingsDefaultDifficultyEl = document.getElementById("settingsDefaultDifficulty");

let settingsStatusTimer = null;

function setChoiceValue(groupEl, value) {
  if (!groupEl) return;
  groupEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.value === value;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function showStatus(message) {
  if (!settingsStatusEl) return;
  settingsStatusEl.textContent = message;
  settingsStatusEl.classList.add("is-visible");
  clearTimeout(settingsStatusTimer);
  settingsStatusTimer = window.setTimeout(() => {
    settingsStatusEl.textContent = "Preferences are saved locally in this browser.";
  }, 1600);
}

function applySettingsToControls(settings) {
  if (settingsShowLegalMovesEl) {
    settingsShowLegalMovesEl.checked = !!settings.showLegalMoves;
  }
  setChoiceValue(settingsAnimationSpeedEl, settings.animationSpeed);
  setChoiceValue(settingsThemeEl, settings.theme);
  setChoiceValue(settingsDefaultDifficultyEl, settings.defaultDifficulty);
}

function saveSettings(partial) {
  const nextSettings = preferencesApi.update(partial);
  applySettingsToControls(nextSettings);
  showStatus("Preferences saved.");
}

function wireChoiceGroup(groupEl, settingName) {
  if (!groupEl) return;
  groupEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !groupEl.contains(btn)) return;
    if (btn.classList.contains("active")) return;
    saveSettings({ [settingName]: btn.dataset.value });
  });
}

if (preferencesApi && settingsStatusEl) {
  const savedSettings = preferencesApi.load();
  applySettingsToControls(savedSettings);
  settingsStatusEl.textContent = "Preferences are saved locally in this browser.";

  settingsShowLegalMovesEl.addEventListener("change", () => {
    saveSettings({ showLegalMoves: settingsShowLegalMovesEl.checked });
  });

  wireChoiceGroup(settingsAnimationSpeedEl, "animationSpeed");
  wireChoiceGroup(settingsThemeEl, "theme");
  wireChoiceGroup(settingsDefaultDifficultyEl, "defaultDifficulty");
}
