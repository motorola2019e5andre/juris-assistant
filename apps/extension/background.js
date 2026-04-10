// ============================================
// BACKGROUND.JS - versão corrigida e estável
// ============================================

// Abre o sidepanel ao clicar no ícone
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listener principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'extrairProcesso') {

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {

      const tab = tabs?.[0];

      if (!tab || !tab.id) {
        sendResponse({ error: 'Aba não encontrada' });
        return;
      }

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        sendResponse({ error: 'Não é possível extrair desta página' });
        return;
      }

      try {

        // injeta content.js
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content.js']
        });

        // pequeno delay para DOM
        setTimeout(() => {

          chrome.tabs.sendMessage(
            tab.id,
            { action: 'extrairProcesso' },
            (response) => {

              if (chrome.runtime.lastError) {
                sendResponse({
                  error: 'Erro comunicação: ' + chrome.runtime.lastError.message
                });
                return;
              }

              if (!response) {
                sendResponse({ error: 'Nenhum dado retornado' });
                return;
              }

              sendResponse(response);
            }
          );

        }, 800);

      } catch (error) {
        sendResponse({
          error: 'Erro ao injetar script: ' + error.message
        });
      }

    });

    return true; // mantém canal async aberto
  }

});