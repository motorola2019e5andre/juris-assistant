// ============================================
// CONTENT.JS - EXTRAÇÃO TOTAL (TEXTO COMPLETO)
// ============================================

// 🔍 Documento correto (iframe)
function getDoc() {
  const iframe = document.querySelector('iframe');
  if (iframe && iframe.contentDocument) {
    return iframe.contentDocument;
  }
  return document;
}

// ⏳ Espera carregar conteúdo
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔢 Número do processo
function extrairNumero(doc) {
  const text = doc.body.innerText;
  const match = text.match(/\d{7}[-.]?\d{2}[-.]?\d{4}[-.]?\d[-.]?\d{2}[-.]?\d{4}/);
  return match ? match[0].replace(/[.-]/g, '') : null;
}

// 🏛️ Tribunal
function extrairTribunal() {
  const url = window.location.href.toLowerCase();
  
  if (url.includes('tst')) return 'TST';
  if (url.includes('trt1')) return 'TRT 1ª Região (RJ)';
  if (url.includes('trt2')) return 'TRT 2ª Região (SP)';
  if (url.includes('trt3')) return 'TRT 3ª Região (MG)';
  if (url.includes('trt4')) return 'TRT 4ª Região (RS)';
  if (url.includes('trt5')) return 'TRT 5ª Região (BA)';
  if (url.includes('trt6')) return 'TRT 6ª Região (PE)';
  if (url.includes('trt7')) return 'TRT 7ª Região (CE)';
  if (url.includes('trt8')) return 'TRT 8ª Região (PA/AP)';
  if (url.includes('trt9')) return 'TRT 9ª Região (PR)';
  if (url.includes('trt10')) return 'TRT 10ª Região (DF/TO)';
  if (url.includes('trt11')) return 'TRT 11ª Região (AM/RR)';
  if (url.includes('trt12')) return 'TRT 12ª Região (SC)';
  if (url.includes('trt13')) return 'TRT 13ª Região (PB)';
  if (url.includes('trt14')) return 'TRT 14ª Região (RO/AC)';
  if (url.includes('trt15')) return 'TRT 15ª Região (SP)';
  if (url.includes('trt16')) return 'TRT 16ª Região (MA)';
  if (url.includes('trt17')) return 'TRT 17ª Região (ES)';
  if (url.includes('trt18')) return 'TRT 18ª Região (GO)';
  if (url.includes('trt19')) return 'TRT 19ª Região (AL)';
  if (url.includes('trt20')) return 'TRT 20ª Região (SE)';
  if (url.includes('trt21')) return 'TRT 21ª Região (RN)';
  if (url.includes('trt22')) return 'TRT 22ª Região (PI)';
  if (url.includes('trt23')) return 'TRT 23ª Região (MT)';
  if (url.includes('trt24')) return 'TRT 24ª Região (MS)';
  if (url.includes('trf1')) return 'TRF 1ª Região';
  if (url.includes('trf2')) return 'TRF 2ª Região';
  if (url.includes('trf3')) return 'TRF 3ª Região';
  if (url.includes('trf4')) return 'TRF 4ª Região';
  if (url.includes('trf5')) return 'TRF 5ª Região';
  if (url.includes('eproc')) return 'EPROC';
  
  return 'Não identificado';
}

// 📝 EXTRAI TEXTO COMPLETO - A FUNÇÃO MAIS IMPORTANTE
function extrairTextoCompleto(doc) {
  // Tenta pegar o conteúdo principal
  const seletoresPrincipais = [
    'body',
    'div.conteudo',
    'div#conteudo',
    'main',
    'article',
    'div[role="main"]',
    'div.visualizacao-processo',
    'div.card-body',
    'div.panel-body'
  ];
  
  let conteudo = null;
  for (const seletor of seletoresPrincipais) {
    const elemento = doc.querySelector(seletor);
    if (elemento && elemento.innerText.length > 500) {
      conteudo = elemento;
      break;
    }
  }
  
  // Se achou conteúdo específico, extrai de forma organizada
  if (conteudo) {
    // Remove elementos indesejados
    const indesejados = conteudo.querySelectorAll('script, style, nav, footer, .menu, .rodape');
    indesejados.forEach(el => el.remove());
    
    return conteudo.innerText.trim();
  }
  
  // Fallback: texto completo do documento
  return doc.body.innerText.trim();
}

// 📜 Extrai movimentações
function extrairMovimentacoes(doc) {
  const movimentos = [];
  
  // Procura tabelas de movimentação
  const tabelas = doc.querySelectorAll('table');
  for (const table of tabelas) {
    if (/moviment|andamento|tramite/i.test(table.innerText)) {
      const linhas = table.querySelectorAll('tr');
      for (const linha of linhas) {
        const texto = linha.innerText.trim();
        if (texto.length > 10 && texto.length < 1000) {
          movimentos.push(texto);
        }
      }
    }
  }
  
  // Remove duplicatas
  return [...new Set(movimentos)];
}

// 👥 Partes
function extrairPartes(doc) {
  const texto = doc.body.innerText;
  const partes = { reclamante: '', reclamado: '' };
  
  const reclamanteMatch = texto.match(/Reclamante[:\s]+([^\n]{10,200})/i);
  if (reclamanteMatch) partes.reclamante = reclamanteMatch[1].trim();
  
  const reclamadoMatch = texto.match(/Reclamado[:\s]+([^\n]{10,200})/i);
  if (reclamadoMatch) partes.reclamado = reclamadoMatch[1].trim();
  
  return partes;
}

// 📦 FUNÇÃO PRINCIPAL - EXTRAI TUDO
async function extrairDados() {
  console.log('🔄 Extraindo processo COMPLETO...');
  
  await wait(2000);
  
  const doc = getDoc();
  
  // Extrai TUDO
  const textoCompleto = extrairTextoCompleto(doc);
  const numero = extrairNumero(doc);
  const tribunal = extrairTribunal();
  const partes = extrairPartes(doc);
  const movimentacoes = extrairMovimentacoes(doc);
  
  console.log(`✅ Texto extraído: ${textoCompleto.length} caracteres`);
  console.log(`📌 Movimentações: ${movimentacoes.length}`);
  
  return {
    numero: numero,
    tribunal: tribunal,
    partes: partes,
    movimentacoes: movimentacoes,
    textoCompleto: textoCompleto,
    qtdeCaracteres: textoCompleto.length,
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };
}

// 📡 Listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'extrairProcesso') {
    extrairDados().then(sendResponse).catch(err => {
      console.error('Erro:', err);
      sendResponse({ error: err.message });
    });
    return true;
  }
});

console.log('🚀 Content Script Juris Assistant v4.0 - Extração TOTAL ativada!');