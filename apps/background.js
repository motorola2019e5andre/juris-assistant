// ============================================
// BACKGROUND / SERVICE WORKER (CORRIGIDO)
// ============================================

// Abre o side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Função para garantir que o content script está ativo
async function garantirContentScript(tabId) {
  try {
    // tenta pingar o content script
    await chrome.tabs.sendMessage(tabId, { ping: true });
  } catch (e) {
    // se falhar, injeta
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}

// Listener principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {

    (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        // garante que o content script está carregado
        await garantirContentScript(tab.id);

        // tenta extrair
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'extrairProcesso'
        });

        sendResponse(response);

      } catch (error) {
        console.error('❌ Erro:', error);
        sendResponse({ error: error.message });
      }
    })();

    return true;
  }
});