(function () {
  const STORAGE_KEY = "reversiSettings";
  const DEFAULTS = {
    showLegalMoves: true,
    animationSpeed: "normal",
    theme: "classic",
    defaultDifficulty: "medium",
  };

  const VALID_VALUES = {
    animationSpeed: ["slow", "normal", "fast"],
    theme: ["classic", "dark", "neon"],
    defaultDifficulty: ["easy", "medium", "advanced", "hard"],
  };

  function normalize(settings = {}) {
    return {
      showLegalMoves: typeof settings.showLegalMoves === "boolean" ? settings.showLegalMoves : DEFAULTS.showLegalMoves,
      animationSpeed: VALID_VALUES.animationSpeed.includes(settings.animationSpeed) ? settings.animationSpeed : DEFAULTS.animationSpeed,
      theme: VALID_VALUES.theme.includes(settings.theme) ? settings.theme : DEFAULTS.theme,
      defaultDifficulty: VALID_VALUES.defaultDifficulty.includes(settings.defaultDifficulty)
        ? settings.defaultDifficulty
        : DEFAULTS.defaultDifficulty,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return normalize(JSON.parse(raw));
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  function applyToDocument(settings) {
    const normalized = normalize(settings);
    document.documentElement.dataset.theme = normalized.theme;
    document.documentElement.dataset.animationSpeed = normalized.animationSpeed;
    return normalized;
  }

  function save(settings) {
    const normalized = normalize(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    applyToDocument(normalized);
    return normalized;
  }

  function update(partial) {
    return save({ ...load(), ...partial });
  }

  window.reversiPreferences = {
    STORAGE_KEY,
    DEFAULTS,
    load,
    save,
    update,
    normalize,
    applyToDocument,
  };

  applyToDocument(load());
})();
