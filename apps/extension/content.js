// ============================================
// CONTENT.JS - Extrai dados do processo PJe (VERSÃO MELHORADA)
// ============================================

// 🔍 Obtém o documento correto (suporte a iframe)
function getDocumentoCorreto() {
  const iframe = document.querySelector('iframe');
  if (iframe && iframe.contentDocument) {
    return iframe.contentDocument;
  }
  return document;
}

// ⏳ Espera elemento carregar (para páginas dinâmicas)
function esperarElemento(selector, timeout = 10000) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      }
    }, 500);

    setTimeout(() => clearInterval(interval), timeout);
  });
}

// 🔢 Extrai número do processo
function extrairNumeroProcesso() {
  const doc = getDocumentoCorreto();
  const text = doc.body.innerText;

  const regex = /\d{7}-?\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);

  return match ? match[0] : null;
}

// 🏛️ Extrai tribunal
function extrairTribunal() {
  const url = window.location.href;

  if (url.includes('pje.tst.jus.br')) return 'TST';
  if (url.includes('pje.trt1')) return 'TRT 1ª Região (RJ)';
  if (url.includes('pje.trt2')) return 'TRT 2ª Região (SP)';
  if (url.includes('pje.trt3')) return 'TRT 3ª Região (MG)';
  if (url.includes('pje.trt4')) return 'TRT 4ª Região (RS)';
  if (url.includes('pje.trt15')) return 'TRT 15ª Região (SP)';
  if (url.includes('pje.trt18')) return 'TRT 18ª Região (GO)';

  return 'Tribunal não identificado';
}

// 📜 Extrai andamento/movimentações (mais robusto)
function extrairAndamento() {
  const doc = getDocumentoCorreto();

  // tenta encontrar tabelas (comum no PJe)
  const tabelas = doc.querySelectorAll('table');

  for (const tabela of tabelas) {
    const texto = tabela.innerText;

    if (
      texto.includes('Movimentação') ||
      texto.includes('Andamento') ||
      texto.length > 200
    ) {
      return texto;
    }
  }

  // fallback
  return doc.body.innerText.substring(0, 3000);
}

// 👥 Extrai partes (mais flexível)
function extrairPartes() {
  const doc = getDocumentoCorreto();
  const text = doc.body.innerText;

  return {
    reclamante:
      (text.match(/(RECLAMANTE|AUTOR|POLO ATIVO):?\s*([^\n]+)/i) || [])[2] || '',

    reclamado:
      (text.match(/(RECLAMADO|RÉU|REU|POLO PASSIVO):?\s*([^\n]+)/i) || [])[2] || ''
  };
}

// 📦 Função principal
async function extrairDadosCompletos() {
  console.log('🔄 Extraindo dados do processo...');

  // espera a página carregar melhor
  await esperarElemento('body');

  const dados = {
    numero: extrairNumeroProcesso(),
    tribunal: extrairTribunal(),
    partes: extrairPartes(),
    andamento: extrairAndamento(),
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };

  console.log('✅ Dados extraídos:', dados);

  return dados;
}

// 📡 Listener (corrigido para async)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    extrairDadosCompletos().then(sendResponse);
    return true; // mantém canal aberto
  }
});

console.log('🚀 Juris Assistant - Content script carregado (versão melhorada)');