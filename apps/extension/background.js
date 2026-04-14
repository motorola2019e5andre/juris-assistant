// ============================================
// BACKGROUND.JS - Extração robusta com retry e progresso
// ============================================

let cancelarExtracao = false;

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Extrai um documento com retry exponencial
async function extrairDocumento(url, tentativa = 1) {
  const maxTentativas = 3;
  const timeoutBase = 5000; // 5 segundos

  return new Promise((resolve) => {
    chrome.tabs.create({ url: url, active: false }, async (tab) => {
      let tentativas = 0;
      const maxChecagens = 40; // 40 * 800ms = 32s no total
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
          // script ainda não pronto
        }
        if (tentativas >= maxChecagens) {
          clearInterval(intervalo);
          chrome.tabs.remove(tab.id);
          if (tentativa < maxTentativas) {
            // Tenta novamente após delay exponencial
            setTimeout(() => {
              extrairDocumento(url, tentativa + 1).then(resolve);
            }, timeoutBase * tentativa);
          } else {
            resolve({ texto: '', url: url, erro: `Timeout após ${maxChecagens} tentativas` });
          }
        }
      }, 800);
    });
  });
}

// Extrai todos os documentos com fila e progresso
async function extrairTodosDocumentos(urls, sendResponse) {
  cancelarExtracao = false;
  console.log(`[Background] Iniciando extração de ${urls.length} documentos`);
  const resultados = [];

  for (let i = 0; i < urls.length; i++) {
    if (cancelarExtracao) {
      console.log('[Background] Extração cancelada pelo usuário');
      sendResponse({ documentos: resultados, cancelado: true });
      return;
    }

    const link = urls[i];
    console.log(`[Background] (${i+1}/${urls.length}) ${link.titulo}`);

    // Notifica progresso (pode ser usado no sidepanel)
    chrome.runtime.sendMessage({
      action: 'progressoExtracao',
      current: i + 1,
      total: urls.length,
      titulo: link.titulo
    }).catch(() => {});

    const inicio = Date.now();
    const resultado = await extrairDocumento(link.url);
    const duracao = Date.now() - inicio;

    resultados.push({
      titulo: link.titulo,
      tipo: link.tipo,
      texto: resultado.texto || '',
      url: link.url,
      erro: resultado.erro || null,
      duracaoMs: duracao
    });

    // Delay progressivo: 1s + 0.5s por documento (evita bloqueio)
    const delay = 1000 + (i * 100);
    if (i < urls.length - 1 && !cancelarExtracao) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('[Background] Extração concluída');
  sendResponse({ documentos: resultados, cancelado: false });
}

// Listener principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Mensagem:', request.action);

  if (request.action === 'extrairProcesso') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url || tab.url.startsWith('chrome://')) {
        sendResponse({ error: 'Aba inválida' });
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
            sendResponse({ error: 'Erro na mensagem: ' + err.message });
          }
        }, 800);
      } catch (error) {
        sendResponse({ error: 'Erro ao injetar: ' + error.message });
      }
    });
    return true;
  }

  if (request.action === 'extrairTodosDocumentos') {
    const urls = request.urls;
    if (!urls?.length) {
      sendResponse({ error: 'Nenhum documento' });
      return true;
    }
    extrairTodosDocumentos(urls, sendResponse);
    return true;
  }

  if (request.action === 'cancelarExtracao') {
    cancelarExtracao = true;
    sendResponse({ ok: true });
    return true;
  }

  sendResponse({ error: 'Ação desconhecida' });
  return true;
});