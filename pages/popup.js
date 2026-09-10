(() => {
  const DEFAULTS = { enabled: true, useProfile: false, showTrailer: true };
  document.documentElement.lang = chrome.i18n.getUILanguage().replace("_", "-");
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
  }

  // One list for drawing and for saving. They used to be two: the save loop ran
  // over every key in DEFAULTS and the restore was three hand-written lines
  // that were only two, so "Use my profile" was stored correctly and drawn as
  // off every time the popup opened - and the next click on it, which looked
  // like switching it on, switched it off.
  const controls = Object.keys(DEFAULTS).map((id) => document.getElementById(id));

  chrome.storage.sync.get(DEFAULTS, (settings) => {
    for (const control of controls) control.checked = Boolean(settings[control.id]);
  });

  for (const control of controls) {
    control.addEventListener("change", () => {
      chrome.storage.sync.set({ [control.id]: control.checked });
    });
  }

  // The same switches exist in the options page. Without this, changing one
  // there leaves an open popup showing the position it no longer has.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const control of controls) {
      if (control.id in changes) {
        control.checked = Boolean(changes[control.id].newValue ?? DEFAULTS[control.id]);
      }
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const match = tab?.url?.match(/^https:\/\/store\.steampowered\.com\/app\/([1-9]\d{0,7})(?:\/|$)/);
    if (!match) return;
    const link = document.getElementById("game-link");
    link.href = `https://steamprofiler.org/g/${match[1]}`;
    link.classList.remove("hidden");
  });

  document.getElementById("options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
})();
