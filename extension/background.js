// Inkover background service worker.
// Clicking the toolbar icon (or Alt+Shift+P) injects / toggles the paint overlay.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (err) {
    // Chrome blocks injection on chrome://, the Web Store and some built-in pages.
    console.warn("Inkover can't run on this page:", err && err.message);
    chrome.action.setBadgeBackgroundColor({ color: "#e84832", tabId: tab.id });
    chrome.action.setBadgeText({ text: "✕", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
  }
});

// Screenshot request from the overlay ("Save" button).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "inkover:capture") {
    const windowId = sender.tab ? sender.tab.windowId : undefined;
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ ok: false, error: chrome.runtime.lastError && chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, dataUrl });
      }
    });
    return true; // keep the channel open for the async response
  }
});
