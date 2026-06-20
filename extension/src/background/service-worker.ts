// Background service worker (Manifest V3)
// Future role: relay voice text from content script to backend /api/generate,
// receive the validated widget schema, and forward it back to the content script.
// For now this is an empty stub.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Overlai] Extension installed — background service worker ready.')
})
