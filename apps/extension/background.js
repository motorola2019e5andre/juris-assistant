// ============================================
// BACKGROUND.JS - Extração de todos os documentos
// ============================================

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Extrai um documento de uma URL (abre aba temporária)
async function extrairDocumento(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: url, active: false }, async (tab) => {
      let tentativas = 0;
      const maxTentativas = 20; // 10 segundos
      const intervalo = setInterval(async () => {
        tentativas++;
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          const resultado = await chrome.tabs.sendMessage(tab.id, { action: 'extrairTextoPagina' });
          if (resultado && resultado.texto && resultado.texto.length > 100) {
            clearInterval(intervalo);
            chrome.tabs.remove(tab.id);
            resolve({ texto: resultado.texto, url: url });
            return;
          }
        } catch(e) {
          // Ignora erros temporários
        }
        if (tentativas >= maxTentativas) {
          clearInterval(intervalo);
          chrome.tabs.remove(tab.id);
          resolve({ texto: '', url: url, erro: 'Timeout' });
        }
      }, 500);
    });
  });
}

// Extrai todos os documentos de uma lista de URLs (sequencial)
async function extrairTodosDocumentos(urls, sendResponse) {
  const resultados = [];
  for (let i = 0; i < urls.length; i++) {
    const link = urls[i];
    // Opcional: envia progresso (pode ser ignorado pelo sidepanel)
    chrome.runtime.sendMessage({
      action: 'progressoExtração',
      current: i + 1,
      total: urls.length,
      titulo: link.titulo
    }).catch(() => {}); // ignora se não houver receptor
    const resultado = await extrairDocumento(link.url);
    resultados.push({
      titulo: link.titulo,
      tipo: link.tipo,
      texto: resultado.texto,
      url: link.url
    });
  }
  sendResponse({ documentos: resultados });
}

// Listener principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Extração normal da página atual
  if (request.action === 'extrairProcesso') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ error: 'Aba não encontrada' });
        return;
      }
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        sendResponse({ error: 'Não é possível extrair desta página' });
        return;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content.js']
        });
        setTimeout(async () => {
          try {
            const results = await chrome.tabs.sendMessage(tab.id, { action: 'extrairProcesso' });
            sendResponse(results);
          } catch (err) {
            sendResponse({ error: 'Erro ao extrair: ' + err.message });
          }
        }, 800);
      } catch (error) {
        sendResponse({ error: 'Erro ao injetar script: ' + error.message });
      }
    });
    return true;
  }

  // Extração em massa de todos os documentos
  if (request.action === 'extrairTodosDocumentos') {
    const urls = request.urls;
    if (!urls || urls.length === 0) {
      sendResponse({ error: 'Nenhum documento encontrado' });
      return true;
    }
    extrairTodosDocumentos(urls, sendResponse);
    return true;
  }

  // Qualquer outra ação pode ser ignorada ou respondida com erro
  sendResponse({ error: 'Ação desconhecida' });
  return true;
});