// ============================================
// BACKGROUND.JS - Extração de todos os documentos (com logs e melhorias)
// ============================================

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Extrai um documento de uma URL (abre aba temporária)
async function extrairDocumento(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: url, active: false }, async (tab) => {
      let tentativas = 0;
      const maxTentativas = 40;        // Aumentado (antes 20)
      const intervalo = setInterval(async () => {
        tentativas++;
        try {
          // Injeta o content script na aba temporária
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // Solicita extração do texto da página
          const resultado = await chrome.tabs.sendMessage(tab.id, { action: 'extrairTextoPagina' });
          if (resultado && resultado.texto && resultado.texto.length > 100) {
            clearInterval(intervalo);
            chrome.tabs.remove(tab.id);
            resolve({ texto: resultado.texto, url: url });
            return;
          }
        } catch(e) {
          // Ignora erros temporários (script ainda não pronto)
        }
        if (tentativas >= maxTentativas) {
          clearInterval(intervalo);
          chrome.tabs.remove(tab.id);
          resolve({ texto: '', url: url, erro: 'Timeout após ' + maxTentativas + ' tentativas' });
        }
      }, 800); // Aumentado de 500ms para 800ms
    });
  });
}

// Extrai todos os documentos de uma lista de URLs (sequencial com delay)
async function extrairTodosDocumentos(urls, sendResponse) {
  console.log('[Background] extrairTodosDocumentos iniciado, total de URLs:', urls.length);
  const resultados = [];
  
  for (let i = 0; i < urls.length; i++) {
    const link = urls[i];
    console.log(`[Background] Extraindo documento ${i+1}/${urls.length}: ${link.titulo}`);
    
    // Envia progresso para o sidepanel (opcional)
    chrome.runtime.sendMessage({
      action: 'progressoExtração',
      current: i + 1,
      total: urls.length,
      titulo: link.titulo
    }).catch(() => {}); // sidepanel pode estar fechado, ignora erro
    
    const resultado = await extrairDocumento(link.url);
    resultados.push({
      titulo: link.titulo,
      tipo: link.tipo,
      texto: resultado.texto || '',
      url: link.url,
      erro: resultado.erro || null
    });
    
    // Delay entre requisições para não sobrecarregar o servidor/judiciário
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('[Background] extrairTodosDocumentos finalizado');
  sendResponse({ documentos: resultados });
}

// Listener principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Mensagem recebida, action:', request.action);

  // Extração normal da página atual
  if (request.action === 'extrairProcesso') {
    console.log('[Background] Processando extrairProcesso');
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
    console.log('[Background] Processando extrairTodosDocumentos');
    const urls = request.urls;
    if (!urls || urls.length === 0) {
      sendResponse({ error: 'Nenhum documento encontrado' });
      return true;
    }
    extrairTodosDocumentos(urls, sendResponse);
    return true;
  }

  // Qualquer outra ação
  console.warn('[Background] Ação desconhecida:', request.action);
  sendResponse({ error: 'Ação desconhecida' });
  return true;
});