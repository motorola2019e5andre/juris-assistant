// ============================================
// BACKGROUND.JS - Versão simplificada
// ============================================

// Abrir side panel quando clicar no ícone
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Extrair processo da página ativa
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      if (!tab.url || tab.url.startsWith('chrome://')) {
        sendResponse({ error: 'Não é possível extrair desta página' });
        return;
      }
      
      try {
        // Injeta o content script se necessário
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Aguarda e extrai
        setTimeout(async () => {
          const results = await chrome.tabs.sendMessage(tab.id, { action: 'extrairProcesso' });
          sendResponse(results);
        }, 500);
        
      } catch (error) {
        sendResponse({ error: error.message });
      }
    });
    return true;
  }
});