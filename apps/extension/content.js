// ============================================
// CONTENT.JS - Leitura de íntegras de peças
// Versão universal para TST e todos os TRTs
// ============================================

// Extrai o número do processo
function extrairNumeroProcesso() {
  const text = document.body.innerText;
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

// Extrai tribunal baseado na URL
function extrairTribunal() {
  const url = window.location.href;
  if (url.includes('pje.tst.jus.br')) return 'TST';
  if (url.includes('pje.trt1')) return 'TRT 1ª Região (RJ)';
  if (url.includes('pje.trt2')) return 'TRT 2ª Região (SP)';
  if (url.includes('pje.trt3')) return 'TRT 3ª Região (MG)';
  if (url.includes('pje.trt4')) return 'TRT 4ª Região (RS)';
  if (url.includes('pje.trt5')) return 'TRT 5ª Região (BA)';
  if (url.includes('pje.trt6')) return 'TRT 6ª Região (PE)';
  if (url.includes('pje.trt7')) return 'TRT 7ª Região (CE)';
  if (url.includes('pje.trt8')) return 'TRT 8ª Região (PA/AP)';
  if (url.includes('pje.trt9')) return 'TRT 9ª Região (PR)';
  if (url.includes('pje.trt10')) return 'TRT 10ª Região (DF/TO)';
  if (url.includes('pje.trt11')) return 'TRT 11ª Região (AM/RR)';
  if (url.includes('pje.trt12')) return 'TRT 12ª Região (SC)';
  if (url.includes('pje.trt13')) return 'TRT 13ª Região (PB)';
  if (url.includes('pje.trt14')) return 'TRT 14ª Região (RO/AC)';
  if (url.includes('pje.trt15')) return 'TRT 15ª Região (SP)';
  if (url.includes('pje.trt16')) return 'TRT 16ª Região (MA)';
  if (url.includes('pje.trt17')) return 'TRT 17ª Região (ES)';
  if (url.includes('pje.trt18')) return 'TRT 18ª Região (GO)';
  if (url.includes('pje.trt19')) return 'TRT 19ª Região (AL)';
  if (url.includes('pje.trt20')) return 'TRT 20ª Região (SE)';
  if (url.includes('pje.trt21')) return 'TRT 21ª Região (RN)';
  if (url.includes('pje.trt22')) return 'TRT 22ª Região (PI)';
  if (url.includes('pje.trt23')) return 'TRT 23ª Região (MT)';
  if (url.includes('pje.trt24')) return 'TRT 24ª Região (MS)';
  return 'Tribunal não identificado';
}

// Extrai informações das partes
function extrairPartes() {
  const partes = { reclamante: '', reclamado: '', autores: [], reus: [] };
  const text = document.body.innerText;
  
  const reclamanteMatch = text.match(/RECLAMANTE:?\s*([^\n]+)/i);
  const reclamadoMatch = text.match(/RECLAMADO:?\s*([^\n]+)/i);
  const autorMatch = text.match(/AUTOR:?\s*([^\n]+)/i);
  const reuMatch = text.match(/RÉU:?\s*([^\n]+)/i);
  
  if (reclamanteMatch) partes.reclamante = reclamanteMatch[1].trim();
  if (reclamadoMatch) partes.reclamado = reclamadoMatch[1].trim();
  if (autorMatch) partes.autores.push(autorMatch[1].trim());
  if (reuMatch) partes.reus.push(reuMatch[1].trim());
  
  return partes;
}

// EXTRAI O TEXTO COMPLETO DA PEÇA ATUAL (VISÍVEL NA TELA)
function extrairTextoVisivel() {
  // Tenta encontrar o conteúdo principal da peça
  const seletoresConteudo = [
    '.documento',
    '.document-content',
    '.conteudo-documento',
    '.texto-documento',
    'div[class*="documento"]',
    'div[class*="conteudo"]',
    'main',
    '.content',
    '#conteudo'
  ];
  
  for (const sel of seletoresConteudo) {
    const elemento = document.querySelector(sel);
    if (elemento && elemento.innerText.length > 500) {
      return elemento.innerText;
    }
  }
  
  // Se não encontrou, tenta pegar o iframe do documento
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc && iframeDoc.body && iframeDoc.body.innerText.length > 500) {
        return iframeDoc.body.innerText;
      }
    } catch(e) { /* erro de cross-origin, ignorar */ }
  }
  
  // Fallback: pega todo o texto visível
  return document.body.innerText.substring(0, 15000);
}

// EXTRAI TODAS AS PEÇAS DO PROCESSO (navegando pelos documentos)
function extrairTodasPecas() {
  const pecas = [];
  
  // Procura por links de documentos
  const linksDocumentos = document.querySelectorAll('a[href*="download"], a[href*="documento"], a[href*="pdf"]');
  
  for (const link of linksDocumentos) {
    const textoLink = link.innerText || link.textContent || '';
    if (textoLink.length > 10 && textoLink.length < 200) {
      pecas.push({
        tipo: textoLink.substring(0, 100),
        url: link.href,
        texto: `[Documento disponível em: ${link.href}]`
      });
    }
  }
  
  return pecas;
}

// Extrai o valor da causa
function extrairValorCausa() {
  const text = document.body.innerText;
  const valorMatch = text.match(/VALOR DA CAUSA:?\s*R?\$?\s*([\d\.,]+)/i);
  return valorMatch ? valorMatch[1] : null;
}

// Extrai a classe do processo
function extrairClasse() {
  const text = document.body.innerText;
  const classeMatch = text.match(/CLASSE:?\s*([^\n]+)/i);
  return classeMatch ? classeMatch[1].trim() : null;
}

// Extrai movimentações resumidas (títulos)
function extrairMovimentacoes() {
  const movimentacoes = [];
  const selectores = [
    '.movimentacao', '.movement', '.andamento',
    '.timeline', '.historico', '.movimentacoes'
  ];
  
  for (const sel of selectores) {
    const elementos = document.querySelectorAll(sel);
    for (const el of elementos) {
      const texto = el.innerText || el.textContent || '';
      if (texto.length > 30 && texto.length < 1000) {
        movimentacoes.push(texto);
      }
    }
  }
  
  return movimentacoes;
}

// Função principal - extrai TUDO
function extrairDadosCompletos() {
  console.log('🔄 Extraindo dados completos do processo...');
  
  const dados = {
    numero: extrairNumeroProcesso(),
    tribunal: extrairTribunal(),
    partes: extrairPartes(),
    classe: extrairClasse(),
    valorCausa: extrairValorCausa(),
    movimentacoes: extrairMovimentacoes(),
    pecaAtual: extrairTextoVisivel(),  // ← ÍNTEGRA DA PEÇA VISÍVEL
    outrasPecas: extrairTodasPecas(),  // ← LINKS PARA OUTRAS PEÇAS
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };
  
  console.log(`✅ Extraído: ${dados.pecaAtual.length} caracteres da peça atual`);
  return dados;
}

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    const dados = extrairDadosCompletos();
    sendResponse(dados);
    return true;
  }
});

console.log('🚀 Juris Assistant - Content script de leitura de íntegras carregado');