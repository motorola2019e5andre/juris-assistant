chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      if (!tab.url || tab.url.startsWith('chrome://')) {
        sendResponse({ error: 'Não é possível extrair desta página' });
        return;
      }
      
      try {
        // Injeta o content.js em todos os frames (incluindo iframes)
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content.js']
        });
        
        // Aguarda o carregamento do conteúdo (aumentado para 2000ms)
        setTimeout(async () => {
          try {
            const results = await chrome.tabs.sendMessage(tab.id, { action: 'extrairProcesso' });
            sendResponse(results);
          } catch (err) {
            sendResponse({ error: 'Erro ao extrair: ' + err.message });
          }
        }, 2000);
        
      } catch (error) {
        sendResponse({ error: 'Erro ao injetar script: ' + error.message });
      }
    });
    
    // Mantém o canal aberto para resposta assíncrona
    return true;
  }
});