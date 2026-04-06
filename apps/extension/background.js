chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'readCurrentPage') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      if (tab.url.startsWith('chrome://')) {
        sendResponse({ success: false, error: 'Não é possível ler páginas do Chrome' });
        return;
      }
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            return {
              success: true,
              url: window.location.href,
              andamento: document.body.innerText.substring(0, 3000),
              titulo: document.title
            };
          }
        });
        sendResponse(results[0].result);
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }
});