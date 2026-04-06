// Lista de tribunais com seus seletores
const TRIBUNALS = {
  'pje.tst.jus.br': { name: 'TST', selector: '.movimentacao, .movement, .andamento' },
  'pje.trt1.jus.br': { name: 'TRT 1ª Região (RJ)', selector: '.movimentacao, .movement' },
  'pje.trt2.jus.br': { name: 'TRT 2ª Região (SP)', selector: '.movimentacao, .andamento' },
  'pje.trt3.jus.br': { name: 'TRT 3ª Região (MG)', selector: '.movimentacao' },
  'pje.trt4.jus.br': { name: 'TRT 4ª Região (RS)', selector: '.movimentacao' },
  'pje.trt5.jus.br': { name: 'TRT 5ª Região (BA)', selector: '.movimentacao' },
  'pje.trt6.jus.br': { name: 'TRT 6ª Região (PE)', selector: '.movimentacao' },
  'pje.trt7.jus.br': { name: 'TRT 7ª Região (CE)', selector: '.movimentacao' },
  'pje.trt8.jus.br': { name: 'TRT 8ª Região (PA/AP)', selector: '.movimentacao' },
  'pje.trt9.jus.br': { name: 'TRT 9ª Região (PR)', selector: '.movimentacao' },
  'pje.trt10.jus.br': { name: 'TRT 10ª Região (DF/TO)', selector: '.movimentacao' },
  'pje.trt11.jus.br': { name: 'TRT 11ª Região (AM/RR)', selector: '.movimentacao' },
  'pje.trt12.jus.br': { name: 'TRT 12ª Região (SC)', selector: '.movimentacao' },
  'pje.trt13.jus.br': { name: 'TRT 13ª Região (PB)', selector: '.movimentacao' },
  'pje.trt14.jus.br': { name: 'TRT 14ª Região (RO/AC)', selector: '.movimentacao' },
  'pje.trt15.jus.br': { name: 'TRT 15ª Região (SP)', selector: '.movimentacao' },
  'pje.trt16.jus.br': { name: 'TRT 16ª Região (MA)', selector: '.movimentacao' },
  'pje.trt17.jus.br': { name: 'TRT 17ª Região (ES)', selector: '.movimentacao' },
  'pje.trt18.jus.br': { name: 'TRT 18ª Região (GO)', selector: '.movimentacao' },
  'pje.trt19.jus.br': { name: 'TRT 19ª Região (AL)', selector: '.movimentacao' },
  'pje.trt20.jus.br': { name: 'TRT 20ª Região (SE)', selector: '.movimentacao' },
  'pje.trt21.jus.br': { name: 'TRT 21ª Região (RN)', selector: '.movimentacao' },
  'pje.trt22.jus.br': { name: 'TRT 22ª Região (PI)', selector: '.movimentacao' },
  'pje.trt23.jus.br': { name: 'TRT 23ª Região (MT)', selector: '.movimentacao' },
  'pje.trt24.jus.br': { name: 'TRT 24ª Região (MS)', selector: '.movimentacao' }
};

// Função para extrair andamento da página
function extrairAndamento() {
  const url = window.location.href;
  let tribunalInfo = null;
  
  // Identifica o tribunal
  for (const [domain, info] of Object.entries(TRIBUNALS)) {
    if (url.includes(domain)) {
      tribunalInfo = info;
      break;
    }
  }
  
  if (!tribunalInfo) {
    return { error: 'Tribunal não reconhecido' };
  }
  
  // Tenta vários seletores
  const selectores = tribunalInfo.selector.split(', ');
  let andamento = null;
  
  for (const seletor of selectores) {
    const elemento = document.querySelector(seletor);
    if (elemento && elemento.innerText.trim().length > 0) {
      andamento = elemento.innerText;
      break;
    }
  }
  
  if (!andamento) {
    return { error: 'Não foi possível extrair o andamento. Tente copiar manualmente.' };
  }
  
  // Extrai também o número do processo
  let numeroProcesso = '';
  const numeroElem = document.querySelector('.numero-processo, .processo-numero, [class*="numero"]');
  if (numeroElem) {
    numeroProcesso = numeroElem.innerText;
  }
  
  return {
    tribunal: tribunalInfo.name,
    andamento: andamento,
    numeroProcesso: numeroProcesso,
    url: url
  };
}

// Listener para mensagens da popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairAndamento') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extrairAndamento
      }, (results) => {
        sendResponse(results[0].result);
      });
    });
    return true; // Indica resposta assíncrona
  }
});