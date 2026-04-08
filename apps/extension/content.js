// ============================================
// CONTENT.JS - Extração Universal para qualquer TRT
// ============================================

// Extrai o número do processo (formato padrão PJe)
function extrairNumeroProcesso() {
  const text = document.body.innerText;
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

// Extrai tribunal baseado na URL
function extrairTribunal() {
  const url = window.location.href;
  const tribunais = {
    'pje.tst.jus.br': 'TST',
    'pje.trt1.jus.br': 'TRT 1ª Região (RJ)',
    'pje.trt2.jus.br': 'TRT 2ª Região (SP)',
    'pje.trt3.jus.br': 'TRT 3ª Região (MG)',
    'pje.trt4.jus.br': 'TRT 4ª Região (RS)',
    'pje.trt5.jus.br': 'TRT 5ª Região (BA)',
    'pje.trt6.jus.br': 'TRT 6ª Região (PE)',
    'pje.trt7.jus.br': 'TRT 7ª Região (CE)',
    'pje.trt8.jus.br': 'TRT 8ª Região (PA/AP)',
    'pje.trt9.jus.br': 'TRT 9ª Região (PR)',
    'pje.trt10.jus.br': 'TRT 10ª Região (DF/TO)',
    'pje.trt11.jus.br': 'TRT 11ª Região (AM/RR)',
    'pje.trt12.jus.br': 'TRT 12ª Região (SC)',
    'pje.trt13.jus.br': 'TRT 13ª Região (PB)',
    'pje.trt14.jus.br': 'TRT 14ª Região (RO/AC)',
    'pje.trt15.jus.br': 'TRT 15ª Região (SP)',
    'pje.trt16.jus.br': 'TRT 16ª Região (MA)',
    'pje.trt17.jus.br': 'TRT 17ª Região (ES)',
    'pje.trt18.jus.br': 'TRT 18ª Região (GO)',
    'pje.trt19.jus.br': 'TRT 19ª Região (AL)',
    'pje.trt20.jus.br': 'TRT 20ª Região (SE)',
    'pje.trt21.jus.br': 'TRT 21ª Região (RN)',
    'pje.trt22.jus.br': 'TRT 22ª Região (PI)',
    'pje.trt23.jus.br': 'TRT 23ª Região (MT)',
    'pje.trt24.jus.br': 'TRT 24ª Região (MS)'
  };
  
  for (const [domain, name] of Object.entries(tribunais)) {
    if (url.includes(domain)) return name;
  }
  return 'Tribunal não identificado';
}

// Extrai andamento processual (seletores universais)
function extrairAndamento() {
  const selectoresUniversais = [
    '.movimentacao', '.movement', '.andamento',
    '.timeline', '.historico', '.movimentacoes',
    'div[id*="movimentacao"]', 'div[class*="movimentacao"]',
    'table.tabela-movimentacoes', 'table.movimentacoes'
  ];
  
  for (const sel of selectoresUniversais) {
    const elementos = document.querySelectorAll(sel);
    for (const el of elementos) {
      const texto = el.innerText || el.textContent || '';
      if (texto.length > 50) {
        return texto;
      }
    }
  }
  
  // Fallback: pega todo o texto visível da área principal
  const mainContent = document.querySelector('main, .conteudo, .content, #conteudo');
  if (mainContent) {
    return mainContent.innerText.substring(0, 5000);
  }
  
  return document.body.innerText.substring(0, 5000);
}

// Extrai partes do processo (reclamante/reclamado)
function extrairPartes() {
  const partes = { reclamante: '', reclamado: '', autores: [], reus: [] };
  const text = document.body.innerText;
  
  // Padrões universais
  const reclamanteMatch = text.match(/RECLAMANTE:?\s*([^\n]+)/i);
  const reclamadoMatch = text.match(/RECLAMADO:?\s*([^\n]+)/i);
  const autorMatch = text.match(/AUTOR:?\s*([^\n]+)/i);
  const reuMatch = text.match(/RÉU:?\s*([^\n]+)/i);
  const parteMatch = text.match(/PARTE(S)?:?\s*([^\n]+)/i);
  
  if (reclamanteMatch) partes.reclamante = reclamanteMatch[1].trim();
  if (reclamadoMatch) partes.reclamado = reclamadoMatch[1].trim();
  if (autorMatch) partes.autores.push(autorMatch[1].trim());
  if (reuMatch) partes.reus.push(reuMatch[1].trim());
  
  return partes;
}

// Extrai documentos (Sentença, Decisão, Despacho, Petição)
function extrairDocumentos() {
  const documentos = [];
  const text = document.body.innerText;
  
  // Padrões universais para documentos
  const padroes = [
    { nome: 'SENTENÇA', regex: /SENTENÇA[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|$)/i },
    { nome: 'DECISÃO', regex: /DECISÃO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|$)/i },
    { nome: 'DESPACHO', regex: /DESPACHO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|$)/i },
    { nome: 'PETIÇÃO INICIAL', regex: /PETIÇÃO INICIAL[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|$)/i },
    { nome: 'CONTESTAÇÃO', regex: /CONTESTAÇÃO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|$)/i },
    { nome: 'RECURSO', regex: /RECURSO ORDINÁRIO|RECURSO DE REVISTA[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|$)/i }
  ];
  
  for (const padrao of padroes) {
    const match = text.match(padrao.regex);
    if (match && match[0].length > 200) {
      documentos.push({ tipo: padrao.nome, texto: match[0].substring(0, 8000) });
    }
  }
  
  // Se não encontrou documentos específicos, tenta pegar blocos grandes de texto
  if (documentos.length === 0) {
    const paragrafos = text.split(/\n\s*\n/);
    for (const para of paragrafos) {
      if (para.length > 300 && para.length < 5000) {
        documentos.push({ tipo: 'TEXTO', texto: para });
        break;
      }
    }
  }
  
  return documentos;
}

// Extrai o valor da causa
function extrairValorCausa() {
  const text = document.body.innerText;
  const valorMatch = text.match(/VALOR DA CAUSA:?\s*R?\$?\s*([\d\.,]+)/i);
  if (valorMatch) return valorMatch[1];
  return null;
}

// Função principal
function extrairDadosCompletos() {
  console.log('🔄 Extraindo dados do processo...');
  
  const dados = {
    numero: extrairNumeroProcesso(),
    andamento: extrairAndamento(),
    documentos: extrairDocumentos(),
    partes: extrairPartes(),
    valorCausa: extrairValorCausa(),
    tribunal: extrairTribunal(),
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };
  
  console.log(`✅ Extraído: ${dados.documentos.length} documentos, Tribunal: ${dados.tribunal}`);
  return dados;
}

// Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    const dados = extrairDadosCompletos();
    sendResponse(dados);
    return true;
  }
});

console.log('🚀 Juris Assistant - Content script universal carregado');