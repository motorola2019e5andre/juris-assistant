// Lista de tribunais com seus seletores
const TRIBUNALS = {
  'pje.tst.jus.br': { 
    name: 'TST', 
    loginSelector: '#username, #email, .login-input',
    processSelector: '.movimentacao, .movement, .andamento',
    url: 'https://pje.tst.jus.br'
  },
  'pje.trt1.jus.br': { 
    name: 'TRT 1ª Região (RJ)', 
    loginSelector: '#username, #email',
    processSelector: '.movimentacao',
    url: 'https://pje.trt1.jus.br'
  },
  'pje.trt2.jus.br': { 
    name: 'TRT 2ª Região (SP)', 
    loginSelector: '#username, #email',
    processSelector: '.movimentacao',
    url: 'https://pje.trt2.jus.br'
  },
  'pje.trt3.jus.br': { 
    name: 'TRT 3ª Região (MG)', 
    loginSelector: '#username, #email',
    processSelector: '.movimentacao',
    url: 'https://pje.trt3.jus.br'
  },
  'pje.trt4.jus.br': { 
    name: 'TRT 4ª Região (RS)', 
    loginSelector: '#username, #email',
    processSelector: '.movimentacao',
    url: 'https://pje.trt4.jus.br'
  },
  'pje.trt15.jus.br': { 
    name: 'TRT 15ª Região (SP)', 
    loginSelector: '#username, #email',
    processSelector: '.movimentacao',
    url: 'https://pje.trt15.jus.br'
  },
  'pje.trt18.jus.br': { 
    name: 'TRT 18ª Região (GO)', 
    loginSelector: '#username, #email',
    processSelector: '.movimentacao',
    url: 'https://pje.trt18.jus.br'
  }
};

// Verificar se está logado no tribunal
function isLoggedIn() {
  const url = window.location.href;
  let tribunal = null;
  
  for (const [domain, info] of Object.entries(TRIBUNALS)) {
    if (url.includes(domain)) {
      tribunal = info;
      break;
    }
  }
  
  if (!tribunal) return { loggedIn: false, tribunal: null };
  
  // Verifica se existe elemento de usuário logado
  const userElement = document.querySelector('.usuario-logado, .user-info, [class*="usuario"]');
  const loginForm = document.querySelector(tribunal.loginSelector);
  
  // Se tem elemento de usuário e não tem formulário de login, provavelmente está logado
  const loggedIn = userElement !== null && loginForm === null;
  
  return { loggedIn, tribunal: tribunal.name, url: url };
}

// Extrair número do processo da página
function extractProcessNumber() {
  // Tenta encontrar o número do processo na página
  const selectors = [
    '.numero-processo',
    '.processo-numero',
    '[class*="numero"]',
    '.nmr-processo',
    '#numeroProcesso'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText) {
      const text = element.innerText;
      // Extrai apenas números e pontos (formato do processo)
      const match = text.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
      if (match) return match[0];
      // Tenta outro formato
      const match2 = text.match(/\d{20,25}/);
      if (match2) return match2[0];
    }
  }
  return null;
}

// Extrair andamento do processo
function extractProcessMovement() {
  const selectors = [
    '.movimentacao',
    '.movement',
    '.andamento',
    '.timeline',
    '.historico'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim().length > 0) {
      return element.innerText;
    }
  }
  return null;
}

// Listener para mensagens da popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkLoginStatus') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            // Função para verificar login
            const url = window.location.href;
            const tribunais = {
              'pje.tst.jus.br': 'TST',
              'pje.trt1.jus.br': 'TRT 1ª Região (RJ)',
              'pje.trt2.jus.br': 'TRT 2ª Região (SP)',
              'pje.trt3.jus.br': 'TRT 3ª Região (MG)',
              'pje.trt4.jus.br': 'TRT 4ª Região (RS)',
              'pje.trt15.jus.br': 'TRT 15ª Região (SP)'
            };
            
            let tribunal = null;
            for (const [domain, name] of Object.entries(tribunais)) {
              if (url.includes(domain)) {
                tribunal = name;
                break;
              }
            }
            
            // Verifica se está logado
            const userElement = document.querySelector('.usuario-logado, .user-info, [class*="usuario"]');
            const loggedIn = userElement !== null;
            
            // Extrai número do processo
            let processoNumero = null;
            const numSelectors = ['.numero-processo', '.processo-numero', '[class*="numero"]'];
            for (const sel of numSelectors) {
              const el = document.querySelector(sel);
              if (el && el.innerText) {
                const match = el.innerText.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
                if (match) processoNumero = match[0];
                break;
              }
            }
            
            return { loggedIn, tribunal, url, processoNumero };
          }
        });
        
        sendResponse(results[0].result);
      } catch (error) {
        sendResponse({ loggedIn: false, tribunal: null, error: error.message });
      }
    });
    return true;
  }
  
  if (request.action === 'extractProcess') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            // Extrai andamento
            const movementSelectors = ['.movimentacao', '.movement', '.andamento', '.timeline', '.historico'];
            let andamento = null;
            for (const sel of movementSelectors) {
              const el = document.querySelector(sel);
              if (el && el.innerText.trim().length > 0) {
                andamento = el.innerText;
                break;
              }
            }
            
            // Extrai número do processo
            let processoNumero = null;
            const numSelectors = ['.numero-processo', '.processo-numero', '[class*="numero"]'];
            for (const sel of numSelectors) {
              const el = document.querySelector(sel);
              if (el && el.innerText) {
                const match = el.innerText.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
                if (match) processoNumero = match[0];
                break;
              }
            }
            
            return { andamento, processoNumero, url: window.location.href };
          }
        });
        
        sendResponse(results[0].result);
      } catch (error) {
        sendResponse({ error: error.message });
      }
    });
    return true;
  }
});