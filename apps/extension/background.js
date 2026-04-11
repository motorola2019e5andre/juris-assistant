// ============================================
// BACKGROUND.JS - versão corrigida e estável
// ============================================

// Abre o sidepanel ao clicar no ícone
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listener principal para extrair processo
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
        // injeta content.js em todos os frames
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content.js']
        });

        // delay para garantir que o script foi injetado
        setTimeout(() => {
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'extrairProcesso' },
            (response) => {
              if (chrome.runtime.lastError) {
                sendResponse({ error: 'Erro comunicação: ' + chrome.runtime.lastError.message });
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
        sendResponse({ error: 'Erro ao injetar script: ' + error.message });
      }
    });

    return true; // mantém canal async aberto
  }

  // (Opcional) ação para abrir link de documento em segundo plano
  if (request.action === 'abrirEextrair') {
    chrome.tabs.create({ url: request.url, active: false }, async (newTab) => {
      // Aguarda o carregamento
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Injeta content.js na nova aba
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id, allFrames: true },
        files: ['content.js']
      });
      // Extrai texto
      const result = await chrome.tabs.sendMessage(newTab.id, { action: 'extrairTexto' });
      // Fecha a aba após extrair
      chrome.tabs.remove(newTab.id);
      sendResponse(result);
    });
    return true;
  }

});