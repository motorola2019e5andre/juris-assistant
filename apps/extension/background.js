// Abrir side panel quando clicar no ícone
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Função para extrair dados da página
function extrairDadosDaPagina() {
  const url = window.location.href;
  
  // Verifica se é uma página de tribunal
  const isTribunal = url.includes('pje') || url.includes('trt') || url.includes('tst');
  
  // Extrai o número do processo
  let processoNumero = null;
  const text = document.body.innerText;
  const match = text.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  if (match) processoNumero = match[0];
  
  // Extrai o andamento
  let andamento = '';
  const selectores = ['.movimentacao', '.movement', '.andamento', '.timeline', '.historico', 'table tbody tr'];
  for (const sel of selectores) {
    const elem = document.querySelector(sel);
    if (elem && elem.innerText.length > 50) {
      andamento = elem.innerText;
      break;
    }
  }
  
  if (!andamento) {
    andamento = text.substring(0, 3000);
  }
  
  return {
    success: true,
    url: url,
    isTribunal: isTribunal,
    processoNumero: processoNumero,
    andamento: andamento,
    titulo: document.title
  };
}

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'readCurrentPage') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      // Verifica se é página chrome://
      if (tab.url.startsWith('chrome://')) {
        sendResponse({ success: false, error: 'Não é possível ler páginas do Chrome. Acesse um tribunal PJe.' });
        return;
      }
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: extrairDadosDaPagina
        });
        sendResponse(results[0].result);
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }
});