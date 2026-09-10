(() => {
  const DEFAULTS = {
    enabled: true,
    showStats: true,
    useProfile: false,
    steamId: "",
    showTrailer: true,
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
