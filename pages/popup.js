(() => {
  const DEFAULTS = { enabled: true, showTrailer: true };
  document.documentElement.lang = chrome.i18n.getUILanguage().replace("_", "-");
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
  }

  chrome.storage.sync.get(DEFAULTS, (settings) => {
    document.getElementById("enabled").checked = settings.enabled;
    document.getElementById("showTrailer").checked = settings.showTrailer;
  });

  for (const id of Object.keys(DEFAULTS)) {
    document.getElementById(id).addEventListener("change", (event) => {
      chrome.storage.sync.set({ [id]: event.target.checked });
    });
  }

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
