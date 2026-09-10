(() => {
  const DEFAULTS = {
    enabled: true,
    showStats: true,
    useProfile: false,
    steamId: "",
    showTrailer: true,
    showProfileCards: true,
    language: "auto",
  };
  document.documentElement.lang = chrome.i18n.getUILanguage().replace("_", "-");
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
  }

  const controls = Object.keys(DEFAULTS).map((id) => document.getElementById(id));
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    for (const control of controls) {
      if (control.type === "checkbox") control.checked = settings[control.id];
      else control.value = settings[control.id];
    }
  });

  // The popup carries three of these switches, so a change made there has to
  // land here while this page is open. The focused control is left alone: a
  // value arriving under somebody's cursor while they are still typing their
  // SteamID would fight them for the field.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const control of controls) {
      if (!(control.id in changes) || control === document.activeElement) continue;
      const value = changes[control.id].newValue ?? DEFAULTS[control.id];
      if (control.type === "checkbox") control.checked = Boolean(value);
      else control.value = value;
    }
  });

  let timer;
  for (const control of controls) {
    control.addEventListener("change", () => {
      const value = control.type === "checkbox" ? control.checked : control.value;
      chrome.storage.sync.set({ [control.id]: value }, () => {
        const saved = document.getElementById("saved");
        saved.textContent = chrome.i18n.getMessage("saved");
        clearTimeout(timer);
        timer = setTimeout(() => { saved.textContent = ""; }, 1800);
      });
    });
  }
})();
